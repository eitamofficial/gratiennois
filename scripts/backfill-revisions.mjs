/**
 * Remplit l'historique des révisions manquantes (magasin JSON).
 *
 *   node scripts/backfill-revisions.mjs
 *
 * Crée une révision « Création » pour chaque article qui n'en a aucune,
 * afin que la page de comparaison des versions dispose d'une base.
 * Équivalent PostgreSQL :
 *   INSERT INTO revisions (id, article_slug, action, author, title, category, summary, content, tags, created_at)
 *   SELECT 'seed-' || slug, slug, 'create', author, title, category, summary, content, tags, created_at
 *   FROM articles WHERE slug NOT IN (SELECT DISTINCT article_slug FROM revisions);
 */
import { readFile, writeFile } from "node:fs/promises";

const ARTICLES_FILE = "data/articles.json";
const REVISIONS_FILE = "data/revisions.json";

let articles = [];
try {
  articles = JSON.parse(await readFile(ARTICLES_FILE, "utf8"));
} catch {
  console.error(`${ARTICLES_FILE} introuvable ou illisible : le wiki est-il déjà démarré ?`);
  process.exit(1);
}

let revisions = [];
try {
  revisions = JSON.parse(await readFile(REVISIONS_FILE, "utf8"));
  if (!Array.isArray(revisions)) revisions = [];
} catch {
  revisions = [];
}

const known = new Set(revisions.map((revision) => revision.articleSlug));
const missing = articles.filter((article) => !known.has(article.slug));

if (missing.length === 0) {
  console.log(`✅ ${articles.length} article(s) déjà pourvus d'un historique. Rien à faire.`);
  process.exit(0);
}

const created = missing.map((article) => ({
  id: `seed-${article.slug}`,
  articleSlug: article.slug,
  action: "create",
  author: article.author,
  createdAt: article.createdAt,
  snapshot: {
    title: article.title,
    category: article.category,
    summary: article.summary,
    content: article.content,
    tags: article.tags,
  },
}));

await writeFile(REVISIONS_FILE, JSON.stringify([...created, ...revisions], null, 2), "utf8");
console.log(
  `✅ ${created.length} révision(s) « Création » ajoutée(s) : ${created
    .map((revision) => revision.articleSlug)
    .join(", ")}`,
);
