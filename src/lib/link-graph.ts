import type { Article } from "./types";
import { normalizeText } from "./search";

/**
 * Graphe de liens internes du wiki.
 * Chaque article peut référencer un autre avec `[[Titre]]` ou `[[Titre|texte]]`.
 * Ce module construit la table de résolution, trouve les articles qui pointent
 * vers une page donnée (rétroliens) et suggère des articles liés.
 */

export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Cible d'un lien interne : le slug à ouvrir et le titre à afficher. */
export interface WikiLink {
  slug: string;
  title: string;
}

/**
 * Table de résolution des liens internes : slug **et** titre normalisé pointent
 * vers le même article. Le titre est transporté avec le slug afin que
 * `[[la-hierarchie-delphinale]]` s'affiche « La hiérarchie delphinale » et non
 * le slug brut : un wiki lisible n'expose jamais ses identifiants techniques.
 */
export function buildLinkMap(articles: Array<Pick<Article, "slug" | "title">>) {
  const map = new Map<string, WikiLink>();
  for (const article of articles) {
    const target: WikiLink = { slug: article.slug, title: article.title };
    map.set(article.slug, target);
    map.set(normalizeKey(article.title), target);
  }
  return map;
}

/** Liens wiki présents dans un contenu, sous forme normalisée. */
export function extractReferences(content: string): string[] {
  const references = new Set<string>();

  for (const match of content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    references.add(normalizeKey(match[1].trim()));
  }
  for (const match of content.matchAll(/\]\(\/wiki\/([a-z0-9-]+)/g)) {
    references.add(normalizeKey(match[1]));
  }

  return [...references];
}

/** Rétroliens : quels articles citent cet article. */
export function computeBacklinks(articles: Article[], slug: string): Article[] {
  const normalizedSlug = normalizeKey(slug);
  return articles.filter((article) => {
    if (article.slug === slug) return false;
    return extractReferences(article.content).includes(normalizedSlug);
  });
}

/**
 * Suggestions de lecture liées : priorité aux articles de la même catégorie
 * partageant des tags, puis aux autres articles.tags.
 */
export function relatedArticles(articles: Article[], current: Article, limit = 4): Article[] {
  const currentTags = new Set(current.tags.map((tag) => normalizeText(tag)));

  return articles
    .filter((article) => article.slug !== current.slug)
    .map((article) => {
      const shared = article.tags.filter((tag) => currentTags.has(normalizeText(tag))).length;
      const sameCategory = article.category === current.category ? 1 : 0;
      const mentions = extractReferences(article.content).includes(normalizeKey(current.slug)) ? 2 : 0;
      return { article, score: shared * 2 + sameCategory + mentions };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.article.updatedAt.localeCompare(a.article.updatedAt))
    .slice(0, limit)
    .map((item) => item.article);
}

/** Précédents / suivants au sein de la même catégorie. */
export function neighbours(articles: Article[], current: Article) {
  const siblings = articles.filter((article) => article.category === current.category);
  const index = siblings.findIndex((article) => article.slug === current.slug);
  if (index === -1) {
    return { previous: null, next: null };
  }
  return {
    previous: index > 0 ? siblings[index - 1] : null,
    next: index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}
