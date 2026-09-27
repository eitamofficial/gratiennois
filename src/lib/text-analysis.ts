import type { Article, Category } from "./types";
import { normalizeText, STOP_WORDS as SEARCH_STOP_WORDS } from "./search";
import { buildLinkMap, normalizeKey } from "./link-graph";

/**
 * Analyse d'un texte destiné aux rédacteurs : statistiques, contrôle qualité,
 * suggestions de classification et de tags, détection de doublons et de liens
 * internes cassés, résumé extractif. Aucune donnée n'est publiée : tout reste
 * indicatif et lisible par un humain.
 */

/**
 * Mots vides de l'assistant de rédaction : la liste de la recherche, complétée
 * des tournures françaises et des verbes auxiliaires. Sans accents, puisque
 * `normalizeText` retire les diacritiques.
 */
const STOP_WORDS = new Set([
  ...SEARCH_STOP_WORDS,
  "aucun", "aucune", "aujourd", "auquel", "aussi", "autre", "autres", "avoir", "bien", "ceci",
  "cela", "celle", "celui", "cet", "cette", "ceux", "chaque", "comment", "deux", "devrait",
  "doit", "doivent", "donc", "elles", "encore", "estime", "fait", "fois", "ici", "ils", "jusqu",
  "laquelle", "lequel", "leurs", "lors", "lorsque", "malgre", "mien", "moins", "ont", "ou",
  "parce", "peut", "peuvent", "plusieurs", "pourquoi", "pourtant", "quelle", "quelles", "quels",
  "quoi", "selon", "sera", "ses", "soit", "sous", "tandis", "tant", "tous", "tout",
  "toute", "toutes", "tres", "vers",
]);

/** Indices lexical -> indice de catégorie, pour la suggestion de classement. */
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  histoire: ["histoire", "chronologie", "date", "année", "siècle", "fondation", "origine", "événement", "passé", "mémoire"],
  institutions: ["dauphin", "conseil", "régent", "baillit", "ministre", "député", "assemblée", "gouvernement", "pouvoir", "charge", "organisation", "staff"],
  geographie: ["lieu", "région", "territoire", "province", "ville", "carte", "frontière", "vallée", "montagne"],
  culture: ["culture", "tradition", "fête", "langue", "art", "musique", "coutume", "célébration", "symbole"],
  lois: ["loi", "article", "constitution", "interdit", "règle", "sanction", "juridique", "droit", "peine", "procédure", "charte", "pouvoir de véto"],
  personnalites: ["membre", "profil", "personnalité", "avatar", "rôle discord", "surnom", "présence"],
};

export interface ChecklistItem {
  label: string;
  ok: boolean;
  detail: string;
}

export interface AnalysisResult {
  words: number;
  characters: number;
  sentences: number;
  readingMinutes: number;
  headings: number;
  checklist: ChecklistItem[];
  suggestedCategory: { category: Category; score: number }[];
  suggestedTags: string[];
  duplicates: Array<{ slug: string; title: string; similarity: number }>;
  brokenLinks: string[];
  summary: string;
}

