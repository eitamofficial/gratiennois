import { getPublishedArticles } from "./articles-store";
import { CATEGORIES, type Article, type Category } from "./types";

export type MatchField = "titre" | "tags" | "résumé" | "catégorie" | "contenu";

export interface SearchHit extends Omit<Article, "content"> {
  /** Extrait du contenu avec les termes surlignés (<mark>). */
  excerpt: string;
  score: number;
  /** Champs où le terme a été trouvé (aide à comprendre le classement). */
  matchedIn: MatchField[];
}

export interface SearchFacet {
  category: Category;
  count: number;
}

export interface SearchOutcome {
  results: SearchHit[];
  /** Comptage par catégorie, calculé avant le filtrage affiché. */
  facets: SearchFacet[];
  total: number;
  /** Propositions affichées quand la requête ne renvoie rien. */
  suggestions: string[];
}

/**
 * Mots vides de la recherche. Volontairement **sans accents** : les textes
 * passent tous par `normalizeText`, qui retire les diacritiques.
 */
export const STOP_WORDS = new Set([
  "alors", "au", "aux", "avec", "ce", "ces", "dans", "de", "des", "du", "elle", "en",
  "entre", "est", "et", "eux", "il", "je", "la", "le", "les", "leur", "lui", "ma", "mais",
  "me", "meme", "mes", "moi", "mon", "ne", "nos", "notre", "nous", "on", "ou", "par",
  "pas", "pour", "qu", "que", "qui", "sa", "se", "ses", "son", "sur", "ta", "te", "tes",
  "toi", "ton", "tu", "un", "une", "vos", "votre", "vous", "y",
]);

/** Poids par champ : le titre prime, comme dans une encyclopédie papier. */
const FIELD_WEIGHTS = {
  titleExact: 24,
  titlePrefix: 16,
  titleContains: 12,
  tagExact: 10,
  tagContains: 7,
  category: 6,
  summary: 5,
  content: 2,
} as const;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

/** Distance de Levenshtein bornée (early exit) pour la tolérance aux fautes. */
function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      if (current[j] < rowMin) rowMin = current[j];
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Surligne les termes recherchés dans un texte déjà échappé. */
function highlight(escapedText: string, tokens: string[]): string {
  if (tokens.length === 0) return escapedText;
  const pattern = tokens
    .filter((token) => token.length >= 2)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length)
    .join("|");
  if (!pattern) return escapedText;
  return escapedText.replace(new RegExp(`(${pattern})`, "gi"), "<mark>$1</mark>");
}

/** Extrait le texte brut (Markdown retiré) autour de la première occurrence. */
function buildExcerpt(article: Article, tokens: string[]): string {
  const plain = article.content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (tokens.length === 0) {
    return highlight(escapeHtml(plain.slice(0, 190)), tokens);
  }

  const haystack = normalizeText(plain);
  let index = -1;
  for (const token of tokens) {
    const found = haystack.indexOf(token);
    if (found !== -1 && (index === -1 || found < index)) index = found;
  }

  const start = index === -1 ? 0 : Math.max(0, index - 70);
  const end = Math.min(plain.length, start + 210);
  const slice = plain.slice(start, end);
  return (
    (start > 0 ? "…" : "") +
    highlight(escapeHtml(slice), tokens) +
    (end < plain.length ? "…" : "")
  );
}

interface ScoredArticle {
  article: Article;
  score: number;
  matchedIn: SearchHit["matchedIn"];
  /** Termes mal orthographiés qui ont nevertheless trouvé une correspondance. */
  fuzzyTerms: string[];
}

