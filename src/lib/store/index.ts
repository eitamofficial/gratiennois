import type { StorageDriver } from "./types";
import { createJsonDriver } from "./json-driver";
import { createPgDriver } from "./pg-driver";

let driver: StorageDriver | null = null;

/** PostgreSQL si DATABASE_URL est défini, sinon fichiers JSON locaux. */
export function getDriver(): StorageDriver {
  if (!driver) {
    driver = process.env.DATABASE_URL ? createPgDriver() : createJsonDriver();
  }
  return driver;
}

export function getStorageName(): "json" | "postgres" {
  return getDriver().name;
}

/** Résultat du contrôle de disponibilité du magasin. */
export type SanteMagasin =
  | { ok: true }
  | { ok: false; message: string; at: string };

let santeCache: (SanteMagasin & { luLe: number }) | null = null;

/** Délai entre les deux tentatives. */
const DELAI_REPRISE_MS = 250;

/** Durée de mise en cache d'une bonne réponse. */
const CACHE_SANTE_MS = 5000;

/**
 * Un résultat négatif est retenu bien moins longtemps qu'un résultat positif.
 *
 * Retenir une panne pendant plusieurs secondes obligerait le site à rester en
 * page d'erreur alors que la base est revenue. La reprise doit être visible tout
 * de suite, et une nouvelle tentative coûte une requête.
 */
const CACHE_PANNE_MS = 800;

/**
 * Le magasin répond-il ?
 *
 * Le compteur d'articles est la requête la plus légère qui existe : elle touche
 * la base sans lire la moindre ligne. Elle sert ici de battement de cœur.
 *
 * Le résultat est mis en cache quelques secondes. Une page interroge déjà le
 * magasin plusieurs fois, et sans ce cache une seule visite ajouterait autant
 * d'aller-retours supplémentaires qu'il y a de composants presseés de l'appeler.
 * La contrepartie est qu'une base qui revient à la vie peut continuer à répondre
 * « indisponible » quelques secondes : c'est le délai d'un rechargement de page,
 * ce qui est négligeable face à l'intérêt d'économiser une requête par rendu.
 */
export async function verifierStore(): Promise<SanteMagasin> {
  const maintenant = Date.now();
  if (santeCache) {
    const duree = santeCache.ok ? CACHE_SANTE_MS : CACHE_PANNE_MS;
    if (maintenant - santeCache.luLe < duree) {
      const { luLe: _luLe, ...sante } = santeCache;
      return sante;
    }
  }

  // Une seule tentative ne suffit pas. Un résolveur de noms qui décroche, une
  // connexion que l'hébergeur ferme au moment où elle reprend, un hoquet réseau
  // de quelques millisecondes : aucun de ces accidents ne mérite de remplacer
  // le wiki par une page d'erreur. Sur une base managée, cela arrivait une fois
  // par audit de rendu, et chaque occurrence faisait tomber une dizaine de
  // pages à la fois. On retente donc avant de conclure.
  let sante: SanteMagasin;
  try {
    await getDriver().countArticles();
    sante = { ok: true };
  } catch (premier) {
    await new Promise((resoudre) => setTimeout(resoudre, DELAI_REPRISE_MS));
    try {
      await getDriver().countArticles();
      sante = { ok: true };
    } catch (second) {
      recordStorageError(second);
      sante = {
        ok: false,
        message: second instanceof Error ? second.message : String(second),
        at: new Date().toISOString(),
      };
    }
    if (sante.ok) {
      // La reprise a réussi : le premier incident n'a pas été consigné, pour
      // ne pas noyer le journal d'alarmes qui n'ont rien signalé.
      clearStorageError();
    }
  }

  santeCache = { ...sante, luLe: Date.now() };
  return sante;
}

/** Dernier incident rencontré sur le magasin (affiché dans l'admin et /api/health). */
let lastError: { message: string; at: string } | null = null;

export function recordStorageError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (lastError?.message === message) return;
  lastError = { message, at: new Date().toISOString() };
  console.error("[store]", message);
}

export function getStorageError(): { message: string; at: string } | null {
  return lastError;
}

export function clearStorageError(): void {
  lastError = null;
}