function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/[|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function shingles(text: string, size = 5): Set<string> {
  const words = normalizeText(text).split(/[^a-z0-9]+/).filter(Boolean);
  const result = new Set<string>();
  for (let i = 0; i + size <= words.length; i++) {
    result.add(words.slice(i, i + size).join(" "));
  }
  return result;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

/** Part des groupes de mots du texte le plus court retrouvé dans l'autre. */
function containment(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const value of small) if (large.has(value)) intersection++;
  return intersection / small.size;
}

/**
 * Score de ressemblance entre un brouillon et un article existant.
 *
 * Le Jaccard seul est trop sévère : reformuler ou rallonger un article
 * fait tomber le score sous le seuil alors que le texte est clairement le même.
 * On combine donc deux mesures complémentaires :
 *  - corps du texte, en groupes de 3 mots (Jaccard + proportion retrouvée) ;
 *  - titre, en groupes de mots, pour attraper les doublons « sous un autre titre ».
 */
function duplicateScore(own: Set<string>, ownTitle: Set<string>, other: Set<string>, otherTitle: Set<string>): number {
  const body = 0.6 * jaccard(own, other) + 0.4 * containment(own, other);
  const titles = Math.max(jaccard(ownTitle, otherTitle), containment(ownTitle, otherTitle));
  return Math.max(body, titles * 0.9);
}

function topKeywords(text: string, limit: number): Array<{ term: string; count: number }> {
  const frequencies = new Map<string, number>();
  for (const word of normalizeText(text).split(/[^a-z0-9]+/)) {
    if (word.length < 4 || STOP_WORDS.has(word)) continue;
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }
  return [...frequencies.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Résumé extractif : on garde les phrases les plus représentatives, dans l'ordre. */
function extractiveSummary(text: string, maxSentences = 2): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
  if (sentences.length <= maxSentences) return sentences.join(" ");

  const keywords = topKeywords(text, 12);
  const weight = new Map(keywords.map((item) => [item.term, item.count]));

  const scored = sentences.map((sentence, index) => {
    let score = 0;
    for (const word of normalizeText(sentence).split(/[^a-z0-9]+/)) {
      score += weight.get(word) ?? 0;
    }
    return { sentence, index, score: score / Math.sqrt(sentence.length) };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" ");
}

function extractInternalLinks(markdown: string): string[] {
  const links = new Set<string>();
  for (const match of markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    links.add(match[1].trim());
  }
  for (const match of markdown.matchAll(/\]\(\/wiki\/([a-z0-9-]+)\)/g)) {
    links.add(match[1]);
  }
  return [...links];
}

export interface AnalyseInput {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  tags?: string[];
  category?: Category;
  /** Base de comparaison pour les doublons et les liens. */
  articles: Array<Pick<Article, "slug" | "title" | "content" | "tags" | "summary">>;
}

export function analyzeArticle(input: AnalyseInput): AnalysisResult {
  const text = plainText(input.content);
  const words = countWords(text);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim()).length;
  const headings = (input.content.match(/^#{1,6}\s+/gm) ?? []).length;
  const readingMinutes = Math.max(1, Math.round(words / 200));

  // Contrôle qualité — la résolution des liens [[…]] utilise exactement la même
  // table que le rendu Markdown, pour éviter les faux positifs.
  const internalLinks = extractInternalLinks(input.content);
  const linkMap = buildLinkMap(input.articles);
  const brokenLinks = internalLinks.filter((link) => !linkMap.has(normalizeKey(link)));

  const checklist: ChecklistItem[] = [
    {
      label: "Titre renseigné",
      ok: input.title.trim().length >= 3,
      detail: `${input.title.trim().length} caractère(s)`,
    },
    {
      label: "Résumé entre 40 et 300 caractères",
      ok: (input.summary?.trim().length ?? 0) >= 40 && (input.summary?.trim().length ?? 0) <= 300,
      detail: `${input.summary?.trim().length ?? 0} caractère(s)`,
    },
    {
      label: "Contenu substantiel (≥ 120 mots)",
      ok: words >= 120,
      detail: `${words} mots`,
    },
    {
      label: "Au moins 2 sections (##)",
      ok: headings >= 2,
      detail: `${headings} titre(s)`,
    },
    {
      label: "Au moins 2 tags",
      ok: (input.tags?.length ?? 0) >= 2,
      detail: `${input.tags?.length ?? 0} tag(s)`,
    },
    {
      label: "Aucun lien interne cassé",
      ok: brokenLinks.length === 0,
      detail: brokenLinks.length ? brokenLinks.join(", ") : "aucun",
    },
  ];

  // Doublons éventuels (Jaccard + proportion retrouvée sur groupes de 3 mots)
  const own = shingles(text, 3);
  const ownTitle = shingles(input.title, 2);
  const duplicates = input.articles
    .filter((article) => article.slug !== input.slug)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      similarity: Number(
        duplicateScore(own, ownTitle, shingles(plainText(article.content), 3), shingles(article.title, 2)).toFixed(3),
      ),
    }))
    .filter((item) => item.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  // Catégorie suggérée (indicative)
  const normalizedText = normalizeText(text);
  const suggestedCategory = (Object.keys(CATEGORY_KEYWORDS) as Category[])
    .map((category) => {
      let score = 0;
      for (const keyword of CATEGORY_KEYWORDS[category]) {
        const occurrences = normalizedText.split(keyword).length - 1;
        score += occurrences;
      }
      if (input.category === category) score += 2;
      return { category, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Tags suggérés : mots fréquents absents des tags déjà posés
  const existing = new Set((input.tags ?? []).map((tag) => normalizeText(tag)));
  const suggestedTags = topKeywords(text, 14)
    .filter((item) => !existing.has(item.term))
    .slice(0, 6)
    .map((item) => item.term);

  return {
    words,
    characters: text.length,
    sentences,
    readingMinutes,
    headings,
    checklist,
    suggestedCategory,
    suggestedTags,
    duplicates,
    brokenLinks,
    summary: extractiveSummary(text),
  };
}