function scoreArticle(article: Article, tokens: string[]): ScoredArticle | null {
  const fuzzyTerms: string[] = [];
  const title = normalizeText(article.title);
  const tags = article.tags.map((tag) => normalizeText(tag));
  const summary = normalizeText(article.summary);
  const content = normalizeText(article.content);
  const category = normalizeText(article.category);

  let score = 0;
  const matchedIn = new Set<MatchField>();

  for (const token of tokens) {
    let tokenScore = 0;
    let tokenMatched = false;

    if (title === token) {
      tokenScore += FIELD_WEIGHTS.titleExact;
      matchedIn.add("titre");
      tokenMatched = true;
    } else if (title.startsWith(token)) {
      tokenScore += FIELD_WEIGHTS.titlePrefix;
      matchedIn.add("titre");
      tokenMatched = true;
    } else if (title.includes(token)) {
      tokenScore += FIELD_WEIGHTS.titleContains;
      matchedIn.add("titre");
      tokenMatched = true;
    }

    if (tags.some((tag) => tag === token)) {
      tokenScore += FIELD_WEIGHTS.tagExact;
      matchedIn.add("tags");
      tokenMatched = true;
    } else if (tags.some((tag) => tag.includes(token))) {
      tokenScore += FIELD_WEIGHTS.tagContains;
      matchedIn.add("tags");
      tokenMatched = true;
    }

    if (category.includes(token)) {
      tokenScore += FIELD_WEIGHTS.category;
      matchedIn.add("catégorie");
      tokenMatched = true;
    }

    if (summary.includes(token)) {
      tokenScore += FIELD_WEIGHTS.summary;
      matchedIn.add("résumé");
      tokenMatched = true;
    }

    if (content.includes(token)) {
      tokenScore += FIELD_WEIGHTS.content;
      matchedIn.add("contenu");
      tokenMatched = true;
    }    // Tolérance aux fautes : un terme mal orthographié est rapproché du
    // vocabulaire des titres et tags, avec une pénalité. On mémorise le mot
    // correctement orthographié pour proposer « vouliez-vous dire… ».
    if (!tokenMatched) {
      const threshold = token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
      if (threshold > 0) {
        let bestWord: string | null = null;
        let bestDistance = threshold + 1;

        for (const candidate of [article.title, ...article.tags]) {
          for (const word of candidate.toLowerCase().split(/[^a-z0-9]+/)) {
            if (word.length < 3) continue;
            const distance = editDistance(token, word, threshold);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestWord = word;
            }
          }
        }

        if (bestWord && bestDistance <= threshold) {
          tokenScore += FIELD_WEIGHTS.tagContains / 2;
          matchedIn.add("titre");
          tokenMatched = true;
          fuzzyTerms.push(bestWord);
        }
      }
    }

    if (!tokenMatched) return null; // AND : tous les termes doivent correspondre
    score += tokenScore;
  }

  if (score === 0 || matchedIn.size === 0) return null;

  // Bonus : article plus court = plus précis, et cohérence termes/titre.
  score += Math.max(0, 6 - article.content.length / 3000);
  if (tokens.every((token) => title.includes(token))) score += 5;

  return { article, score, matchedIn: [...matchedIn], fuzzyTerms } satisfies ScoredArticle;
}

/** Propositions « vouliez-vous dire… » : titres et tags les plus proches. */
function buildSuggestions(
  tokens: string[],
  articles: Article[],
  limit = 3,
): string[] {
  const vocabulary = new Set<string>();
  for (const article of articles) {
    for (const word of normalizeText(article.title).split(/[^a-z0-9]+/)) {
      if (word.length >= 4) vocabulary.add(word);
    }
    for (const tag of article.tags) {
      const normalized = normalizeText(tag);
      if (normalized.length >= 3) vocabulary.add(normalized);
    }
  }

  const ranked: Array<{ term: string; distance: number }> = [];
  for (const token of tokens) {
    for (const candidate of vocabulary) {
      const distance = editDistance(token, candidate, 3);
      if (distance > 0 && distance <= Math.max(1, Math.floor(token.length / 3))) {
        ranked.push({ term: candidate, distance });
      }
    }
  }

  return ranked
    .sort((a, b) => a.distance - b.distance || a.term.localeCompare(b.term))
    .slice(0, limit)
    .map((item) => item.term);
}

export interface SearchOptions {
  category?: Category;
  limit?: number;
}

export async function searchArticles(
  query: string,
  options: SearchOptions = {},
): Promise<SearchOutcome> {
  const articles = await getPublishedArticles();
  const tokens = tokenize(query);
  const limit = options.limit ?? 50;

  if (tokens.length === 0) {
    return { results: [], facets: [], total: 0, suggestions: [] };
  }

  const scored: ScoredArticle[] = [];
  const fuzzyTerms = new Set<string>();
  for (const article of articles) {
    const result = scoreArticle(article, tokens);
    if (result) {
      scored.push(result);
      for (const term of result.fuzzyTerms) fuzzyTerms.add(term);
    }
  }

  scored.sort(
    (a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title, "fr"),
  );

  const facets: SearchFacet[] = CATEGORIES.map((category) => ({
    category,
    count: scored.filter((item) => item.article.category === category).length,
  })).filter((facet) => facet.count > 0);

  const filtered = options.category
    ? scored.filter((item) => item.article.category === options.category)
    : scored;

  const results: SearchHit[] = filtered.slice(0, limit).map(({ article, score, matchedIn }) => ({
    slug: article.slug,
    title: article.title,
    category: article.category,
    summary: article.summary,
    tags: article.tags,
    author: article.author,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    discordUserId: article.discordUserId,
    excerpt: buildExcerpt(article, tokens),
    score,
    matchedIn,
  }));

  return {
    results,
    facets,
    total: filtered.length,
    suggestions:
      results.length === 0 ? buildSuggestions(tokens, articles) : [...fuzzyTerms].slice(0, 3),
  };
}

/** Suggestions d'autocomplétion (titres et tags) pour la barre de recherche. */
export async function suggestTerms(prefix: string, limit = 6): Promise<string[]> {
  const normalized = normalizeText(prefix.trim());
  if (normalized.length < 2) return [];

  const articles = await getPublishedArticles();
  const terms = new Set<string>();
  for (const article of articles) {
    terms.add(normalizeText(article.title));
    for (const tag of article.tags) terms.add(normalizeText(tag));
  }

  return [...terms]
    .filter((term) => term.startsWith(normalized))
    .sort((a, b) => a.length - b.length)
    .slice(0, limit)
    .map((term) => {
      const original = articles
        .flatMap((article) => [article.title, ...article.tags])
        .find((value) => normalizeText(value) === term);
      return original ?? term;
    });
}
