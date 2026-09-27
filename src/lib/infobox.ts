import { categoryLabel, formatDate } from "./constants";
// Module **pur** : `infobox.ts` est aussi importé par `InfoboxEditor.tsx`,
// qui est un composant client. La lecture du cache local vit dans
// `avatar-url.ts`, côté serveur.
import { isDiscordAvatarUrl } from "./discord-avatar-url";
import type { Article, ArticleInfobox, InfoboxField } from "./types";

/**
 * Boîte d'informations : normalisation côté serveur et génération automatique.
 *
 * Deux garanties tiennent ici :
 *   - **robustesse** : une infobox absente, partielle ou aberrante ne casse
 *     jamais la page — elle est tronquée ou ignorée ;
 *   - **sécurité** : les valeurs sont du texte brut rendu par React (donc
 *     échappé) et l'illustration est contrainte à un chemin interne : aucune
 *     URL externe, aucun `javascript:`, aucun `data:` ne peut être injecté.
 */

/** Nombre maximal de lignes, pour que l'encadré reste lisible. */
export const INFOBOX_MAX_FIELDS = 12;

const LIMITS = {
  caption: 80,
  label: 60,
  value: 200,
  alt: 160,
  imageCaption: 160,
  footer: 200,
} as const;

/**
 * Illustration interne : un chemin du site (`/dossier/image.webp`), sans `..`
 * ni protocole, et terminé par une extension d'**image matricielle**.
 *
 * La liste est explicite plutôt qu'un « deux à cinq caractères alphanumériques »
 * : cette forme-là acceptait `.svg`, qui est un format texte capable de porter
 * du script — un encadré aurait pu servir un document actif à l'origine du
 * site. Elle refusait à l'inverse rien d'utile. Les cinq formats réellement
 * produits par le wiki (drapeau en WebP, portraits en PNG, JPEG, GIF ou
 * WebP) sont tous acceptés.
 */
const IMAGE_PATH = /^\/[A-Za-z0-9._~\-/]+\.(png|jpe?g|gif|webp|avif)$/i;

/**
 * Seule origine externe autorisée : le CDN Discord, et seulement pour les
 * photos de profil (voir `src/lib/discord-avatar-url.ts`, qui porte la même
 * liste blanche). Toute autre URL reste refusée — un encadré ne doit jamais
 * charger une image chez un tiers arbitraire.
 */
function isAllowedImageSource(value: string): boolean {
  return (
    (IMAGE_PATH.test(value) && !value.includes("..")) || isDiscordAvatarUrl(value)
  );
}

/** Retire les caractères de contrôle (dont les NUL injectés via un JSON bricolé). */
function clean(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
/** Tronque proprement, sans couper au milieu d'un mot dans la plupart des cas. */
function clamp(value: string, max: number): string {
  const cleaned = clean(value);
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

export class InfoboxValidationError extends Error {}

/**
 * Valide et normalise une infobox reçue depuis un formulaire ou une API.
 * Renvoie `undefined` quand il n'y a rien à afficher (le site génère alors
 * l'infobox automatique de l'article).
 */
export function normalizeInfobox(raw: unknown): ArticleInfobox | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new InfoboxValidationError("Boîte d'informations invalide.");
  }

  const source = raw as Record<string, unknown>;
  const caption =
    typeof source.caption === "string" && clean(source.caption)
      ? clamp(source.caption, LIMITS.caption)
      : undefined;

  let imageUrl: string | undefined;
  if (typeof source.imageUrl === "string" && clean(source.imageUrl)) {
    const candidate = clean(source.imageUrl);
    if (!isAllowedImageSource(candidate)) {
      throw new InfoboxValidationError(
        "L'illustration doit être une image du site (PNG, JPEG, GIF ou WebP — ex. /flag.webp) ou une photo de profil Discord, pas une URL externe.",
      );
    }
    imageUrl = candidate;
  }

  const imageAlt =
    typeof source.imageAlt === "string" && clean(source.imageAlt)
      ? clamp(source.imageAlt, LIMITS.alt)
      : undefined;

  // Une image sans alternative est inaccessible : on refuse l'enregistrement.
  if (imageUrl && !imageAlt) {
    throw new InfoboxValidationError("L'illustration de l'infobox doit avoir un texte alternatif.");
  }

  const imageCaption =
    typeof source.imageCaption === "string" && clean(source.imageCaption)
      ? clamp(source.imageCaption, LIMITS.imageCaption)
      : undefined;

  const footer =
    typeof source.footer === "string" && clean(source.footer)
      ? clamp(source.footer, LIMITS.footer)
      : undefined;

  const fields: InfoboxField[] = [];
  if (Array.isArray(source.fields)) {
    for (const entry of source.fields.slice(0, INFOBOX_MAX_FIELDS)) {
      if (typeof entry !== "object" || entry === null) continue;
      const { label, value } = entry as Record<string, unknown>;
      if (typeof label !== "string" || typeof value !== "string") continue;
      const cleanLabel = clean(label);
      const cleanValue = clean(value);
      if (!cleanLabel || !cleanValue) continue;
      fields.push({
        label: clamp(cleanLabel, LIMITS.label),
        value: clamp(cleanValue, LIMITS.value),
      });
    }
  }

  if (!imageUrl && fields.length === 0 && !footer && !caption) return undefined;

  return { caption, imageUrl, imageAlt, imageCaption, fields, footer };
}

/** Nombre de champs déjà utilisés, pour guider l'éditeur d'administration. */
export function countInfoboxFields(raw: unknown): number {
  if (typeof raw !== "object" || raw === null) return 0;
  const fields = (raw as Record<string, unknown>).fields;
  return Array.isArray(fields) ? Math.min(fields.length, INFOBOX_MAX_FIELDS) : 0;
}

/**
 * Infobox affichée pour un article.
 *
 * Si la rédaction a saisi des données clés, elles présentent l'encadré, suivies
 * d'un bloc « Notice » compilé à partir des métadonnées réelles de l'article
 * (rédacteur, dates, nombre de révisions). Sinon, l'encadré automatique est
 * utilisé : toutes les pages du wiki ont donc une infobox, comme sur Wikipédia.
 */
export function buildArticleInfobox(
  article: Article,
  options: { revisionCount?: number } = {},
): ArticleInfobox {
  const notice: InfoboxField[] = [
    { label: "Rédacteur", value: article.author || "Rédaction du wiki" },
    { label: "Publication", value: formatDate(article.createdAt) },
    { label: "Dernière révision", value: formatDate(article.updatedAt) },
  ];
  if (options.revisionCount !== undefined) {
    notice.push({
      label: "Révisions",
      value:
        options.revisionCount <= 1
          ? "1 version"
          : `${options.revisionCount} versions`,
    });
  }

  const custom = article.infobox;
  if (!custom || (custom.fields.length === 0 && !custom.imageUrl)) {
    return {
      caption: custom?.caption,
      imageUrl: custom?.imageUrl,
      imageAlt: custom?.imageAlt,
      imageCaption: custom?.imageCaption,
      fields: [
        { label: "Catégorie", value: categoryLabel(article.category) },
        ...notice,
      ],
      footer: custom?.footer ?? "Données issues de la base du wiki.",
    };
  }

  return { ...custom, fields: [...custom.fields, ...notice] };
}
