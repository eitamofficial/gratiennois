import type { Article } from "./types";

/**
 * Recherche sémantique et tolérante aux fautes, sans dépendance externe.
 *
 * Le wiki est servi depuis une tablette : appeler un modèle d'embeddings à
 * chaque requête coûterait une connexion réseau et un quota. Un TF-IDF pondéré
 * suivi d'une similarité cosinus donne l'essentiel du résultat utile — trouver
 * les pages qui parlent de la même chose avec d'autres mots — pour un coût nul
 * et un comportement hors ligne.
 */

const MOTS_VIDES = new Set([
  "le", "la", "les", "un", "une", "des", "du", "de", "d", "et", "ou", "à", "a",
  "au", "aux", "en", "dans", "sur", "pour", "par", "avec", "sans", "que", "qui",
  "quoi", "dont", "où", "est", "sont", "été", "être", "avoir", "a", "il", "elle",
  "ils", "elles", "on", "nous", "vous", "je", "tu", "se", "sa", "son", "ses",
  "ce", "cet", "cette", "ces", "plus", "moins", "très", "tout", "tous", "toute",
  "comme", "mais", "donc", "car", "ne", "pas", "the", "of", "and", "to", "in",
]);

/** Découpe en mots normalisés : minuscules, sans accents, sans ponctuation. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((mot) => mot.length >= 3 && !MOTS_VIDES.has(mot));
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let precedente = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const courante = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      courante[j] = Math.min(courante[j - 1] + 1, precedente[j] + 1, precedente[j - 1] + cout);
    }
    precedente = courante;
  }
  return precedente[b.length];
}

export interface SemanticIndex {
  /** Vecteur creux par article : terme → poids TF-IDF. */
  vectors: Map<string, Map<string, number>>;
  /** Fréquence documentaire de chaque terme. */
  documentFrequency: Map<string, number>;
  total: number;
}

/** Construit l'index une fois ; à mémoïser côté appelant. */
export function buildSemanticIndex(articles: Article[]): SemanticIndex {
  const vectors = new Map<string, Map<string, number>>();
  const documentFrequency = new Map<string, number>();

  for (const article of articles) {
    // Le titre et le résumé pèsent plus lourd que le corps : un article qui
    // mentionne un nom une fois dans un paragraphe n'en parle pas.
    const texte = `${article.title} ${article.title} ${article.title} ${article.summary} ${article.summary} ${article.content}`;
    const tokens = tokenize(texte);
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    for (const token of counts.keys()) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
    vectors.set(article.slug, counts);
  }

  const total = Math.max(1, articles.length);
  const weighted = new Map<string, Map<string, number>>();
  for (const [slug, counts] of vectors) {
    const vector = new Map<string, number>();
    for (const [token, count] of counts) {
      const df = documentFrequency.get(token) ?? 1;
      const idf = Math.log(1 + total / df);
      vector.set(token, (1 + Math.log(count)) * idf);
    }
    // Normalisation L2 : sans elle, un article long gagne toujours.
    const norme = Math.sqrt([...vector.values()].reduce((somme, v) => somme + v * v, 0)) || 1;
    for (const [token, value] of vector) vector.set(token, value / norme);
    weighted.set(slug, vector);
  }

  return { vectors: weighted, documentFrequency, total };
}

/** Termes de la requête, avec correction orthographique sur le vocabulaire connu. */
export function expandQuery(index: SemanticIndex, query: string): string[] {
  const tokens = tokenize(query);
  const vocabulaire = [...index.documentFrequency.keys()];
  return tokens.map((token) => {
    if (index.documentFrequency.has(token)) return token;
    let meilleur = token;
    let distance = 3;
    for (const candidat of vocabulaire) {
      if (Math.abs(candidat.length - token.length) > 2) continue;
      const d = levenshtein(token, candidat);
      if (d < distance) {
        distance = d;
        meilleur = candidat;
      }
    }
    return distance <= 2 ? meilleur : token;
  });
}

export interface SemanticHit {
  slug: string;
  score: number;
  /** Termes effectivement reconnus, pour afficher « rien trouvé pour X ». */
  matched: string[];
}

export function semanticSearch(
  index: SemanticIndex,
  query: string,
  limit = 10,
): SemanticHit[] {
  const termes = expandQuery(index, query);
  if (termes.length === 0) return [];
  const matched = termes.filter((terme) => index.documentFrequency.has(terme));

  const hits: SemanticHit[] = [];
  for (const [slug, vector] of index.vectors) {
    let score = 0;
    for (const terme of termes) score += vector.get(terme) ?? 0;
    if (score > 0) hits.push({ slug, score, matched });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Score de proximité d'un titre pour l'autocomplétion. */
export function titleScore(query: string, title: string): number {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const t = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  const distance = levenshtein(q, t.slice(0, Math.max(q.length, 1)));
  if (distance <= 2) return 40 - distance * 5;
  return 0;
}
