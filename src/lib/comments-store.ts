import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { isEphemeralRuntime } from "./store/environment";
import { StorageUnavailableError } from "./store/errors";

/**
 * Commentaires des articles.
 *
 * ## Pourquoi un fichier à part
 *
 * Les commentaires ne sont **pas** du contenu encyclopédique : ils ne passent
 * ni par l'historique des révisions, ni par la validation de la rédaction, et
 * ils peuvent être supprimés sans laisser de trace dans l'encyclopédie. Les
 * ranger avec les articles aurait mélangé deux cycles de vie et fait peser le
 * poids des discussions sur chaque lecture d'article.
 *
 * ## Ce que le stockage garantit
 *
 *   - **écriture sérialisée** : deux personnes qui commentent au même instant ne
 *     peuvent pas s'écraser mutuellement (même file d'attente que le magasin
 *     d'articles) ;
 *   - **plafond par article** : au-delà de `MAX_PAR_ARTICLE`, les plus anciens
 *     sont retirés — sans quoi un fil très actif finirait par alourdir chaque
 *     affichage de la page ;
 *   - **taille bornée** : le texte est tronqué côté serveur, jamais côté client.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const COMMENTS_FILE = path.join(DATA_DIR, "comments.json");

/** Longueur maximale d'un commentaire, en caractères. */
export const MAX_COMMENT_LENGTH = 2000;

/** Nombre de commentaires conservés par article. */
export const MAX_PAR_ARTICLE = 300;

export interface Comment {
  id: string;
  /** Article commenté. */
  slug: string;
  /** Identifiant de session (pseudo Discord ou identifiant local). */
  author: string;
  /** Nom affiché au moment de l'écriture. */
  displayName: string;
  avatarUrl: string;
  role: string;
  content: string;
  createdAt: string;
}

async function readAll(): Promise<Comment[]> {
  try {
    const raw = await fs.readFile(COMMENTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Comment =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Comment).id === "string" &&
        typeof (item as Comment).slug === "string" &&
        typeof (item as Comment).content === "string",
    );
  } catch {
    return [];
  }
}

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation);
  writeQueue = run.catch(() => undefined);
  return run;
}

async function writeAll(comments: Comment[]): Promise<void> {
  if (isEphemeralRuntime()) {
    throw new StorageUnavailableError(
      "Les commentaires ne peuvent pas être enregistrés : cette plateforme ne conserve pas les fichiers.",
    );
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 2), "utf8");
}

/** Commentaires d'un article, du plus ancien au plus récent. */
export async function listComments(slug: string, limit = 200): Promise<Comment[]> {
  const all = await readAll();
  return all
    .filter((comment) => comment.slug === slug)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);
}

/** Nombre de commentaires par article, pour les compteurs des listes. */
export async function countCommentsBySlug(): Promise<Record<string, number>> {
  const all = await readAll();
  const counts: Record<string, number> = {};
  for (const comment of all) {
    counts[comment.slug] = (counts[comment.slug] ?? 0) + 1;
  }
  return counts;
}

export interface NewComment {
  slug: string;
  author: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  content: string;
}

/** Ajoute un commentaire et renvoie sa version enregistrée. */
export async function addComment(input: NewComment): Promise<Comment> {
  const content = input.content.trim().slice(0, MAX_COMMENT_LENGTH);
  if (!content) throw new Error("Commentaire vide.");

  return enqueue(async () => {
    const all = await readAll();
    const comment: Comment = {
      id: `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`,
      slug: input.slug,
      author: input.author,
      displayName: input.displayName || input.author,
      avatarUrl: input.avatarUrl,
      role: input.role,
      content,
      createdAt: new Date().toISOString(),
    };

    const others = all.filter((item) => item.slug !== input.slug);
    const thread = all
      .filter((item) => item.slug === input.slug)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-(MAX_PAR_ARTICLE - 1));

    await writeAll([...others, ...thread, comment]);
    return comment;
  });
}

/** Dernier commentaire d'un auteur, pour le quota anti-flood. */
export async function lastCommentBy(author: string): Promise<Comment | null> {
  const all = await readAll();
  const mine = all
    .filter((comment) => comment.author === author)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return mine[0] ?? null;
}

/** Supprime un commentaire ; renvoie `true` s'il existait. */
export async function deleteComment(id: string): Promise<boolean> {
  return enqueue(async () => {
    const all = await readAll();
    const next = all.filter((comment) => comment.id !== id);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  });
}

/** Commentaire isolé, pour vérifier qui a le droit de le supprimer. */
export async function getComment(id: string): Promise<Comment | null> {
  const all = await readAll();
  return all.find((comment) => comment.id === id) ?? null;
}

/** Fil d'activité des commentaires, tous articles confondus. */
export async function recentComments(limit = 20): Promise<Comment[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
