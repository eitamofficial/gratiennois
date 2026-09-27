import { Pool, type QueryResultRow } from "pg";
import type { Article, ArticleInfobox, Revision } from "../types";
import type { StorageDriver } from "./types";
import { StorageUnavailableError, maskDatabaseUrl } from "./errors";
import { isEphemeralRuntime } from "./environment";
import { toSeedRevision } from "./json-driver";

const MAX_REVISIONS_PER_ARTICLE = 50;

interface ArticleRow {
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string[] | null;
  author: string | null;
  discord_user_id: string | null;
  infobox: ArticleInfobox | null;
  status: string | null;
  origin: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface RevisionRow {
  id: string;
  article_slug: string;
  action: string;
  author: string | null;
  created_at: Date | string;
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string[] | null;
  infobox: ArticleInfobox | null;
}

function mapArticle(row: ArticleRow): Article {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category as Article["category"],
    summary: row.summary,
    content: row.content,
    tags: row.tags ?? [],
    author: row.author ?? "",
    discordUserId: row.discord_user_id ?? undefined,
    infobox: row.infobox ?? undefined,
    status: (row.status as Article["status"]) ?? undefined,
    origin: (row.origin as Article["origin"]) ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapRevision(row: RevisionRow): Revision {
  return {
    id: row.id,
    articleSlug: row.article_slug,
    action: row.action as Revision["action"],
    author: row.author ?? "",
    createdAt: new Date(row.created_at).toISOString(),
    snapshot: {
      title: row.title,
      category: row.category as Article["category"],
      summary: row.summary,
      content: row.content,
      tags: row.tags ?? [],
      infobox: row.infobox ?? undefined,
    },
  };
}

/** Message d'erreur lisible : inclut le code (ECONNREFUSED, 28P01…) quand pg ne fournit rien. */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return [error.message, code].filter(Boolean).join(" ") || error.name;
  }
  return String(error);
}

/**
 * Le TLS est-il nécessaire pour cette base ?
 *
 * Les hébergeurs managés (Neon, Supabase, Railway…) l'**exigent**, et
 * l'ignorer fait échouer la connexion par erreur de certificat. Un PostgreSQL
 * local, lui, ne le supporte généralement pas et répond « The server does not
 * support SSL connections ».
 *
 * Activer TLS par défaut cassait donc le développement local : le site ne
 * répondait plus du tout. Le bon défaut n'est donc ni « activé » ni
 * « désactivé », c'est **« selon l'hôte »** : on l'active pour tout ce qui
 * sort de la machine, et on le coupe pour une base locale. `DATABASE_SSL`
 * permet de trancher dans les deux sens quand le cas est ambigu.
 */
function sslRequis(): boolean {
  const url = process.env.DATABASE_URL;
  if (process.env.DATABASE_SSL === "false" || process.env.DATABASE_SSL === "0") return false;
  if (process.env.DATABASE_SSL === "true" || process.env.DATABASE_SSL === "1") return true;
  if (!url) return true;
  try {
    const { hostname } = new URL(url);
    // `localhost`, `127.0.0.1`, `::1`, le nom du service Docker : tout ce qui
    // reste sur la machine.
    return !(
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname === "db" ||
      hostname === "postgres"
    );
  } catch {
    return true;
  }
}

function poolOptions() {
  return {
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: Number(process.env.DATABASE_TIMEOUT_MS ?? 5000),
    // Sur Vercel, une fonction qui se Réchauffe réutilise le même processus : un
    // pool de 10 connexions par invocation ouvrirait handfuls de connexions vers
    // la base et épuiserait vite le quota de l'hébergeur. Le pool est donc petit
    // et surtout conservé d'une invocation à l'autre (voir `globalForPg`).
    max: Number(process.env.DATABASE_POOL_MAX ?? (isEphemeralRuntime() ? 2 : 10)),
    idleTimeoutMillis: 30_000,
    // Une connexion TLS se ferme avec la fonction : la garder ouverte ne sert à
    // rien et le serveur du fournisseur finit par la tuer.
    idle_in_transaction_session_timeout: Number(
      process.env.DATABASE_IDLE_TX_TIMEOUT ?? 10_000,
    ),
    // Voir `sslRequis` : TLS pour les bases distantes, pas de TLS pour une base
    // locale, et `DATABASE_SSL` pour trancheur.
    ssl: sslRequis() ? { rejectUnauthorized: false } : undefined,
  };
}

/**
 * Pool partagé entre les invocations d'une même fonction chaude.
 *
 * `createPgDriver` est appelé une seule fois par processus (le magasin est
 * mémoïsé), mais conserver le pool sur `globalThis` protège le cas où le module
 * serait ré-évalué : sans cela, chaque réinitialisation ouvrirait un nouveau
 * pool sans jamais fermer l'ancien, et les connexionsfuient jusqu'à épuiser le
 * quota de la base.
 */
const globalForPg = globalThis as unknown as { __wikiPgPool?: Pool };

