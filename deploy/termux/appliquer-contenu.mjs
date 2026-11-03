#!/usr/bin/env node
/**
 * Applique un correctif de contenu au wiki en production.
 *
 * ## Pourquoi ce script existe
 *
 * Le contenu du wiki vit dans `data/`, qui n'est **pas** versionné : un
 * `git pull` met le code à jour mais laisse les articles tels quels. Le seul
 * mécanisme prévu pour rafraîchir le texte est le bouton « Installer / mettre à
 * niveau » de `/admin` — or il **protège** les articles que la rédaction a
 * retouchés, et il faut être connecté en Dauphin pour l'atteindre.
 *
 * Ce script applique donc un correctif daté, sans authentification, et sans
 * jamais créer d'article : **il ne met à jour que ce qui existe déjà**. C'est
 * volontaire. Quatre fiches (Swaylo, Baron, Norlot, Neustrie) ont été
 * supprimées de la production ; les recréer serait un effet de bord que
 * personne n'a demandé.
 *
 * ## Ce qu'il garantit
 *
 *   - **sauvegarde d'abord** : `data/articles.json` et `data/revisions.json`
 *     sont copiés dans `data/.sauvegardes/<horodatage>/` avant toute écriture ;
 *   - **historique** : chaque article modifié produit une révision `update`
 *     dont l'instantané est l'**ancienne** version — donc restaurable depuis
 *     `/wiki/<slug>/versions` ;
 *   - **idempotence** : un fichier marqueur empêche de rejouer le même
 *     correctif par accident (voir `--force`) ;
 *   - **écriture atomique** : fichier temporaire puis `rename`, pour qu'une
 *     coupure de courant ne laisse pas un JSON tronqué.
 *
 * ## Usage
 *
 *   node deploy/termux/appliquer-contenu.mjs                     # applique
 *   node deploy/termux/appliquer-contenu.mjs --dry-run           # simule
 *   node deploy/termux/appliquer-contenu.mjs --force             # rejoue
 *   node deploy/termux/appliquer-contenu.mjs chemin/vers.json    # autre patch
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const WIKI_DIR = process.env.WIKI_DIR || process.cwd();
const DATA = path.join(WIKI_DIR, "data");
const ARTICLES = path.join(DATA, "articles.json");
const REVISIONS = path.join(DATA, "revisions.json");
const PATCH_DEFAUT = path.join(
  WIKI_DIR,
  "deploy",
  "termux",
  "contenu-2026-11-03.json",
);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const patchPath = args.find((a) => !a.startsWith("--")) || PATCH_DEFAUT;

const AUTEUR = "Rédaction du wiki";

function journal(...parties) {
  console.log(...parties);
}

function lireJson(fichier, defaut) {
  if (!fs.existsSync(fichier)) return defaut;
  const brut = fs.readFileSync(fichier, "utf8").trim();
  if (!brut) return defaut;
  return JSON.parse(brut);
}

/** Écrit via un fichier temporaire, puis renomme : jamais de JSON tronqué. */
function ecrireJson(fichier, valeur) {
  const temporaire = `${fichier}.tmp-${process.pid}`;
  fs.writeFileSync(temporaire, JSON.stringify(valeur, null, 2), "utf8");
  fs.renameSync(temporaire, fichier);
}

function sauvegarder() {
  const horodatage = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const dossier = path.join(DATA, ".sauvegardes", horodatage);
  fs.mkdirSync(dossier, { recursive: true });
  for (const fichier of [ARTICLES, REVISIONS]) {
    if (fs.existsSync(fichier)) {
      fs.copyFileSync(fichier, path.join(dossier, path.basename(fichier)));
    }
  }
  return dossier;
}

// ---------------------------------------------------------------------------

if (!fs.existsSync(patchPath)) {
  console.error(`Correctif introuvable : ${patchPath}`);
  process.exit(1);
}

const patch = lireJson(patchPath, null);
if (!patch || !Array.isArray(patch.articles)) {
  console.error(`Correctif illisible (clé « articles » attendue) : ${patchPath}`);
  process.exit(1);
}

const marqueur = `${patchPath}.applique`;
if (fs.existsSync(marqueur) && !force) {
  journal(
    `Ce correctif a déjà été appliqué le ${fs
      .readFileSync(marqueur, "utf8")
      .trim()}.`,
  );
  journal("Relancez avec --force pour l'appliquer à nouveau.");
  process.exit(0);
}

const articles = lireJson(ARTICLES, []);
if (!Array.isArray(articles) || articles.length === 0) {
  console.error(`Aucun article lisible dans ${ARTICLES}.`);
  process.exit(1);
}

const revisions = lireJson(REVISIONS, []);
const maintenant = new Date().toISOString();

const rapport = { misAJour: [], absents: [], inchanges: [] };

for (const entree of patch.articles) {
  const actuel = articles.find((a) => a.slug === entree.slug);

  if (!actuel) {
    // Volontairement pas de création : voir l'en-tête du fichier.
    rapport.absents.push(entree.slug);
    continue;
  }

  const identique =
    actuel.title === entree.title &&
    actuel.summary === entree.summary &&
    actuel.content === entree.content &&
    JSON.stringify(actuel.tags) === JSON.stringify(entree.tags);

  if (identique) {
    rapport.inchanges.push(entree.slug);
    continue;
  }

  // L'instantané conserve l'ANCIENNE version : c'est elle qu'on restaure.
  revisions.push({
    id: randomUUID(),
    articleSlug: actuel.slug,
    action: "update",
    author: AUTEUR,
    createdAt: maintenant,
    snapshot: {
      title: actuel.title,
      category: actuel.category,
      summary: actuel.summary,
      content: actuel.content,
      tags: [...(actuel.tags || [])],
      ...(actuel.infobox ? { infobox: actuel.infobox } : {}),
    },
  });

  actuel.title = entree.title;
  actuel.category = entree.category ?? actuel.category;
  actuel.summary = entree.summary;
  actuel.content = entree.content;
  actuel.tags = [...entree.tags];
  if (entree.infobox) actuel.infobox = entree.infobox;
  actuel.updatedAt = maintenant;

  rapport.misAJour.push(entree.slug);
}

journal(`Correctif : ${path.basename(patchPath)} (${patch.date || "sans date"})`);
journal(`  mis à jour : ${rapport.misAJour.length}`);
rapport.misAJour.forEach((s) => journal(`    + ${s}`));
if (rapport.inchanges.length) {
  journal(`  déjà à jour : ${rapport.inchanges.length}`);
  rapport.inchanges.forEach((s) => journal(`    = ${s}`));
}
if (rapport.absents.length) {
  journal(`  absents en production, non recréés : ${rapport.absents.length}`);
  rapport.absents.forEach((s) => journal(`    - ${s}`));
}

if (rapport.misAJour.length === 0) {
  journal("Rien à écrire.");
  process.exit(0);
}

if (dryRun) {
  journal("--dry-run : aucune écriture.");
  process.exit(0);
}

const dossier = sauvegarder();
journal(`Sauvegarde : ${dossier}`);

ecrireJson(ARTICLES, articles);
ecrireJson(REVISIONS, revisions);
fs.writeFileSync(marqueur, `${maintenant}\n`, "utf8");

journal("Contenu appliqué.");
