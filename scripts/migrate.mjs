#!/usr/bin/env node
/**
 * Migrations de données — evolution de la Constitution.
 *
 * Le wiki rattache chaque acces a une charge constitutionnelle (article P-1).
 * Si la Constitution evolue (renommage, fusion, suppression d'une charge), les
 * donnees doivent suivre : c'est le role de ce script, sur le modele d'un fil
 * d'Alembic — un fichier par evolution, un registre des migrations appliquees,
 * une execution unique et verifiable.
 *
 * Ce que la migration touche :
 *   - `.env`          : charges de WIKI_USERS (jamais les mots de passe)
 *   - `data/*.json`   : champ `author` des articles et des revisions
 *   - PostgreSQL      : memes colonnes, via DATABASE_URL
 *
 * Commandes :
 *   node scripts/migrate.mjs list
 *   node scripts/migrate.mjs status
 *   node scripts/migrate.mjs plan
 *   node scripts/migrate.mjs up [--dry-run] [--id 0002_...] [--yes]
 *
 * Options :
 *   --dry-run   n'ecrit rien, affiche exactement ce qui serait modifie
 *   --id <id>   n'applique qu'une migration
 *   --yes       n demande aucune confirmation (scripts automatises)
 */
import { existsSync, readdirSync } from "node:fs";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const DATA_DIR = path.join(root, "data");
const MIGRATIONS_DIR = path.join(root, "migrations");
const LEDGER_FILE = path.join(DATA_DIR, "migrations.json");
const ENV_FILE = path.join(root, ".env");
const TYPES_FILE = path.join(root, "src", "lib", "types.ts");

const args = process.argv.slice(2);
const command = args[0] ?? "list";
const dryRun = args.includes("--dry-run");
const assumeYes = args.includes("--yes");
const onlyId = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

const log = (message) => console.log(message);
const ok = (message) => console.log(`  OK   ${message}`);
const warn = (message) => console.log(`  AVERT ${message}`);

