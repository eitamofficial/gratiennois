/**
 * Banc d'essai du moteur Markdown.
 *
 * Chaque cas décrit un **comportement attendu** du rendu. Un cas qui échoue
 * signale un bug réel d'affichage : du Markdown correct dans l'éditeur qui ne
 * se rend pas comme prévu à l'écran.
 *
 * Le moteur est réimplémenté ici à l'identique ? Non : le script **importe** le
 * vrai module via une transpilation TS minimale, pour tester le code livré et
 * non une copie. Une divergence ferait passer le test alors que le site est
 * faux — c'est précisément ce qu'un test doit empêcher.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "src", "components", "MarkdownRenderer.tsx");

/**
 * Charge le vrai renderer sans dépendance externe.
 *
 * Le fichier est un composant React/TypeScript ; on le transpile avec le
 * **compilateur du projet** (et non à la main : une transcription approximative
 * ferait passer le test alors que le site est faux), on retire l'export
 * default — le composant, qui contient du JSX —, et on évalue le reste.
 */
function loadRenderer() {
  const ts = require("typescript");
  const source = readFileSync(SOURCE, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;

  // On garde les fonctions pures et on coupe le composant React, qui exige
  // `react` et du JSX : ce n'est pas lui qu'on veut tester. Le `exports.default`
  // transpilé est PEGé au composant, on le supprime donc avec lui.
  const body = transpiled
    .replace(/^\s*var __importDefault[\s\S]*?;\s*$/m, "")
    .replace(/Object\.defineProperty\(exports, "__esModule"[\s\S]*?\);/m, "")
    .replace(/^exports\.default\s*=\s*MarkdownRenderer;?$/m, "")
    .replace(/^function MarkdownRenderer\b[\s\S]*$/m, "")
    .replace(/exports\.[A-Za-z_$][\w$]*\s*=\s*/g, "")
    .replace(/^import .*$/gm, "")
    // Les imports compilés en `require("…")` : on retire la **ligne entière**.
    // Le module étant évalué dans une portée Injectée, les helpers lui sont
    // fournis directement.
    .replace(/^const [A-Za-z_$][\w$]* = require\([^)]*\);?$/gm, "")
    .replace(/^require\([^)]*\);?$/gm, "")
    .replace(/^\s*require\([^)]*\);?\s*$/gm, "");

  const factory = new Function(
    "markdownHelpers",
    // Le code transpillé référence le require sous le nom `markdown_1` (ou
    // `markdown_2` si l'import est multiple) : on le déclare pour que ces
    // références résolvent vers les vrais helpers.
    `const markdown_1 = markdownHelpers;
${body}\nreturn { renderMarkdown, groupBlocks };`,
  );
  // Les helpers viennent du vrai module du projet : si le renderer et le
  // sommaire divergeaient, le test le verrait au lieu de valider deux
  // implémentations différentes.
  return factory(loadMarkdownHelpers());
}

/** Compile `src/lib/markdown.ts` (module pur, aucune dépendance). */
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

const { renderMarkdown } = loadRenderer();

/** Contrôle interne : le banc d'essai doit réellement tester le moteur livré. */
if (typeof renderMarkdown !== "function") {
  console.error("Le moteur Markdown n'a pas pu être chargé : le test ne teste rien.");
  process.exit(1);
}

/** Table de résolution minimale : ces slugs « existent ». */
const linkMap = new Map([
  ["massivie", { slug: "massivie", title: "Massivie" }],
  ["norlot", { slug: "norlot", title: "Norlot" }],
  ["esto", { slug: "esto", title: "Esto" }],
  ["baron", { slug: "baron", title: "Baron" }],
  ["neustrie", { slug: "neustrie", title: "Neustrie" }],
]);

const render = (md) => renderMarkdown(md, linkMap);

