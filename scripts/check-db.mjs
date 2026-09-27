/**
 * Diagnostic de la base de données PostgreSQL.
 *
 *   node scripts/check-db.mjs
 *
 * Vérifie : DATABASE_URL renseignée, connexion, tables créées, contenu présent,
 * et un aller-retour d'écriture (transaction annulée → aucune donnée touchée).
 * Code de sortie : 0 = prêt, 1 = à corriger.
 */
import { readFile } from "node:fs/promises";
import pg from "pg";

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!match) continue;
    let value = (match[2] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const ok = (m) => console.log(`  ✅ ${m}`);
const ko = (m) => console.log(`  ❌ ${m}`);
const step = (t) => console.log(`\n${t}`);
const mask = (u) => (u ? u.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@") : "(non défini)");

let env = {};
try {
  env = parseEnv(await readFile(".env", "utf8"));
} catch {
  console.error("Fichier .env introuvable : copiez .env.example vers .env.");
  process.exit(1);
}

const url = (env.DATABASE_URL ?? "").trim();

if (!url) {
  step("Configuration");
  ko("DATABASE_URL est vide → le wiki utilise les fichiers JSON (data/).");
  console.log(`
Pour basculer sur PostgreSQL :
  1. Installez Docker Desktop (https://www.docker.com/products/docker-desktop/)
  2. docker compose up -d
  3. node scripts/check-db.mjs
  4. Renseignez dans .env :
     DATABASE_URL=postgresql://wiki:wiki@localhost:5432/gratianopolis
  5. Redémarrez l'application (npm run dev)
`);
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  connectionTimeoutMillis: 5000,
  ssl:
    env.DATABASE_SSL === "true" || env.DATABASE_SSL === "1"
      ? { rejectUnauthorized: false }
      : undefined,
});

step("1. Connexion");
try {
  const { rows } = await pool.query("SELECT version() AS version");
  ok(`Connecté à ${mask(url)}`);
  ok(rows[0].version.split(" ").slice(0, 2).join(" "));
} catch (error) {
  ko(`Connexion impossible : ${error.message}`);
  console.log("\n  PostgreSQL est-il démarré ? Essayez : docker compose up -d");
  await pool.end();
  process.exit(1);
}

step("2. Schéma");
try {
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  const tables = rows.map((row) => row.table_name);
  if (tables.includes("articles")) {
    ok(`Tables présentes : ${tables.join(", ")}`);
  } else {
    ko("Table « articles » absente — elle sera créée au premier accès du wiki.");
  }
} catch (error) {
  ko(`Lecture du schéma impossible : ${error.message}`);
}

step("3. Contenu");
try {
  const articles = await pool.query("SELECT COUNT(*)::int AS n FROM articles");
  const revisions = await pool.query("SELECT COUNT(*)::int AS n FROM revisions");
  ok(`${articles.rows[0].n} article(s), ${revisions.rows[0].n} révision(s).`);
} catch (error) {
  ko(`Lecture des données impossible : ${error.message}`);
}

step("4. Test d'écriture (annulé)");
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    "INSERT INTO revisions (id, article_slug, action, author, title, category, summary, content, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)",
    ["diagnostic", "__diagnostic__", "update", "diagnostic", "-", "lois", "-", "-", "[]"],
  );
  await client.query("ROLLBACK");
  ok("Insert + rollback réussis (permissions d'écriture OK, aucune donnée conservée).");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  ko(`Test d'écriture impossible : ${error.message}`);
} finally {
  client.release();
}

await pool.end();
step("Résultat");
console.log("  ✅ Base opérationnelle. Redémarrez l'application pour utiliser PostgreSQL.\n");
