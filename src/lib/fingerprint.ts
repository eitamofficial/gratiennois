import { createHash } from "node:crypto";
import { normalizeInfobox } from "./infobox";
import type { Article } from "./types";

/**
 * Empreinte d'un article — la brique qui permet de mettre le contenu officiel
 * à jour **sans jamais écraser le travail de la rédaction**.
 *
 * L'idée : au moment où le wiki publie le contenu officiel, il en note
 * l'empreinte. Plus tard, si l'empreinte de l'article en base est toujours
 * identique, c'est que personne ne l'a modifié : on peut le mettre à jour sans
 * risque. Dès qu'elle diffère, l'article est **protégé**.
 *
 * Ces deux comparaisons doivent être calculées **par le même code**. C'est
 * pourquoi la fonction vit ici, et non dupliquée dans le magasin et dans les
 * données de lancement : deux implémentations légèrement différentes produisent
 * des empreintes qui ne coïncident jamais, et tous les articles seraient
 * croyés modifiés à la main.
 */

/** Sérialisation canonique : clés triées, donc independante de l'ordre d'écriture. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

/** Normalise puis canonise un encadré, pour que l'ordre des clés n'importe pas. */
function fingerprintInfobox(article: Article, normalize: boolean): string {
  const infobox = normalize
    ? normalizeInfobox(article.infobox)
    : article.infobox;
  return stableStringify(infobox ?? null);
}

function hash(parts: string[]): string {
  return createHash("sha256").update(parts.join(String.fromCharCode(0))).digest("hex");
}

/** Empreinte d'un article **stocké** (comparaison de protection). */
export function articleFingerprint(article: Article): string {
  return hash([
    article.title,
    article.category,
    article.summary,
    article.content,
    [...article.tags].sort().join("|"),
    // L'encadré compte : le comparer permet à une correction d'infobox de se
    // propager, et protège l'article si la rédaction a retouché l'encadré.
    fingerprintInfobox(article, false),
  ]);
}

/** Empreinte d'un article du **contenu officiel** (cible de comparaison). */
export function seedFingerprint(article: Article): string {
  return hash([
    article.title,
    article.category,
    article.summary,
    article.content,
    [...article.tags].sort().join("|"),
    fingerprintInfobox(article, true),
  ]);
}
