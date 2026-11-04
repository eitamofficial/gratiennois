import type { Article, ArticleSource, Category, MaintenanceCode } from "./types";
import { CATEGORIES } from "./types";
import { extractReferences } from "./link-graph";

/**
 * Analyse de corpus.
 *
 * Toutes les fonctions ici sont **pures** : elles prennent la liste des articles
 * et rendent un résultat. Aucune ne lit le disque, aucune ne dépend de la
 * requête. C'est ce qui permet de les appeler depuis une page, une route API ou
 * un script de maintenance sans dupliquer la logique.
 */

// ---------------------------------------------------------------------------
// Complétude
// ---------------------------------------------------------------------------

export interface Completeness {
  /** Score de 0 à 100. */
  score: number;
  /** Ce qui manque, en clair, pour guider la rédaction. */
  missing: string[];
}

/**
 * Note un article sur ce qui rend une page encyclopédique utilisable :
 * un résumé, du texte, des données clés, des sources, des liens entrants.
 *
 * La pondération privilégie les **sources** (20 points) : c'est le critère que
 * le wiki revendique et celui qui manque le plus souvent.
 */
export function completeness(article: Article, inbound: number): Completeness {
  let score = 0;
  const missing: string[] = [];

  if (article.summary.trim().length >= 80) score += 15;
  else missing.push("résumé trop court");

  if (article.content.length >= 800) score += 25;
  else if (article.content.length >= 300) score += 12;
  else missing.push("texte trop court");

  const champs = article.infobox?.fields?.length ?? 0;
  if (champs >= 3) score += 15;
  else missing.push("infobox incomplète");

  const sources = article.sources?.length ?? 0;
  if (sources >= 3) score += 20;
  else if (sources >= 1) score += 10;
  else missing.push("aucune source");

  if (inbound >= 2) score += 10;
  else if (inbound >= 1) score += 5;
  else missing.push("aucun lien entrant");

  if (article.tags.length >= 2) score += 5;
  else missing.push("étiquettes insuffisantes");

  const age = Date.now() - new Date(article.updatedAt).getTime();
  if (age < 1000 * 60 * 60 * 24 * 180) score += 10;
  else missing.push("pas de mise à jour depuis six mois");

  return { score: Math.min(100, score), missing };
}

// ---------------------------------------------------------------------------
// Graphe
// ---------------------------------------------------------------------------

