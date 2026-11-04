import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isEphemeralRuntime } from "./store/environment";
import { StorageUnavailableError } from "./store/errors";

/**
 * Magasin de collections.
 *
 * Les articles et leurs révisions ont un format et un cycle de vie propres ;
 * tout le reste — listes de suivi, brouillons, redirections, votes, sondages,
 * journal de connexion — est une liste d'objets identifiés par un `id`.
 *
 * D'où ce magasin séparé, plutôt qu'une extension du `StorageDriver` : il ne
 * touche pas au schéma des articles, il vit dans `data/collections/<nom>.json`,
 * et il reste lisible à la main. Sur une base PostgreSQL, ces collections
 * resteraient des fichiers — c'est assumé : ce sont des données de bord, pas
 * le contenu encyclopédique, et le déploiement actuel est en JSON.
 */

const DIR = path.join(process.cwd(), "data", "collections");

/** Écritures sérialisées par collection : deux onglets ne s'écrasent pas. */
const queues = new Map<string, Promise<unknown>>();

function enqueue<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const previous = queues.get(name) ?? Promise.resolve();
  const run = previous.then(operation);
  queues.set(
    name,
    run.catch(() => undefined),
  );
  return run;
}

function fileOf(name: string): string {
  // Un nom de collection ne doit pas pouvoir sortir du dossier.
  if (!/^[a-z0-9-]{1,40}$/.test(name)) {
    throw new Error(`Nom de collection invalide : ${name}`);
  }
  return path.join(DIR, `${name}.json`);
}

async function readCollection<T>(name: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(fileOf(name), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeCollection<T>(name: string, items: T[]): Promise<void> {
  if (isEphemeralRuntime()) {
    throw new StorageUnavailableError(
      "Écriture refusée : cette plateforme ne conserve pas les fichiers entre deux invocations.",
    );
  }
  await fs.mkdir(DIR, { recursive: true });
  const target = fileOf(name);
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(items, null, 2), "utf8");
  // Renommage atomique : une coupure ne laisse jamais un JSON tronqué.
  await fs.rename(temporary, target);
}

export async function list<T>(name: string): Promise<T[]> {
  return readCollection<T>(name);
}

export async function find<T>(
  name: string,
  predicate: (item: T) => boolean,
): Promise<T | null> {
  const items = await readCollection<T>(name);
  return items.find(predicate) ?? null;
}

export async function add<T>(
  name: string,
  item: Omit<T, "id"> & { id?: string },
): Promise<T & { id: string }> {
  return enqueue(name, async () => {
    const items = await readCollection<T & { id: string }>(name);
    const created = { ...item, id: item.id ?? randomUUID() } as T & { id: string };
    items.push(created);
    await writeCollection(name, items);
    return created;
  });
}

export async function update<T extends { id: string }>(
  name: string,
  id: string,
  patch: Partial<T>,
): Promise<T | null> {
  return enqueue(name, async () => {
    const items = await readCollection<T>(name);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...patch, id } as T;
    await writeCollection(name, items);
    return items[index];
  });
}

export async function remove(name: string, id: string): Promise<boolean> {
  return enqueue(name, async () => {
    const items = await readCollection<{ id: string }>(name);
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) return false;
    await writeCollection(name, next);
    return true;
  });
}

/**
 * Remplace toute la collection. Réservé aux opérations qui recalculent
 * l'ensemble (purge d'une liste de suivi, import), jamais à une écriture
 * unitaire — `add`, `update` et `remove` couvrent ces cas.
 */
export async function replaceAll<T>(name: string, items: T[]): Promise<void> {
  return enqueue(name, async () => {
    await writeCollection(name, items);
  });
}

/** Écriture conditionnelle : ne modifie que si le prédicat est vrai. */
export async function upsert<T extends { id: string }>(
  name: string,
  item: T,
  matches: (existing: T) => boolean,
): Promise<T> {
  return enqueue(name, async () => {
    const items = await readCollection<T>(name);
    const index = items.findIndex(matches);
    if (index === -1) {
      items.push(item);
    } else {
      items[index] = { ...items[index], ...item, id: items[index].id };
    }
    await writeCollection(name, items);
    return index === -1 ? item : items[index];
  });
}

/** Noms de collections connues, pour la sauvegarde et les diagnostics. */
export const COLLECTIONS = {
  settings: "settings",
  watchlist: "watchlist",
  drafts: "drafts",
  redirects: "redirects",
  sources: "sources",
  votes: "votes",
  polls: "polls",
  ballots: "ballots",
  calendar: "calendar",
  sessions: "sessions",
  loginLog: "login-log",
  webhooks: "webhooks",
  presence: "presence",
  moderation: "moderation",
  bans: "bans",
  entities: "entities",
  commentsModeration: "comments-moderation",
  notifications: "notifications",
} as const;
