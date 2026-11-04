/**
 * Banc d'essai XSS du wiki.
 *
 * ## Ce qu'il teste, et pourquoi ces deux étages
 *
 * Le wiki rend le Markdown d'article avec `dangerouslySetInnerHTML` : c'est le
 * seul endroit où une donnée rédactionnelle devient du HTML. Deux étages sont
 * donc nécessaires, et ils n'attrapent pas les mêmes choses :
 *
 *   1. **Stocké (hors ligne, toujours exécuté)** — on soumet des charges au
 *      *vrai* renderer, chargé par transpilation, exactement comme
 *      `check-markdown.mjs`. Une charge stockée s'exécute chez **chaque**
 *      lecteur : c'est la faille la plus grave, et elle ne se voit pas en
 *      visitant le site.
 *   2. **Réfléchi (en ligne, facultatif)** — on envoie des charges dans les
 *      paramètres d'URL et on inspecte la réponse brute. Ne s'exécute que si
 *      une URL de base est fournie :
 *
 *          node scripts/check-xss.mjs https://wiki-gratiennois.duckdns.org
 *
 * ## Ce que « faille » veut dire ici
 *
 * On ne cherche **pas** le texte de la charge dans la sortie : une charge
 * correctement échappée produit `&lt;img src=x onerror=alert(1)&gt;`, où
 * `onerror=` est du texte mort. On cherche une **balise active** que le
 * renderer n'émet jamais lui-même, un handler porté par une vraie balise, ou
 * un `href` à schéma actif. Un détecteur naïf sur `onerror=` produit 17 faux
 * positifs sur 27 charges — c'est le piège que ce fichier évite.
 *
 * Code de sortie : 0 si rien, 1 si au moins une charge passe.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.argv[2];

// ---------------------------------------------------------------------------
// Chargement du vrai renderer (même technique que check-markdown.mjs)
// ---------------------------------------------------------------------------

function loadMarkdownHelpers() {
  const ts = require("typescript");
  const source = readFileSync(path.join(ROOT, "src", "lib", "markdown.ts"), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const body = transpiled
    .replace(/^"use strict";?$/m, "")
    .replace(/Object\.defineProperty\(exports, "__esModule"[\s\S]*?\);/m, "")
    .replace(/exports\.[A-Za-z_$][\w$]*\s*=\s*/g, "");
  return new Function(
    `${body}\nreturn { headingId, createHeadingIdAllocator, isListItem, listIndent, stripListMarker };`,
  )();
}

function loadRenderer() {
  const ts = require("typescript");
  const source = readFileSync(
    path.join(ROOT, "src", "components", "MarkdownRenderer.tsx"),
    "utf8",
  );
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;

  const body = transpiled
    .replace(/^\s*var __importDefault[\s\S]*?;\s*$/m, "")
    .replace(/Object\.defineProperty\(exports, "__esModule"[\s\S]*?\);/m, "")
    .replace(/^exports\.default\s*=\s*MarkdownRenderer;?$/m, "")
    .replace(/^function MarkdownRenderer\b[\s\S]*$/m, "")
    .replace(/exports\.[A-Za-z_$][\w$]*\s*=\s*/g, "")
    .replace(/^import .*$/gm, "")
    .replace(/^const [A-Za-z_$][\w$]* = require\([^)]*\);?$/gm, "")
    .replace(/^require\([^)]*\);?$/gm, "");

  const factory = new Function(
    "markdownHelpers",
    `const markdown_1 = markdownHelpers;\n${body}\nreturn { renderMarkdown };`,
  );
  return factory(loadMarkdownHelpers());
}

// ---------------------------------------------------------------------------
// Détection
// ---------------------------------------------------------------------------

/** Balises que le renderer émet légitimement. Toute autre est suspecte. */
const BALISES_AUTORISEES = new Set([
  "p", "h2", "h3", "a", "strong", "em", "code", "pre", "ul", "ol", "li",
  "blockquote", "table", "thead", "tbody", "tr", "th", "td", "div", "hr",
]);