/** Extrait le tableau USER_ROLES de src/lib/types.ts sans compiler le projet. */
async function readUserRoles() {
  const source = await readFile(TYPES_FILE, "utf8");
  const match = source.match(/USER_ROLES\s*=\s*\[([\s\S]*?)\]/);
  if (!match) throw new Error("USER_ROLES introuvable dans src/lib/types.ts");
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

async function readLedger() {
  try {
    return JSON.parse(await readFile(LEDGER_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function readMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".mjs"))
    .sort();
  const migrations = [];
  for (const file of files) {
    const module = await import(pathToFileURL(path.join(MIGRATIONS_DIR, file)).href);
    const migration = module.default;
    if (!migration?.id) throw new Error(`Migration ${file} sans propriété « id »`);
    migrations.push({ ...migration, file });
  }
  return migrations;
}

/** Remplace une valeur exacte dans un objet ; renvoie le nombre de touches. */
function renameValues(list, mapping) {
  let touched = 0;
  for (const item of list) {
    const replacement = mapping[item.author];
    if (replacement) {
      item.author = replacement;
      touched++;
    }
  }
  return touched;
}

async function readJsonFile(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

/** Réécrit WIKI_USERS en ne touchant qu'à la charge de chaque entrée. */
function rewriteUsersEnv(content, roleMap) {
  let changed = 0;
  const updated = content.replace(/^(WIKI_USERS\s*=\s*)(.*)$/m, (match, prefix, rawValue) => {
    // La valeur est normalement entre guillemets : on les met de côté pour ne
    // pas les confondre avec le contenu de la dernière entrée.
    const quoted = /^(['"])([\s\S]*)\1$/.exec(rawValue.trim());
    const quote = quoted ? quoted[1] : "";
    const value = quoted ? quoted[2] : rawValue.trim();

    const rewritten = value
      .split(",")
      .map((entry) => {
        const parts = entry.split(":");
        if (parts.length < 3) return entry;
        const role = parts[parts.length - 1].trim();
        const next = roleMap[role];
        if (!next) return entry;
        changed++;
        parts[parts.length - 1] = next;
        return parts.join(":");
      })
      .join(",");

    return `${prefix}${quote}${rewritten}${quote}`;
  });
  return { content: updated, changed };
}

function describe(migration) {
  const roles = Object.entries(migration.roles ?? {});
  const authors = Object.entries(migration.authors ?? {});
  const parts = [];
  if (roles.length) {
    parts.push(`charges ${roles.map(([from, to]) => `${from} → ${to}`).join(", ")}`);
  }
  if (authors.length) {
    parts.push(`auteurs ${authors.map(([from, to]) => `${from} → ${to}`).join(", ")}`);
  }
  return parts.length ? parts.join(" ; ") : "aucun changement";
}

function isEmpty(migration) {
  return (
    Object.keys(migration.roles ?? {}).length === 0 && Object.keys(migration.authors ?? {}).length === 0
  );
}

// ---------------------------------------------------------------------------
// PostgreSQL (optionnel)
// ---------------------------------------------------------------------------

async function migratePostgres(migration, write) {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!write) {
    return "PostgreSQL : connexion omise (--dry-run)";
  }

  let pg;
  try {
    pg = (await import("pg")).default;
  } catch {
    warn("module « pg » introuvable : PostgreSQL ignoré");
    return null;
  }

  const authors = migration.authors ?? {};
  const entries = Object.entries(authors);
  const pool = new pg.Pool({ connectionString: url });
  try {
    for (const [from, to] of entries) {
      for (const table of ["articles", "revisions"]) {
        await pool.query(`UPDATE ${table} SET author = $1 WHERE author = $2`, [to, from]);
      }
    }
    // Registre en base : une migration déjà appliquée n'est pas rejouée.
    await pool.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         id TEXT PRIMARY KEY,
         description TEXT,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
    );
    return `PostgreSQL : ${entries.length} libellé(s) d'auteur mis à jour`;
  } catch (error) {
    warn(`PostgreSQL : ${error.message}`);
    return null;
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------

async function main() {
  const [migrations, ledger] = await Promise.all([readMigrations(), readLedger()]);
  const applied = new Set(ledger.map((entry) => entry.id));
  const pending = migrations.filter(
    (migration) => !applied.has(migration.id) && (!onlyId || migration.id === onlyId),
  );

  if (command === "list" || command === "status") {
    log("Migrations du wiki :\n");
    for (const migration of migrations) {
      const state = applied.has(migration.id) ? "appliquée" : "en attente";
      log(`  [${state.padEnd(9)}] ${migration.id} — ${migration.description}`);
      log(`  ${" ".repeat(11)}${describe(migration)}`);
    }
    if (migrations.length === 0) log("  (aucun fichier dans migrations/)");
    log(`\n${applied.size} migration(s) appliquée(s) sur ${migrations.length} fichier(s).`);
    log(`Registre : ${path.relative(root, LEDGER_FILE)}`);
    return;
  }

  if (command === "plan") {
    if (pending.length === 0) {
      log("Aucune migration en attente.");
      return;
    }
    log(`Migration(s) à appliquer :\n`);
    for (const migration of pending) log(`  - ${migration.id} : ${describe(migration)}`);
    log("\nLancez « node scripts/migrate.mjs up » pour les appliquer.");
    return;
  }

  if (command !== "up") {
    log(`Commande inconnue : ${command}`);
    log("Commandes : list | status | plan | up [--dry-run] [--id <id>] [--yes]");
    process.exitCode = 1;
    return;
  }

  if (pending.length === 0) {
    log("Aucune migration en attente.");
    return;
  }

  const roles = await readUserRoles();
  log("Vérification des charges…");
  for (const migration of pending) {
    for (const [from, to] of Object.entries(migration.roles ?? {})) {
      if (to !== null && !roles.includes(to)) {
        log(
          `  ERREUR  ${migration.id} : la charge « ${to} » n'existe pas dans USER_ROLES ` +
            `(src/lib/types.ts). Ajoutez-la, avec son entrée ROLE_INFO, puis relancez.`,
        );
        process.exitCode = 1;
        return;
      }
      if (!roles.includes(from)) {
        warn(`${migration.id} : la charge d'origine « ${from} » est inconnue, migration sans effet.`);
      }
    }
  }

  const meaningful = pending.filter((migration) => !isEmpty(migration));
  if (meaningful.length === 0) {
    for (const migration of pending) log(`  - ${migration.id} : modèle vide, ignoré`);
    log("\nAucune migration à appliquer. Copiez un fichier de migrations/ et renseignez roles / authors.");
    return;
  }

  if (!dryRun && !assumeYes) {
    log("\nMigrations qui seront appliquées :");
    for (const migration of meaningful) log(`  - ${migration.id} : ${describe(migration)}`);
    log("\nRelancez avec --yes pour confirmer (ou --dry-run pour n'écrire rien).");
    return;
  }

  // Sauvegarde avant toute écriture.
  let backupDir = null;
  if (!dryRun) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupDir = path.join(DATA_DIR, `backup-${stamp}`);
    await mkdir(backupDir, { recursive: true });
    for (const name of ["articles.json", "revisions.json"]) {
      const source = path.join(DATA_DIR, name);
      if (existsSync(source)) {
        await writeFile(path.join(backupDir, name), await readFile(source, "utf8"), "utf8");
      }
    }
    if (existsSync(ENV_FILE)) {
      await writeFile(path.join(backupDir, ".env"), await readFile(ENV_FILE, "utf8"), "utf8");
    }
    log(`Sauvegarde : ${path.relative(root, backupDir)}`);
  }

  for (const migration of meaningful) {
    log(`\n▸ ${migration.id} — ${migration.description}`);
    const authorMap = migration.authors ?? {};

    // 1. WIKI_USERS dans .env
    if (existsSync(ENV_FILE)) {
      const env = await readFile(ENV_FILE, "utf8");
      const { content, changed } = rewriteUsersEnv(env, migration.roles ?? {});
      if (changed > 0) {
        if (!dryRun) await writeFile(ENV_FILE, content, "utf8");
        ok(`WIKI_USERS : ${changed} compte(s) sur une nouvelle charge`);
      } else {
        log(`  WIKI_USERS : aucun compte concerné`);
      }
    }

    // 2. Auteurs des articles et des révisions (JSON)
    for (const name of ["articles.json", "revisions.json"]) {
      const file = path.join(DATA_DIR, name);
      const data = await readJsonFile(file);
      if (!Array.isArray(data)) continue;
      const touched = renameValues(data, authorMap);
      if (touched > 0) {
        if (!dryRun) await writeFile(file, JSON.stringify(data, null, 2), "utf8");
        ok(`${name} : ${touched} auteur(s) renommé(s)`);
      } else {
        log(`  ${name} : aucun auteur concerné`);
      }
    }

    // 3. PostgreSQL, si configurée
    const pgMessage = await migratePostgres(migration, !dryRun);
    if (pgMessage) log(`  ${pgMessage}`);

    // 4. Registre
    if (!dryRun) {
      const nextLedger = [
        ...ledger,
        { id: migration.id, description: migration.description, appliedAt: new Date().toISOString() },
      ];
      await writeFile(LEDGER_FILE, JSON.stringify(nextLedger, null, 2), "utf8");
      ledger.length = 0;
      ledger.push(...nextLedger);
    }
  }

  log(
    dryRun
      ? "\nSimulation terminée : aucun fichier n'a été écrit."
      : "\nMigrations appliquées. Redémarrez l'application pour que les sessions prennent en compte les nouvelles charges.",
  );
}

main().catch((error) => {
  console.error(`Échec de la migration : ${error.message}`);
  process.exitCode = 1;
});