const cas = [
  {
    nom: "lien wiki replié sur deux lignes",
    md: "Eitam est candidat sous l'étiquette du\n[[massivie|Massivie\nla République]], puis rien.",
    verifie: (html) =>
      html.includes('href="/wiki/massivie"') &&
      html.includes("Massivie la République") &&
      !html.includes("[["),
    raison: "un lien coupé par un retour à la ligne doit rester un lien",
  },
  {
    nom: "gras replié sur deux lignes",
    md: "Il est\n**le seul**\nà l'avoir fait.",
    verifie: (html) => html.includes("<strong>le seul</strong>"),
    raison: "le repli des lignes ne doit pas casser le gras",
  },
  {
    nom: "lien wiki dans une cellule de tableau",
    md: "| Micronation | Régime |\n| --- | --- |\n| [[massivie|Massivie]] | République |",
    verifie: (html) => {
      const cellules = html.match(/<td(?:\s[^>]*)?>/g) ?? [];
      return (
        cellules.length === 2 &&
        html.includes('href="/wiki/massivie"') &&
        !html.includes("[[") &&
        !html.includes("Massivie]]")
      );
    },
    raison: "le « | » d'un lien wiki ne doit pas créer une colonne",
  },
  {
    nom: "lien wiki dans un tableau à trois colonnes",
    md: "| A | B | C |\n| --- | --- | --- |\n| [[norlot|Norlot]] | Empire | Ministre |\n| x | y | z |",
    verifie: (html) => (html.match(/<td(?:\s[^>]*)?>/g) ?? []).length === 6,
    raison: "trois colonnes, deux lignes de corps",
  },
  {
    nom: "pipe échappé dans une cellule",
    md: "| a | b |\n| --- | --- |\n| x \\| y | z |",
    verifie: (html) =>
      (html.match(/<td(?:\s[^>]*)?>/g) ?? []).length === 2 && html.includes("x | y"),
    raison: "\\| est un caractère littéral, pas un séparateur",
  },
  {
    nom: "pipe dans du code inline en cellule",
    md: "| a | b |\n| --- | --- |\n| `x|y` | z |",
    verifie: (html) =>
      (html.match(/<td(?:\s[^>]*)?>/g) ?? []).length === 2 && html.includes("<code>x|y</code>"),
    raison: "un tube dans du code ne sépare pas",
  },
  {
    nom: "tableau sans barre initiale ni finale",
    md: "A | B\n--- | ---\n1 | 2",
    // `<th\s` et non `<th[^>]*>` : ce dernier compterait aussi `<thead>`.
    verifie: (html) =>
      (html.match(/<th(?:\s[^>]*)?>/g) ?? []).length === 2 &&
      (html.match(/<td(?:\s[^>]*)?>/g) ?? []).length === 2,
    raison: "les barres de bord sont optionnelles en Markdown",
  },
  {
    nom: "ligne trop courte complétée",
    md: "| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n| 4 | 5 |",
    verifie: (html) => (html.match(/<tr\s*>/g) ?? []).length === 3,
    raison: "une ligne incomplète ne doit pas déformer le tableau",
  },
  {
    nom: "gras et italique combinés",
    md: "Texte ***important*** ici.",
    verifie: (html) => html.includes("<strong><em>important</em></strong>"),
    raison: "***gras italique*** doit être reconnu",
  },
  {
    nom: "citation avec continuation paresseuse",
    md: "> Première ligne\n> suite de la citation\n",
    // Une citation repliée est **un** paragraphe : c'est ce qui permet à un
    // lien coupé par un retour à la ligne d'être reconnu dedans.
    verifie: (html) =>
      (html.match(/<p>/g) ?? []).length === 1 &&
      html.includes("Première ligne suite de la citation"),
    raison: "les lignes > se regroupent en un seul paragraphe",
  },
  {
    nom: "continuation paresseuse : texte sans > apres une citation",
    md: "> Première ligne\nsuite de la citation\n",
    // La phrase non préfixée doit se retrouver **dedans** le <blockquote>,
    // pas devenir un paragraphe voisin.
    verifie: (html) =>
      /<blockquote[^>]*><p>Première ligne suite de la citation<\/p><\/blockquote>/.test(html),
    raison: "une phrase non préfixée prolonge la citation au lieu de la couper",
  },
  {
    nom: "liste plate : pas de liste vide imbriquée",
    md: "- [[baron]]\n- [[neustrie]]",
    verifie: (html) => {
      const ul = html.match(/<ul/g) ?? [];
      const li = html.match(/<li>/g) ?? [];
      // Une seule <ul>, deux <li>, et surtout aucun « <ul><ul> » qui est du
      // HTML invalide et que le navigateur corrige en aplatissant.
      return ul.length === 1 && li.length === 2 && !html.includes("<ul class=\"list-disc\"><ul");
    },
    raison: "une liste simple ne doit pas produire de liste imbriquée vide",
  },
  {
    nom: "les liens wiki sont résolus DANS une liste",
    md: "- [[baron]]\n- [[neustrie]]",
    verifie: (html) =>
      html.includes('href="/wiki/baron"') &&
      html.includes('href="/wiki/neustrie"') &&
      !html.includes("[["),
    raison: "le texte d'un élément de liste passe par le rendu inline",
  },
  {
    nom: "liste à deux niveaux : la sous-liste est dans le bon <li>",
    md: "- Père\n  - Fils\n- Frère",
    verifie: (html) => {
      const listeInterne = html.match(/<li>(?:(?!<\/li>).)*<ul[\s\S]*?<\/ul>[\s\S]*?<\/li>/);
      return (html.match(/<ul/g) ?? []).length === 2 && listeInterne !== null;
    },
    raison: "le sous-élément doit être imbriqué dans l'élément parent",
  },
  {
    nom: "liste à deux niveaux",
    md: "- Niveau un\n  - Niveau deux\n- Retour",
    verifie: (html) => html.includes("<ul") && html.includes("Niveau deux"),
    raison: "l'imbrication ne doit pas être aplatie ni perdue",
  },
  {
    nom: "titres dupliqués : identifiants distincts",
    md: "## Histoire\n\nTexte.\n\n## Histoire\n\nAutre texte.",
    verifie: (html) => {
      const ids = [...html.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]);
      return ids.length === 2 && ids[0] !== ids[1];
    },
    raison: "deux ancres identiques cassent le sommaire",
  },
  {
    nom: "lien externe sécurisé",
    md: "[Discord](https://discord.gg/gratianopolis)",
    verifie: (html) => html.includes('rel="noopener noreferrer"') && html.includes("target"),
    raison: "les liens externes s'ouvrent en sécurité",
  },
  {
    nom: "javascript: est neutralisé",
    md: "[piège](javascript:alert(1))",
    verifie: (html) => !html.includes("javascript:"),
    raison: "aucun script ne doit être constructible",
  },
  {
    nom: "lien rouge vers la recherche",
    md: "[[article-inexistant|Titre manquant]]",
    verifie: (html) => html.includes("link-red") && html.includes("/recherche?q="),
    raison: "un article absent reste cliquable vers la recherche",
  },
  {
    nom: "gras contenant un lien",
    md: "**[[esto|Esto]]** est le dauphin.",
    verifie: (html) => html.includes("<strong>") && html.includes('href="/wiki/esto"'),
    raison: "le gras n'avale pas le lien",
  },
];

let echecs = 0;
for (const test of cas) {
  let html = "";
  try {
    html = render(test.md);
  } catch (error) {
    console.log(`ÉCHEC  ${test.nom}\n        exception : ${error.message}`);
    echecs += 1;
    continue;
  }
  let ok = false;
  try {
    ok = test.verifie(html);
  } catch {
    ok = false;
  }
  if (ok) {
    console.log(`OK     ${test.nom}`);
  } else {
    echecs += 1;
    console.log(`ÉCHEC  ${test.nom}\n        ${test.raison}\n        rendu : ${html.slice(0, 400)}`);
  }
}

console.log("");
if (echecs > 0) {
  console.log(`${echecs} test(s) Markdown en échec.`);
  process.exit(1);
}
console.log(`${cas.length} tests Markdown passent.`);