function balisesActives(html) {
  const trouvees = new Set();
  const motif = /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g;
  let m;
  while ((m = motif.exec(html)) !== null) {
    const nom = m[1].toLowerCase();
    if (!BALISES_AUTORISEES.has(nom)) trouvees.add(nom);
  }
  return [...trouvees];
}

function handlersActifs(html) {
  const balises = html.match(/<[a-zA-Z][^>]*>/g) || [];
  const trouves = new Set();
  for (const balise of balises) {
    const m = balise.match(/\son[a-z]+\s*=/i);
    if (m) trouves.add(m[0].trim().replace(/\s*=$/, ""));
  }
  return [...trouves];
}

function hrefActif(html) {
  return /href\s*=\s*["']?\s*(javascript|data|vbscript):/i.test(html);
}

function diagnostiquer(html) {
  const details = [];
  const balises = balisesActives(html);
  if (balises.length) details.push("balise(s) : " + balises.join(", "));
  const handlers = handlersActifs(html);
  if (handlers.length) details.push("handler(s) : " + handlers.join(", "));
  if (hrefActif(html)) details.push("href actif (javascript:/data:)");
  return details;
}

// ---------------------------------------------------------------------------
// Étage 1 — charges stockées
// ---------------------------------------------------------------------------

const CHARGES_STOCKEES = [
  ["paragraphe — script", "<script>alert(1)</script>"],
  ["paragraphe — img onerror", "<img src=x onerror=alert(1)>"],
  ["paragraphe — svg onload", "<svg/onload=alert(1)>"],
  ["paragraphe — iframe js", '<iframe src="javascript:alert(1)"></iframe>'],
  ["paragraphe — style exfil", "<style>@import 'https://evil.test/x.css';</style>"],
  ["titre h2 — img", "## <img src=x onerror=alert(1)>"],
  ["titre h2 — évasion attribut", '## " onmouseover="alert(1)'],
  ["titre h3 — svg", "### <svg/onload=alert(1)>"],
  ["gras — img", "**<img src=x onerror=alert(1)>**"],
  ["italique — img", "*<img src=x onerror=alert(1)>*"],
  ["code inline — img", "`<img src=x onerror=alert(1)>`"],
  ["bloc de code — évasion", "```\n</code></pre><img src=x onerror=alert(1)>\n```"],
  ["citation — img", "> <img src=x onerror=alert(1)>"],
  ["liste — img", "- <img src=x onerror=alert(1)>"],
  ["tableau — img en cellule", "| a | b |\n| --- | --- |\n| <img src=x onerror=alert(1)> | x |"],
  ["lien — href javascript", "[clic](javascript:alert(1))"],
  ["lien — href entité", "[clic](jav&#97;script:alert(1))"],
  ["lien — texte img", "[<img src=x onerror=alert(1)>](https://exemple.test)"],
  ["lien — href data:", "[clic](data:text/html,<script>alert(1)</script>)"],
  ["wiki — libellé img", "[[esto|<img src=x onerror=alert(1)>]]"],
  ["wiki — cible img", "[[<img src=x onerror=alert(1)>]]"],
  ["wiki — libellé imbriqué", "[[esto|[x](javascript:alert(1))]]"],
  ["wiki — guillemet dans libellé", '[[esto|" onmouseover="alert(1)]]'],
  ["image markdown", '![alt](x" onerror="alert(1))'],
  ["entité déjà encodée", "&lt;img src=x onerror=alert(1)&gt;"],
  ["double encodage", "&amp;lt;img src=x onerror=alert(1)&amp;gt;"],
];

// ---------------------------------------------------------------------------
// Étage 2 — charges réfléchies
// ---------------------------------------------------------------------------

const CHARGES_REFLECHIES = [
  ["script", "<script>alert(1)</script>"],
  ["img onerror", '"><img src=x onerror=alert(1)>'],
  ["svg onload", "'><svg/onload=alert(1)>"],
  ["évasion RSC", "</script><img src=x onerror=alert(1)>"],
  ["handler nu", "<img src=x onerror=alert(1)>"],
];

const CHEMINS = [
  ["recherche", (v) => `/recherche?q=${encodeURIComponent(v)}`],
  ["recherche+cat", (v) => `/recherche?q=${encodeURIComponent(v)}&categorie=histoire`],
  ["wiki slug", (v) => `/wiki/${encodeURIComponent(v)}`],
  ["catégorie", (v) => `/wiki/categorie/${encodeURIComponent(v)}`],
  ["tag", (v) => `/tags/${encodeURIComponent(v)}`],
  ["404", (v) => `/${encodeURIComponent(v)}`],
];

// ---------------------------------------------------------------------------

let failles = 0;

console.log("=== Étage 1 : charges stockées (renderer réel) ===\n");
const { renderMarkdown } = loadRenderer();

for (const [nom, markdown] of CHARGES_STOCKEES) {
  let sortie = "";
  try {
    sortie = renderMarkdown(markdown);
  } catch (erreur) {
    console.log(`  FAILLE  ${nom} — exception : ${String(erreur).slice(0, 60)}`);
    failles += 1;
    continue;
  }
  const details = diagnostiquer(sortie);
  if (details.length) {
    console.log(`  FAILLE  ${nom} — ${details.join(" ; ")}`);
    console.log(`          sortie : ${sortie.slice(0, 200)}`);
    failles += 1;
  }
}
console.log(
  `\n  ${CHARGES_STOCKEES.length} charges soumises, ` +
    `${CHARGES_STOCKEES.length - failles} neutralisées.`,
);

// ---------------------------------------------------------------------------
// Redirection ouverte
// ---------------------------------------------------------------------------
//
// Ce n'est pas de la XSS, mais c'est la faille voisine : un lien qui *paraît*
// interne et emmène sur un domaine tiers. Le détecteur de balises ne la voit
// pas — la balise est légitime —, d'où ce contrôle séparé sur le schéma.

console.log("\n=== Redirections ouvertes ===\n");

const REDIRECTIONS = [
  ["protocole-relative", "[clic](//evil.test/phish)", /href\s*=\s*["']\/\//i],
  ["barre oblique inverse", "[clic](/\\evil.test/phish)", /href\s*=\s*["']\/[\\/]/i],
  ["schéma javascript", "[clic](javascript:alert(1))", /href\s*=\s*["'][^"']*javascript:/i],
];

let redirectionsFautives = 0;
for (const [nom, markdown, motifInterdit] of REDIRECTIONS) {
  const sortie = renderMarkdown(markdown);
  if (motifInterdit.test(sortie)) {
    console.log(`  FAILLE  ${nom} — ${sortie.slice(0, 120)}`);
    redirectionsFautives += 1;
    failles += 1;
  }
}
if (redirectionsFautives === 0) {
  console.log(`  ${REDIRECTIONS.length} variantes neutralisées.`);
}

if (BASE) {
  console.log(`\n=== Étage 2 : charges réfléchies sur ${BASE} ===\n`);
  let reflets = 0;
  for (const [nomChemin, gabarit] of CHEMINS) {
    for (const [nomCharge, charge] of CHARGES_REFLECHIES) {
      const url = BASE.replace(/\/+$/, "") + gabarit(charge);
      let html = "";
      try {
        html = await (await fetch(url)).text();
      } catch {
        console.log(`  ?       ${nomChemin} / ${nomCharge} — requête échouée`);
        continue;
      }
      // On ne peut pas inspecter le contexte d'un reflet sans navigateur : on
      // signale donc tout reflet brut, à charge pour l'humain de vérifier.
      const brut = html.includes(charge);
      if (brut) {
        console.log(`  À VOIR  ${nomChemin} / ${nomCharge} — reflet brut`);
        reflets += 1;
      }
    }
  }
  console.log(
    `\n  ${CHEMINS.length * CHARGES_REFLECHIES.length} requêtes, ${reflets} reflet(s) brut(s).`,
  );
}

console.log("\n" + "=".repeat(60));
if (failles === 0) {
  console.log("Aucune injection active détectée.");
  process.exit(0);
}
console.log(`${failles} faille(s) détectée(s).`);
process.exit(1);
