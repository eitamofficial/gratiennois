import { promises as fs } from "node:fs";
import path from "node:path";
import type { Article, Revision } from "../types";
import { isEphemeralRuntime } from "./environment";
import { StorageUnavailableError } from "./errors";
import type { StorageDriver } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const REVISIONS_FILE = path.join(DATA_DIR, "revisions.json");
const META_FILE = path.join(DATA_DIR, "meta.json");
const MAX_REVISIONS_PER_ARTICLE = 50;

/** Révision initiale correspondant à un article de lancement. */
export function toSeedRevision(article: Article): Revision {
  return {
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
      infobox: article.infobox,
    },
  };
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  // Sur une plateforme sans écriture persistante, laisser l'appel échouer
  // silencieusement reviendrait à faire croire que l'article a été enregistré.
  // On le dit explicitement : mieux vaut une erreur lisible qu'une perte de
  // contenu passée inaperçue.
  if (isEphemeralRuntime()) {
    throw new StorageUnavailableError(
      "Écriture refusée : cette plateforme ne conserve pas les fichiers entre deux invocations. " +
        "Renseignez DATABASE_URL (PostgreSQL) pour que le contenu du wiki soit durable.",
    );
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

export function createJsonDriver(): StorageDriver {
  let writeQueue: Promise<unknown> = Promise.resolve();

  /** Sérialise les écritures pour éviter les pertes en cas d'appels concurrents. */
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = writeQueue.then(operation);
    writeQueue = run.catch(() => undefined);
    return run;
  }

  return {
    name: "json",

    async init(seed) {
      const articles = await readJson<Article[]>(ARTICLES_FILE, []);
      if (articles.length === 0) {
        await writeJson(ARTICLES_FILE, seed);
        // Chaque article publié démarre avec une révision « création » :
        // la comparaison de versions a ainsi une base dès le premier jour.
        await writeJson(REVISIONS_FILE, seed.map(toSeedRevision));
      } else {
        const revisions = await readJson<Revision[]>(REVISIONS_FILE, []);
        if (!Array.isArray(revisions)) {
          await writeJson(REVISIONS_FILE, []);
        }
      }
    },

    async countArticles() {
      const articles = await readJson<Article[]>(ARTICLES_FILE, []);
      return articles.length;
    },

    async getAllArticles() {
      return readJson<Article[]>(ARTICLES_FILE, []);
    },

    async getArticleBySlug(slug) {
      const articles = await readJson<Article[]>(ARTICLES_FILE, []);
      return articles.find((article) => article.slug === slug) ?? null;
    },

    async createArticle(article) {
      await enqueue(async () => {
        const articles = await readJson<Article[]>(ARTICLES_FILE, []);
        articles.push(article);
        await writeJson(ARTICLES_FILE, articles);
      });
    },

    async updateArticle(article) {
      await enqueue(async () => {
        const articles = await readJson<Article[]>(ARTICLES_FILE, []);
        const index = articles.findIndex((item) => item.slug === article.slug);
        if (index === -1) return;
        articles[index] = article;
        await writeJson(ARTICLES_FILE, articles);
      });
    },

    async deleteArticle(slug) {
      return enqueue(async () => {
        const articles = await readJson<Article[]>(ARTICLES_FILE, []);
        const next = articles.filter((item) => item.slug !== slug);
        if (next.length === articles.length) return false;
        await writeJson(ARTICLES_FILE, next);
        return true;
      });
    },

    async setDiscordUserIds(mapping) {
      await enqueue(async () => {
        const articles = await readJson<Article[]>(ARTICLES_FILE, []);
        for (const article of articles) {
          const discordUserId = mapping[article.slug];
          if (discordUserId) article.discordUserId = discordUserId;
        }
        await writeJson(ARTICLES_FILE, articles);
      });
    },

    async addRevision(revision) {
      await enqueue(async () => {
        const revisions = await readJson<Revision[]>(REVISIONS_FILE, []);
        const forArticle = [revision, ...revisions.filter((rev) => rev.articleSlug === revision.articleSlug)];
        const others = revisions.filter((rev) => rev.articleSlug !== revision.articleSlug);
        const pruned = forArticle.slice(0, MAX_REVISIONS_PER_ARTICLE);
        await writeJson(REVISIONS_FILE, [...pruned, ...others]);
      });
    },

    async getRevisionsBySlug(slug) {
      const revisions = await readJson<Revision[]>(REVISIONS_FILE, []);
      return revisions
        .filter((revision) => revision.articleSlug === slug)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async getRevision(slug, revisionId) {
      const revisions = await readJson<Revision[]>(REVISIONS_FILE, []);
      return revisions.find((revision) => revision.articleSlug === slug && revision.id === revisionId) ?? null;
    },

    async getRecentRevisions(limit) {
      const revisions = await readJson<Revision[]>(REVISIONS_FILE, []);
      return revisions
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    },

    async queryRevisions(query) {
      const needle = query.q?.trim().toLowerCase();
      const all = await readJson<Revision[]>(REVISIONS_FILE, []);
      const matched = all
        .filter((revision) => (query.slug ? revision.articleSlug === query.slug : true))
        .filter((revision) => (query.action ? revision.action === query.action : true))
        .filter((revision) => (query.author ? revision.author === query.author : true))
        .filter((revision) =>
          needle
            ? `${revision.snapshot.title}\n${revision.snapshot.summary}\n${revision.snapshot.content}`
                .toLowerCase()
                .includes(needle)
            : true,
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return {
        revisions: matched.slice(query.offset, query.offset + query.limit),
        total: matched.length,
      };
    },

    async getMeta(key) {
      const meta = await readJson<Record<string, string>>(META_FILE, {});
      const value = meta[key];
      return typeof value === "string" ? value : null;
    },

    async setMeta(key, value) {
      await enqueue(async () => {
        const meta = await readJson<Record<string, string>>(META_FILE, {});
        // Écriture atomique : un fichier temporaire puis un renommage, pour qu'une
        // coupure de courant ne laisse pas un `meta.json` tronqué (ce qui ferait
        // perdre la trace des contenus officiels déjà publiés).
        await fs.mkdir(DATA_DIR, { recursive: true });
        const temporary = `${META_FILE}.${process.pid}.tmp`;
        await fs.writeFile(temporary, JSON.stringify({ ...meta, [key]: value }, null, 2), "utf8");
        await fs.rename(temporary, META_FILE);
      });
    },
  };
}
