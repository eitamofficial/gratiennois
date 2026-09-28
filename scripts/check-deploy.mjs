#!/usr/bin/env node
/**
 * Contrôle de préparation au déploiement.
 *
 * Un déploiement Vercel échoue rarement au moment du build : c'est **après**,
 * une fois le site « en ligne », que l'on découvre que la base de données
 * manquait et que le wiki affiche zéro article. Ce script vérifie la
 * configuration *avant* de pousser, sur la machine ou en local.
 *
 * Il est volontairement plus strict que le simple build : il vérifie ce qu'un
 * build ne peut pas savoir — la présence des variables d'environnement, la
 * cohérence du contenu, l'accès à la base.
 *
 * Usage :
 *   node scripts/check-deploy.mjs            # lecture de .env, mode rapport
 *   node scripts/check-deploy.mjs --strict   # échoue sur les avertissements
 *   node scripts/check-deploy.mjs --env=production  # n'utilise que l'environnement
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");
// `--env` (sans valeur) et `--env=<nom>` sont tous deux acceptés. La forme
// avec `=` seule ne reconnaissait pas le drapeau tel qu'il est écrit dans
// `vercel.json` : le fichier local était donc chargé malgré le drapeau, et le
// contrôle simulait l'environnement de build en y injectant les variables du
// poste de développement — masquant un blocage réel.
const ONLY_ENV = process.argv.some((a) => a === "--env" || a.startsWith("--env="));
const VERBOSE = process.argv.includes("--verbose");
// `--rapport` affiche le contrôle sans bloquer.
//
// Ce mode existe parce que `vercel.json` enchaîne ce script avant le build :
// une variable manquante faisait échouer le déploiement, et le journal Vercel
// s'arrêtait sur la ligne de commande — sans jamais laisser voir la raison. Un
// garde-fou muet est pire qu'absent : on croyait à une panne du build, alors
// que le code était sain et que seule la configuration manquait.
//
// En mode rapport, le diagnostic reste dans le journal de build — c'est
// souvent le seul endroit où on le cherchera — et le site se déploie. Les
// variables se définissent ensuite dans Settings → Environment Variables, sans
// redéclencher un build. `npm run check:deploy` reste bloquant, et c'est
// volontairement le mode par défaut en local : sur une machine de
// développement, un secret manquant est une faute qu'il vaut mieux voir tout
// de suite.
const RAPPORT = process.argv.includes("--rapport");

/** Charge `.env` (et `.env.production` s'il existe) sans dépendance externe. */
function loadEnv() {
  for (const name of [".env.production", ".env.local", ".env"]) {
    const file = path.join(ROOT, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (process.env[key] === undefined) {
        process.env[key] = value.replace(/^["']|["']$/g, "").trim();
      }
    }
  }
}

if (!ONLY_ENV) loadEnv();

const problems = [];
const warnings = [];
const notes = [];

function problem(code, message, variable) {
  problems.push({ code, message, variable });
}
function warn(code, message, variable) {
  warnings.push({ code, message, variable });
}
function note(code, message) {
  notes.push({ code, message });
}

const val = (key) => (process.env[key] ?? "").trim();
const isVercel = Boolean(val("VERCEL") || val("VERCEL_ENV"));

// ---------------------------------------------------------------------------
// 1. Stockage — le point bloquant du déploiement Vercel
// ---------------------------------------------------------------------------
const databaseUrl = val("DATABASE_URL");
if (!databaseUrl) {
  if (isVercel) {
    problem(
      "DATABASE_URL_MANQUANTE",
      "Déploiement Vercel sans base de données : chaque invocation reçoit un système de fichiers distinct et en lecture seule. Le wiki s'afficherait vide et toute édition serait perdue.",
      "DATABASE_URL",
    );
  } else {
    warn(
      "DATABASE_URL_MANQUANTE",
      "Stockage sur fichiers JSON. C'est valide en développement ; sur un déploiement, ces fichiers disparaissent.",
      "DATABASE_URL",
    );
  }
} else if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  problem(
    "DATABASE_URL_INVALIDE",
    "DATABASE_URL ne commence pas par postgres:// ou postgresql://.",
    "DATABASE_URL",
  );
} else {
  note("DATABASE_URL", "PostgreSQL configuré — le contenu sera durable.");

  // Un hébergeur managé impose TLS ; `pg` échoue à la connexion sans.
  const sslDesactive = val("DATABASE_SSL") === "false" || val("DATABASE_SSL") === "0";
  const hebergeurGere = /neon\.tech|supabase\.(co|com)|railway\.app|azure\.com|amazonaws\.com|databases\.azure/i.test(
    databaseUrl,
  );
  if (hebergeurGere && sslDesactive) {
    problem(
      "SSL_DESACTIVE",
      "Cette base est un service managé qui exige TLS, mais DATABASE_SSL=false. La connexion échouera.",
      "DATABASE_SSL",
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Secrets d'édition
// ---------------------------------------------------------------------------
const authSecret = val("AUTH_SECRET");
if (!authSecret) {
  problem(
    "AUTH_SECRET_MANQUANT",
    "Aucun secret de session : l'authentification de l'espace d'édition ne peut pas être signée.",
    "AUTH_SECRET",
  );
} else if (authSecret.length < 32) {
  problem(
    "AUTH_SECRET_COURT",
    `AUTH_SECRET ne fait que ${authSecret.length} caractères ; 32 minimum sont attendus.`,
    "AUTH_SECRET",
  );
}

const users = val("WIKI_USERS");
if (!users) {
  warn("WIKI_USERS_VIDE", "Aucun compte d'édition défini : personne ne pourra rédiger.", "WIKI_USERS");
} else {
  const comptes = users.split(",").map((entry) => entry.trim()).filter(Boolean);
  const sansMotDePasse = comptes.filter((entry) => entry.split(":")[1]?.length < 8);
  if (sansMotDePasse.length > 0) {
    warn(
      "MOT_DE_PASSE_FAIBLE",
      `${sansMotDePasse.length} compte(s) ont un mot de passe de moins de 8 caractères.`,
      "WIKI_USERS",
    );
  }
  const enClair = comptes.filter((entry) => {
    const [, , charge] = entry.split(":");
    return charge === undefined;
  });
  if (enClair.length > 0) {
    problem(
      "WIKI_USERS_MAL_FORME",
      `${enClair.length} entrée(s) n'ont pas le format identifiant:motdepasse:charge.`,
      "WIKI_USERS",
    );
  } else {
    note("WIKI_USERS", `${comptes.length} compte(s) d'édition configuré(s).`);
  }
  const adminFallback = val("ADMIN_PASSWORD");
  if (!users && adminFallback) {
    problem("ADMIN_PASSWORD_ACTIF", "ADMIN_PASSWORD est actif : c'est le repli de secours, à désactiver en production.", "ADMIN_PASSWORD");
  }
}

// ---------------------------------------------------------------------------
// 3. Identité du site
// ---------------------------------------------------------------------------
// L'URL publique est déduite de l'environnement Vercel lorsqu'elle n'est pas
// fournie (voir `src/lib/site-url.ts`) : la variable n'a donc pas besoin d'être
// renseignée à la main, et son absence n'est pas un blocage.
const siteUrlExplicite = val("SITE_URL");
const siteUrl =
  siteUrlExplicite ||
  (val("VERCEL_PROJECT_PRODUCTION_URL") ? `https://${val("VERCEL_PROJECT_PRODUCTION_URL")}` : "") ||
  (val("VERCEL_URL") ? `https://${val("VERCEL_URL")}` : "");

if (!siteUrl) {
  // La sévérité dépend du contexte, et c'est la seule distinction qui compte.
  // Sur Vercel, l'absence d'URL est un vrai blocage : les liens produits
  // pointteraient sur localhost. **En local**, c'est l'état normal — on
  // développe justement sur `localhost:3000`. Signaler cela comme bloquant
  // rendait `npm run check:deploy` rouge sur la machine du développeur alors
  // que le déploiement était parfaitement sain.
  if (isVercel) {
    problem(
      "SITE_URL_MANQUANTE",
      "Sur Vercel, ni SITE_URL ni VERCEL_PROJECT_PRODUCTION_URL ne sont définies : le sitemap, OpenGraph et les partages sociaux produiraient des liens en localhost. Définissez SITE_URL.",
      "SITE_URL",
    );
  } else {
    warn(
      "SITE_URL_MANQUANTE",
      "Développement local : l'URL publique est localhost, ce qui est normal ici. Sur Vercel, l'URL est déduite de l'environnement ; SITE_URL n'est nécessaire que pour un domaine personnalisé.",
      "SITE_URL",
    );
  }
} else {
  try {
    const parsed = new URL(siteUrl);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      warn("SITE_URL_LOCALE", "L'URL publique pointe sur localhost.", "SITE_URL");
    } else if (parsed.protocol !== "https:") {
      warn("SITE_URL_NON_HTTPS", "L'URL publique n'est pas en HTTPS.", "SITE_URL");
    } else {
      note(
        "SITE_URL",
        `${siteUrl}${siteUrlExplicite ? "" : " (déduite de l'environnement Vercel)"}`,
      );
    }
  } catch {
    // Une URL *définie mais invalide* est toujours bloquante : le résultat
    // sera un lien cassé, que l'on soit en local ou non.
    problem("SITE_URL_INVALIDE", "SITE_URL n'est pas une URL valide.", "SITE_URL");
  }
}

// ---------------------------------------------------------------------------
// 4. Fonctionsalités optionnelles
// ---------------------------------------------------------------------------
if (!val("DISCORD_BOT_TOKEN") || !val("DISCORD_GUILD_ID")) {
  warn(
    "DISCORD_NON_CONFIGURE",
    "Discord non configuré : portraits et rôles figés, sans mise à jour automatique.",
    "DISCORD_BOT_TOKEN",
  );
}
if (!val("GEMINI_API_KEY")) {
  warn(
    "GEMINI_NON_CONFIGURE",
    "Clé Gemini absente : l'analyse automatique des salons de parti reste inactive.",
    "GEMINI_API_KEY",
  );
}

// CRON_SECRET est obligatoire dès qu'une tâche planifiée est déclarée.
const vercelJson = path.join(ROOT, "vercel.json");
if (existsSync(vercelJson)) {
  const config = JSON.parse(readFileSync(vercelJson, "utf8"));
  const crons = config.crons ?? [];
  if (crons.length > 0 && !val("CRON_SECRET")) {
    // Une tâche planifiée sans secret ne doit pas rester silencieuse : elle
    // échouerait en 401 à chaque déclenchement, sans que personne ne s'en
    // aperçoive avant des semaines.
    //
    // Le message dépend de l'hôte. Sur Vercel, c'est l'horloge de la plateforme
    // qui déclenchera la tâche ; ailleurs, `vercel.json` est un fichier inerte et
    // c'est le planificateur de la machine qui s'en charge. Citer l'horloge
    // Vercel à un hébergeur maison l'enverrait chercher une variable dans le
    // mauvais endroit, alors qu'il en a besoin pour une tout autre raison.
    problem(
      "CRON_SECRET_MANQUANT",
      isVercel
        ? `vercel.json déclare ${crons.length} tâche(s) planifiée(s), mais CRON_SECRET n'est pas défini : elles échoueront toutes en 401. Ajoutez la variable CRON_SECRET dans Settings → Environment Variables, ou retirez la section "crons" de vercel.json pour désactiver la planification.`
        : `La synchronisation Discord doit être déclenchée périodiquement, ce qu'un hébergeur maison fait avec son propre planificateur. Sans CRON_SECRET, tout appel à /api/cron/discord répond 503. Définissez la variable, et faites-la appeler par votre planificateur (voir deploy/termux).`,
      "CRON_SECRET",
    );
  }
  if (crons.length > 0) {
    const existe = crons.every((c) => existsSync(path.join(ROOT, "src", "app", c.path.replace(/^\//, ""), "route.ts")));
    if (!existe) {
      problem("CRON_ROUTE_ABSENTE", "Une tâche planifiée pointe vers une route inexistante dans src/app.");
    } else {
      note("CRONS", crons.map((c) => `${c.path} (${c.schedule})`).join(", "));
    }
  }
  if (config.installCommand === "npm ci" && !existsSync(path.join(ROOT, "package-lock.json"))) {
    problem("LOCKFILE_ABSENT", "vercel.json utilise « npm ci » mais package-lock.json est absent : le build échouera.");
  }
}

// ---------------------------------------------------------------------------
// 5. Contenu et fichiers de versionnement
// ---------------------------------------------------------------------------
for (const fichier of ["vercel.json", ".env.example", "next.config.mjs"]) {
  if (!existsSync(path.join(ROOT, fichier))) {
    warn("FICHIER_ABSENT", `${fichier} est absent du dépôt.`, fichier);
  }
}

const articlesFile = path.join(ROOT, "data", "articles.json");
if (existsSync(articlesFile)) {
  const articles = JSON.parse(readFileSync(articlesFile, "utf8"));
  const publie = articles.filter((a) => a.status !== "proposition" && a.status !== "brouillon");
  if (articles.length === 0) {
    problem("CONTENU_VIDE", "data/articles.json est vide : le wiki s'afficherait sans aucun article.");
  } else {
    note("CONTENU", `${articles.length} article(s), dont ${publie.length} publié(s).`);
    if (!isVercel && databaseUrl) {
      note("MIGRATION", "Sur Vercel, la base est vide au premier déploiement : lancez « Installer / mettre à niveau » dans /admin.");
    }
  }
} else {
  note("CONTENU", "Aucun contenu local : il viendra du seed ou de la base, c'est normal.");
}

// Les portraits en cache ne sont pas versionnés : c'est voulu (données
// personnelles), et le repli est l'API Discord. On ne signale rien.
if (VERBOSE) {
  note("AVATARS", existsSync(path.join(ROOT, "public", "avatars", "index.json"))
    ? "Cache local des portraits présent (non versionné, régénérable)."
    : "Pas de cache local : les portraits viendront de l'API Discord.");
}

// ---------------------------------------------------------------------------
// Rapport
// ---------------------------------------------------------------------------
const afficher = (titre, liste) => {
  if (liste.length === 0) return;
  console.log(`\n${titre}`);
  for (const item of liste) {
    const var_ = item.variable ? `  → ${item.variable}` : "";
    console.log(`  ${item.code}${var_}\n    ${item.message}`);
  }
};

if (notes.length > 0) {
  console.log("\nÉtat");
  for (const item of notes) console.log(`  ${item.code}\n    ${item.message}`);
}
afficher("Problèmes bloquants", problems);
afficher("Avertissements", warnings);

console.log("");
if (problems.length > 0) {
  if (RAPPORT) {
    console.log(
      `⚠ ${problems.length} problème(s) à corriger dans Settings → Environment Variables.\n` +
        `  Le build se poursuit (--rapport). Définissez ces variables pour que le wiki\n` +
        `  soit pleinement fonctionnel ; en leur absence, certaines parties resteront\n` +
        `  inopérantes — l'espace d'édition ne peut pas être authentifié sans\n` +
        `  AUTH_SECRET, et la synchronisation Discord échoue sans CRON_SECRET.`,
    );
  } else {
    console.log(`✗ ${problems.length} problème(s) bloquant(s) : le déploiement échouerait ou perdrait des données.`);
    process.exit(1);
  }
}
if (warnings.length > 0 && STRICT) {
  console.log(`✗ ${warnings.length} avertissement(s) et --strict est actif.`);
  process.exit(1);
}
console.log(
  warnings.length > 0
    ? `✓ Déployable, avec ${warnings.length} avertissement(s).`
    : "✓ Prêt pour le déploiement.",
);
