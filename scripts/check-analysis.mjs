#!/usr/bin/env node
/**
 * Vérifie l'assistant de rédaction (src/lib/text-analysis.ts) sans passer par
 * l'API : doublons, exclusion de l'article édité, contrôle qualité, liens
 * cassés, classification et résumé.
 *
 *   node scripts/check-analysis.mjs
 * Code de sortie : 0 si tous les cas passent.
 */
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const root = process.cwd();
// Compile dans le projet (et non dans %TEMP%) pour que la résolution de
// `pg` et autres dépendances de node_modules fonctionne.
const dir = await mkdtemp(path.join(root, ".tmp-check-analysis-"));
console.log("Compilation de src/lib/text-analysis.ts …");
execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules", "typescript", "bin", "tsc"),
    "src/lib/text-analysis.ts",
    "--outDir",
    dir,
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--esModuleInterop",
    "--moduleResolution",
    "node",
    "--skipLibCheck",
  ],
  { cwd: root, stdio: "inherit" },
);
const { analyzeArticle } = await import(pathToFileURL(path.join(dir, "text-analysis.js")).href);

const articles = JSON.parse(await readFile(path.join(root, "data/articles.json"), "utf8"));
const dauphin = articles.find((article) => article.slug === "le-dauphin");
if (!dauphin) throw new Error("article de référence « le-dauphin » introuvable");

let failures = 0;
function check(label, condition, detail = "") {
  const status = condition ? "OK  " : "FAIL";
  if (!condition) failures++;
  console.log(`${status} ${label}${detail ? ` — ${detail}` : ""}`);
}

const base = {
  summary: dauphin.summary,
  tags: dauphin.tags,
  category: dauphin.category,
  articles,
};

/** 1. Copie conforme sous un autre titre : doublon quasi certain. */
const copy = analyzeArticle({
  ...base,
  title: "Chef de l'État delphinal",
  content: dauphin.content,
});
check(
  "copie conforme détectée",
  copy.duplicates.some((item) => item.slug === "le-dauphin" && item.similarity > 0.9),
  copy.duplicates.map((item) => `${item.slug}=${item.similarity}`).join(", ") || "aucun doublon",
);

/** 2. Un texte sans rapport avec le wiki ne doit déclencher aucune alerte. */
const other = analyzeArticle({
  ...base,
  title: "Recette de la tourte gratianopolitaine",
  content:
    "# Recette\n\nMélanger farine, beurre et eau jusqu'à obtenir une pâte lisse. " +
    "Laisser reposer une heure au frais, étirer puis garnir de pommes. " +
    "Enfourner trente minutes à deux cents degrés et servir tiède.\n",
});
check(
  "article sans rapport non signalé",
  other.duplicates.length === 0,
  other.duplicates.map((item) => `${item.slug}=${item.similarity}`).join(", ") || "aucun doublon",
);

/** 2 bis. Deux pages de profils construites sur le même modèle : la ressemblance
 *  doit bien être signalée, c'est précisément le but de la détection. */
const profil = analyzeArticle({
  ...base,
  title: "Nouveau profil",
  content: articles.find((article) => article.slug === "bougre").content,
});
check(
  "modèle de profil identique signalé",
  profil.duplicates.some((item) => item.similarity > 0.8),
  profil.duplicates.map((item) => `${item.slug}=${item.similarity}`).join(", ") || "aucun doublon",
);

/** 3. Un article en cours sur lui-même ne doit pas se signaler lui-même. */
const same = analyzeArticle({
  ...base,
  slug: "le-dauphin",
  title: dauphin.title,
  content: dauphin.content,
});
check(
  "auto-exclusion de l'article édité",
  !same.duplicates.some((item) => item.slug === "le-dauphin"),
);

/** 4. Qualité : sections manquantes, lien cassé, doublon de lien. */
const draft = analyzeArticle({
  ...base,
  title: "N",
  summary: "Trop court",
  tags: [],
  content: "# Note\n\nVoir [[Le Dauphin]] et [[Page Inexistante]].\n",
});
check("titre trop court signalé", draft.checklist.find((item) => item.label.startsWith("Titre"))?.ok === false);
check("résumé hors bornes signalé", draft.checklist.find((item) => item.label.startsWith("Résumé"))?.ok === false);
check("contenu trop court signalé", draft.checklist.find((item) => item.label.startsWith("Contenu"))?.ok === false);
check("lien cassé détecté", draft.brokenLinks.length === 1 && draft.brokenLinks[0] === "Page Inexistante", draft.brokenLinks.join(", "));
check("lien valide ignoré", !draft.brokenLinks.includes("Le Dauphin"));
check("catégorie suggérée", draft.suggestedCategory.length > 0, draft.suggestedCategory.map((item) => `${item.category}:${item.score}`).join(", "));
check(
  "tags suggérés sans mots vides",
  !copy.suggestedTags.some((tag) => ["cette", "peut", "meme", "cette"].includes(tag)) && copy.suggestedTags.length > 0,
  copy.suggestedTags.join(", "),
);
check("résumé non vide", draft.summary.length > 0, `${draft.summary.slice(0, 60)}…`);
check("temps de lecture", draft.readingMinutes >= 1, `${draft.readingMinutes} min`);

console.log(failures === 0 ? "\nToutes les vérifications passent." : `\n${failures} vérification(s) en échec.`);
await rm(dir, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