/** Table des liens entrants, calculée une fois pour tout le corpus. */
export function inboundCounts(articles: Article[]): Map<string, number> {
  const known = new Set(articles.map((article) => article.slug));
  const counts = new Map<string, number>();
  for (const article of articles) counts.set(article.slug, 0);
  for (const article of articles) {
    for (const target of extractReferences(article.content)) {
      if (target !== article.slug && known.has(target)) {
        counts.set(target, (counts.get(target) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/** Pages qu'aucun article ne cite : elles existent, mais sont introuvables. */
export function orphans(articles: Article[]): Article[] {
  const counts = inboundCounts(articles);
  return articles
    .filter((article) => (counts.get(article.slug) ?? 0) === 0)
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
}

/** Titres identiques ou très proches : candidats à une page d'homonymie. */
export function duplicateTitles(articles: Article[]): Map<string, Article[]> {
  const groups = new Map<string, Article[]>();
  for (const article of articles) {
    const key = article.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(article);
    groups.set(key, list);
  }
  return new Map([...groups].filter(([, list]) => list.length > 1));
}

/** Liens externes cités dans le corps, pour la vérification des 404. */
export function externalLinks(articles: Article[]): Array<{ slug: string; url: string }> {
  const seen = new Set<string>();
  const links: Array<{ slug: string; url: string }> = [];
  for (const article of articles) {
    for (const match of article.content.matchAll(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi)) {
      const url = match[1];
      const key = `${article.slug}\u0000${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ slug: article.slug, url });
    }
  }
  return links;
}

// ---------------------------------------------------------------------------
// Sélection éditoriale
// ---------------------------------------------------------------------------

/** Empreinte stable d'une chaîne : deux appels le même jour donnent le même index. */
function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Article du jour : déterministe, donc identique pour tous les visiteurs et
 * stable pendant 24 h. On ne tire que parmi les pages déjà étoffées — mettre en
 * avant une page vide serait une mauvaise publicité.
 */
export function articleOfTheDay(articles: Article[], now = new Date()): Article | null {
  const counts = inboundCounts(articles);
  const eligibles = articles.filter(
    (article) => completeness(article, counts.get(article.slug) ?? 0).score >= 55,
  );
  if (eligibles.length === 0) return articles[0] ?? null;
  const cle = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
  return eligibles[stableHash(cle) % eligibles.length];
}

export interface DidYouKnow {
  article: Article;
  label: string;
  value: string;
}

/** Accroches tirées des infoboxes : une donnée courte, un titre, un lien. */
export function didYouKnow(articles: Article[], limit = 4, seed = ""): DidYouKnow[] {
  const candidates: DidYouKnow[] = [];
  for (const article of articles) {
    for (const field of article.infobox?.fields ?? []) {
      const value = field.value.trim();
      if (value.length < 3 || value.length > 90) continue;
      candidates.push({ article, label: field.label, value });
    }
  }
  if (candidates.length === 0) return [];
  const start = stableHash(seed) % candidates.length;
  const picked: DidYouKnow[] = [];
  const vus = new Set<string>();
  for (let offset = 0; offset < candidates.length && picked.length < limit; offset += 1) {
    const candidate = candidates[(start + offset) % candidates.length];
    if (vus.has(candidate.article.slug)) continue;
    vus.add(candidate.article.slug);
    picked.push(candidate);
  }
  return picked;
}

export interface GalleryItem {
  slug: string;
  title: string;
  url: string;
  alt: string;
  caption?: string;
  category: Category;
}

/** Toutes les illustrations d'infobox, avec leur crédit. */
export function gallery(articles: Article[]): GalleryItem[] {
  return articles
    .filter((article) => article.infobox?.imageUrl)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      url: article.infobox!.imageUrl!,
      alt: article.infobox?.imageAlt ?? article.title,
      caption: article.infobox?.imageCaption,
      category: article.category,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
}

/** Sous-niveaux d'une catégorie : ses étiquettes, avec leur poids. */
export function categoryFacets(
  articles: Article[],
  category: Category,
): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const article of articles) {
    if (article.category !== category) continue;
    for (const tag of article.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "fr"));
}

// ---------------------------------------------------------------------------
// Bandeaux d'entretien
// ---------------------------------------------------------------------------

export interface MaintenanceBanner {
  code: MaintenanceCode;
  label: string;
  detail: string;
  tone: "info" | "warn";
}

const BANNERS: Record<MaintenanceCode, Omit<MaintenanceBanner, "code">> = {
  "sources-insuffisantes": {
    label: "Sources insuffisantes",
    detail: "Cet article s'appuie sur trop peu de sources pour être vérifiable.",
    tone: "warn",
  },
  "a-verifier": {
    label: "À vérifier",
    detail: "Une affirmation de cette page demande confirmation.",
    tone: "warn",
  },
  "source-unique": {
    label: "Source unique",
    detail: "Tout l'article repose sur un seul témoignage.",
    tone: "warn",
  },
  "en-chantier": {
    label: "En chantier",
    detail: "La rédaction est en cours : le texte peut changer sensiblement.",
    tone: "info",
  },
  "evenement-recent": {
    label: "Événement récent",
    detail: "Le récit de cet événement peut encore évoluer.",
    tone: "info",
  },
};

export function banners(article: Article): MaintenanceBanner[] {
  return (article.maintenance ?? []).map((code) => ({ code, ...BANNERS[code] }));
}

/**
 * Bandeaux déduits automatiquement — jamais imposés : ils complètent ceux que
 * la rédaction a posés, sans se substituer à son jugement.
 */
export function suggestedBanners(article: Article): MaintenanceBanner[] {
  const explicites = new Set(article.maintenance ?? []);
  const suggestions: MaintenanceBanner[] = [];
  const sources = article.sources?.length ?? 0;
  if (sources === 0 && !explicites.has("sources-insuffisantes")) {
    suggestions.push({ code: "sources-insuffisantes", ...BANNERS["sources-insuffisantes"] });
  } else if (sources === 1 && !explicites.has("source-unique")) {
    suggestions.push({ code: "source-unique", ...BANNERS["source-unique"] });
  }
  return suggestions;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export function sourceLabel(source: ArticleSource): string {
  switch (source.kind) {
    case "discord":
      return "Message Discord";
    case "ouvrage":
      return "Ouvrage";
    case "page":
      return "Page web";
    case "capture":
      return "Capture d'écran";
    default:
      return "Source";
  }
}

/** Références `[1]`, `[2]` dans le corps : renvoie l'index de chaque source citée. */
export function citedSourceIds(content: string): Set<string> {
  const cited = new Set<string>();
  for (const match of content.matchAll(/\[\^([a-zA-Z0-9_-]{1,40})\]/g)) cited.add(match[1]);
  return cited;
}

// ---------------------------------------------------------------------------
// Statistiques
// ---------------------------------------------------------------------------

export interface WikiStats {
  articles: number;
  categories: Array<{ id: Category; count: number }>;
  words: number;
  sources: number;
  withSources: number;
  protectedCount: number;
  qualityCount: number;
  averageCompleteness: number;
  lastUpdate: string | null;
}

export function wikiStats(articles: Article[]): WikiStats {
  const counts = inboundCounts(articles);
  const words = articles.reduce(
    (total, article) => total + article.content.split(/\s+/).filter(Boolean).length,
    0,
  );
  const scores = articles.map((article) => completeness(article, counts.get(article.slug) ?? 0).score);
  const categories = CATEGORIES.map((id) => ({
    id,
    count: articles.filter((article) => article.category === id).length,
  }));
  const dates = articles.map((article) => article.updatedAt).sort();

  return {
    articles: articles.length,
    categories,
    words,
    sources: articles.reduce((total, article) => total + (article.sources?.length ?? 0), 0),
    withSources: articles.filter((article) => (article.sources?.length ?? 0) > 0).length,
    protectedCount: articles.filter((article) => article.protection).length,
    qualityCount: articles.filter((article) => article.quality).length,
    averageCompleteness:
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    lastUpdate: dates.length > 0 ? dates[dates.length - 1] : null,
  };
}