function sharedPool(): Pool {
  if (!globalForPg.__wikiPgPool) {
    const pool = new Pool(poolOptions());
    // Un client inactif qui échoue ne doit pas faire tomber le processus Node.
    pool.on("error", (error: Error) => {
      console.error("[postgres] erreur sur un client inactif :", error.message);
    });
    globalForPg.__wikiPgPool = pool;
  }
  return globalForPg.__wikiPgPool;
}

export function createPgDriver(): StorageDriver {
  const pool = sharedPool();

  /** Exécute une requête en transformant les échecs en erreur explicite et actionnable. */
  async function run<T extends QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ) {
    try {
      return await pool.query<T>(text, params as never[]);
    } catch (error) {
      throw new StorageUnavailableError(
        `Base de données inaccessible via ${maskDatabaseUrl(process.env.DATABASE_URL)} : ${describeError(error)}. ` +
          "Vérifiez que PostgreSQL est démarré (docker compose up -d) et que DATABASE_URL est correct.",
        error,
      );
    }
  }

  let initPromise: Promise<void> | null = null;

  return {
    name: "postgres",

    init(seed) {
      if (!initPromise) {
        initPromise = (async () => {
          await run(`
            CREATE TABLE IF NOT EXISTS articles (
              slug TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              category TEXT NOT NULL,
              summary TEXT NOT NULL,
              content TEXT NOT NULL,
              tags JSONB NOT NULL DEFAULT '[]',
              author TEXT NOT NULL DEFAULT '',
              discord_user_id TEXT,
              infobox JSONB,
              created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS revisions (
              id TEXT PRIMARY KEY,
              article_slug TEXT NOT NULL,
              action TEXT NOT NULL,
              author TEXT NOT NULL DEFAULT '',
              title TEXT NOT NULL,
              category TEXT NOT NULL,
              summary TEXT NOT NULL,
              content TEXT NOT NULL,
              tags JSONB NOT NULL DEFAULT '[]',
              infobox JSONB,
              created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS revisions_article_slug_idx
              ON revisions (article_slug, created_at DESC);

            -- Ajout de colonne sur une base déjà existante : IF NOT EXISTS rend
            -- l'opération idempotente, elle peut être rejouée à chaque démarrage.
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS infobox JSONB;
            ALTER TABLE revisions ADD COLUMN IF NOT EXISTS infobox JSONB;
            -- État de publication : une proposition de l'intelligence artificielle
            -- est enregistrée comme un article, mais reste invisible du public
            -- tant qu'un rédacteur ne l'a pas validée.
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS status TEXT;
            ALTER TABLE articles ADD COLUMN IF NOT EXISTS origin TEXT;

            -- Métadonnées techniques (clé/valeur) : trace du contenu officiel
            -- publié, afin de distinguer un article intact d'un article retouché
            -- par un rédacteur. Jamais exposées publiquement.
            CREATE TABLE IF NOT EXISTS wiki_meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
          `);

          const { rows } = await run<{ n: number }>("SELECT COUNT(*)::int AS n FROM articles");
          if (rows[0]?.n === 0) {
            for (const article of seed) {
              await run(
                `INSERT INTO articles
                   (slug, title, category, summary, content, tags, author, discord_user_id, infobox, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10, $11)
                 ON CONFLICT (slug) DO NOTHING`,
                [
                  article.slug,
                  article.title,
                  article.category,
                  article.summary,
                  article.content,
                  JSON.stringify(article.tags),
                  article.author,
                  article.discordUserId ?? null,
                  article.infobox ? JSON.stringify(article.infobox) : null,
                  article.createdAt,
                  article.updatedAt,
                ],
              );
            }
            console.log(`[postgres] ${seed.length} articles de lancement insérés.`);

            // Révision initiale par article : la comparaison de versions a une base.
            for (const article of seed) {
              const revision = toSeedRevision(article);
              await run(
                `INSERT INTO revisions
                   (id, article_slug, action, author, title, category, summary, content, tags, infobox, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11)
                 ON CONFLICT (id) DO NOTHING`,
                [
                  revision.id,
                  revision.articleSlug,
                  revision.action,
                  revision.author,
                  revision.snapshot.title,
                  revision.snapshot.category,
                  revision.snapshot.summary,
                  revision.snapshot.content,
                  JSON.stringify(revision.snapshot.tags),
                  revision.snapshot.infobox ? JSON.stringify(revision.snapshot.infobox) : null,
                  revision.createdAt,
                ],
              );
            }
          }
        })().catch((error) => {
          // On Allows une nouvelle tentative au prochain appel : indispensable si
          // PostgreSQL démarre après l'application.
          initPromise = null;
          throw error;
        });
      }
      return initPromise;
    },

    async countArticles() {
      const { rows } = await run<{ n: number }>("SELECT COUNT(*)::int AS n FROM articles");
      return rows[0]?.n ?? 0;
    },

    async getAllArticles() {
      const { rows } = await run<ArticleRow>("SELECT * FROM articles ORDER BY updated_at DESC");
      return rows.map(mapArticle);
    },

    async getArticleBySlug(slug) {
      const { rows } = await run<ArticleRow>("SELECT * FROM articles WHERE slug = $1", [slug]);
      return rows[0] ? mapArticle(rows[0]) : null;
    },

    async createArticle(article) {
      await run(
        `INSERT INTO articles
           (slug, title, category, summary, content, tags, author, discord_user_id, infobox, status, origin, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10, $11, $12, $13)`,
        [
          article.slug,
          article.title,
          article.category,
          article.summary,
          article.content,
          JSON.stringify(article.tags),
          article.author,
          article.discordUserId ?? null,
          article.infobox ? JSON.stringify(article.infobox) : null,
          article.status ?? null,
          article.origin ?? null,
          article.createdAt,
          article.updatedAt,
        ],
      );
    },

    async updateArticle(article) {
      await run(
        `UPDATE articles
         SET title = $2, category = $3, summary = $4, content = $5, tags = $6::jsonb,
             author = $7, discord_user_id = $8, infobox = $9::jsonb,
             status = $10, origin = $11, updated_at = now()
         WHERE slug = $1`,
        [
          article.slug,
          article.title,
          article.category,
          article.summary,
          article.content,
          JSON.stringify(article.tags),
          article.author,
          article.discordUserId ?? null,
          article.infobox ? JSON.stringify(article.infobox) : null,
          article.status ?? null,
          article.origin ?? null,
        ],
      );
    },

    async deleteArticle(slug) {
      const result = await run("DELETE FROM articles WHERE slug = $1", [slug]);
      return (result.rowCount ?? 0) > 0;
    },

    async setDiscordUserIds(mapping) {
      for (const [slug, discordUserId] of Object.entries(mapping)) {
        await run("UPDATE articles SET discord_user_id = $2 WHERE slug = $1", [
          slug,
          discordUserId,
        ]);
      }
    },

    async addRevision(revision) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO revisions
             (id, article_slug, action, author, title, category, summary, content, tags, infobox, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11)`,
          [
            revision.id,
            revision.articleSlug,
            revision.action,
            revision.author,
            revision.snapshot.title,
            revision.snapshot.category,
            revision.snapshot.summary,
            revision.snapshot.content,
            JSON.stringify(revision.snapshot.tags),
            revision.snapshot.infobox ? JSON.stringify(revision.snapshot.infobox) : null,
            revision.createdAt,
          ],
        );
        await client.query(
          `DELETE FROM revisions
           WHERE article_slug = $1 AND id NOT IN (
             SELECT id FROM revisions
             WHERE article_slug = $1
             ORDER BY created_at DESC LIMIT $2
           )`,
          [revision.articleSlug, MAX_REVISIONS_PER_ARTICLE],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw new StorageUnavailableError(
          `Écriture impossible dans PostgreSQL (${maskDatabaseUrl(process.env.DATABASE_URL)}) : ${describeError(error)}.`,
          error,
        );
      } finally {
        client.release();
      }
    },

    async getRevisionsBySlug(slug) {
      const { rows } = await run<RevisionRow>(
        "SELECT * FROM revisions WHERE article_slug = $1 ORDER BY created_at DESC LIMIT $2",
        [slug, MAX_REVISIONS_PER_ARTICLE],
      );
      return rows.map(mapRevision);
    },

    async getRevision(slug, revisionId) {
      const { rows } = await run<RevisionRow>(
        "SELECT * FROM revisions WHERE article_slug = $1 AND id = $2",
        [slug, revisionId],
      );
      return rows[0] ? mapRevision(rows[0]) : null;
    },

    async getRecentRevisions(limit) {
      const { rows } = await run<RevisionRow>(
        "SELECT * FROM revisions ORDER BY created_at DESC LIMIT $1",
        [limit],
      );
      return rows.map(mapRevision);
    },

    async queryRevisions({ slug, q, action, author, limit, offset }) {
      // Filtres construits dynamiquement : la pagination est appliquée par
      // PostgreSQL, jamais en mémoire, pour tenir quand l'historique grossit.
      const conditions: string[] = [];
      const values: unknown[] = [];
      const add = (clause: string, value: unknown) => {
        values.push(value);
        conditions.push(clause.replace("?", `$${values.length}`));
      };

      if (slug) add("article_slug = ?", slug);
      if (action) add("action = ?", action);
      if (author) add("author = ?", author);
      if (q?.trim()) {
        const needle = `%${q.trim().toLowerCase()}%`;
        values.push(needle);
        const index = `$${values.length}`;
        conditions.push(
          `(lower(title) LIKE ${index} OR lower(summary) LIKE ${index} OR lower(content) LIKE ${index})`,
        );
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const { rows: totals } = await run<{ count: string }>(
        `SELECT COUNT(*) AS count FROM revisions ${where}`,
        values,
      );
      values.push(limit, offset);
      const { rows } = await run<RevisionRow>(
        `SELECT * FROM revisions ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );

      return { revisions: rows.map(mapRevision), total: Number(totals[0]?.count ?? 0) };
    },

    async getMeta(key) {
      const { rows } = await run<{ value: string }>(
        "SELECT value FROM wiki_meta WHERE key = $1",
        [key],
      );
      return rows[0]?.value ?? null;
    },

    async setMeta(key, value) {
      await run(
        `INSERT INTO wiki_meta (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, value],
      );
    },
  };
}
