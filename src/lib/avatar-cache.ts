/**
 * Index du cache local des photos de profil.
 *
 * `npm run cache:avatars` écrit un portrait par membre dans `public/avatars/`,
 * **dans le format réel de l'image** : le fichier peut être un `.png`, un
 * `.jpg`, un `.gif` animé ou un `.webp`. Le nom du fichier n'est donc plus
 * déductible du seul identifiant Discord, et le résolveur ne peut pas supposer
 * `<id>.png` — sous peine d'afficher une image cassée pour tous les portraits
 * qui ne sont pas en PNG.
 *
 * C'est le rôle de ce module : garder l'unique endroit qui sait quel fichier
 * correspond à quel identifiant, en lisant `public/avatars/index.json` (écrit
 * par le script de cache) et en tolérant son absence.
 *
 * La lecture est **synchrone et mémoïsée** : elle est appelée pendant le rendu
 * de pages entières, et le fichier ne change qu'à l'exécution du script.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

/** Formats d'image acceptés, dans l'ordre de préférence de recherche. */
export const AVATAR_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"] as const;
export type AvatarExtension = (typeof AVATAR_EXTENSIONS)[number];

const INDEX_FILE = path.join(process.cwd(), "public", "avatars", "index.json");

/** Entrée d'index telle qu'écrite par `scripts/cache-discord-avatars.mjs`. */
interface CacheEntry {
  file?: unknown;
}

/** Un nom de fichier n'est accepté que s'il s'agit bien d'une image attendue. */
function isSafeCacheFile(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9]{5,25}\.(png|jpe?g|gif|webp)$/i.test(value) &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !value.includes("..")
  );
}

let cache: Map<string, string> | null = null;

/**
 * Table identifiant → nom de fichier, lue une seule fois par processus.
 * Un index absent ou illisible ne doit pas faire tomber le rendu : on renvoie
 * alors une table vide, et l'encadré s'affiche simplement sans portrait.
 */
function loadIndex(): Map<string, string> {
  if (cache) return cache;
  const table = new Map<string, string>();
  try {
    const raw = JSON.parse(readFileSync(INDEX_FILE, "utf8")) as Record<string, CacheEntry>;
    for (const [userId, entry] of Object.entries(raw)) {
      if (/^[0-9]{5,25}$/.test(userId) && entry && isSafeCacheFile(entry.file)) {
        table.set(userId, entry.file);
      }
    }
  } catch {
    // Pas d'index (cache jamais lancé) : l'appelant se rabat sur la photo live.
  }
  cache = table;
  return table;
}

/**
 * Chemin public du portrait en cache pour un identifiant Discord, ou `null`
 * si ce portrait n'a jamais été mis en cache.
 */
export function cachedAvatarFile(discordUserId: string): string | null {
  const file = loadIndex().get(discordUserId);
  return file ? `/avatars/${file}` : null;
}

/**
 * Vide la table mémoïsée. Réservé aux tests et aux longues sessions de rendu
 * où le script de cache a pu être relancé entre deux requêtes.
 */
export function resetAvatarCacheIndex(): void {
  cache = null;
}
