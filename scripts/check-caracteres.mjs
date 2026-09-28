/**
 * Détecte les caractères qui n'ont rien à faire dans ce dépôt.
 *
 * ## Pourquoi ce script existe
 *
 * Les fichiers de ce projet sont rédigés en français, avec des accents — c'est
 * normal et ce n'est pas ce qu'on cherche ici. On cherche trois intrus :
 *
 *   1. les caractères chinois (CJK), qui se glissent parfois dans une chaîne
 *      à la place d'un mot français ;
 *   2. les caractères cyrilliens, qui ressemblent à des lettres latines et
 *      passent inaperçus à la relecture ;
 *   3. le caractère de remplacement U+FFFD, qui signale un texte déjà cassé.
 *
 * Un fichier qui en contient un est un fichier à relire : le plus souvent, une
 * phrase a été réécrite et un fragment d'une autre langue est resté au milieu.
 *
 * ## Les fins de ligne
 *
 * `CRLF` est signalé à part. Ce n'est pas une erreur de contenu, mais sur
 * Windows un fichier réécrit par un éditeur de texte peut basculer en CRLF sans
 * qu'on le voie, et cela produit des diffs entirety réécrits à chaque
 * enregistrement. Les `.bat` et `.ps1` sont les plus exposés.
 *
 * Usage : node scripts/check-caracteres.mjs
 * Sortie : 0 si tout est propre, 1 sinon.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const RACINES_SAUTEES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  ".vercel",
  "public",
  "data",
  "__pycache__",
]);

// Fichiers générés : leur contenu vient de l'outil, pas de la main. Les
// corriger ici serait perdu à la prochaine génération.
const GENERES = new Set([
  "next-env.d.ts", // Next.js, régénéré à chaque `npm install`
  "deploy/windows/duckdns-ipv6.txt", // dernière IP annoncée, écriture PowerShell
]);

// La ponctuation CJK (`〈` `〉` U+3008-3009, ideographiques pleine largeur) est
// exclue : le serveur Discord l'emploie comme séparateur de libellé de salon, et
// ce choix est assumé. C'est l'**ideogramme** qu'on traque, pas le signe de
// ponctuation.
const MOTIFS = [
  { nom: "chinois (CJK)", regex: /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF66-\uFF9F]/g },
  { nom: "cyrillien", regex: /[\u0400-\u04FF\u0500-\u052F]/g },
  { nom: "replacement", regex: /\uFFFD/g },
];

const TEXTES = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".txt",
  ".bat",
  ".ps1",
  ".sql",
  ".yml",
  ".yaml",
  ".env.example",
  ".gitignore",
  ".vercelignore",
]);

const problemes = [];
const fichiers = [];

function traiter(fichier, relatif) {
  const brut = readFileSync(fichier, "utf8");
  fichiers.push({ relatif, brut });

  if (brut.includes("\r\n")) {
    const lignes = brut.split("\r\n").length - 1;
    problemes.push({
      fichier: relatif,
      genre: "CRLF",
      detail: `${lignes} ligne(s) terminées par CRLF au lieu de LF`,
    });
  }

  for (const { nom, regex } of MOTIFS) {
    const correspondances = brut.match(regex);
    if (!correspondances) continue;
    const uniques = [...new Set(correspondances)];
    // On signale les lignes concernees : le caractere seul ne dit pas ou chercher.
    // `new RegExp` a chaque ligne parce que `regex` est global : un objet
    // `/g` conserve sa derniere position et donnerait un resultat faux.
    const lignes = brut.split(/\r?\n/);
    const sond = new RegExp(regex.source);
    const numeros = [];
    lignes.forEach((l, i) => {
      if (sond.test(l) && numeros.length < 5) numeros.push(i + 1);
    });
    problemes.push({
      fichier: relatif,
      genre: nom,
      detail: `${uniques.join(" ")} — ligne(s) ${numeros.join(", ")}`,
    });
  }
}

function parcourir(repertoire, prefixe = "") {
  for (const entree of readdirSync(repertoire, { withFileTypes: true })) {
    if (entree.name.startsWith(".") && entree.name !== ".env.example") {
      if (entree.isDirectory()) continue;
    }
    if (RACINES_SAUTEES.has(entree.name)) continue;
    const rel = prefixe ? `${prefixe}/${entree.name}` : entree.name;
    const absolu = path.join(repertoire, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === ".git") continue;
      parcourir(absolu, rel);
    } else {
      if (GENERES.has(rel)) continue;
      const ext = path.extname(entree.name);
      if (TEXTES.has(ext) || TEXTES.has(entree.name)) traiter(absolu, rel);
    }
  }
}
parcourir(RACINE);

console.log(`${fichiers.length} fichier(s) de texte analyse(s).`);

if (!problemes.length) {
  console.log("OK — aucun caractere chinois, cyrillien ou de remplacement, aucune fin de ligne CRLF.");
  process.exit(0);
}

console.log(`\n${problemes.length} probleme(s) :\n`);
for (const p of problemes) {
  console.log(`  ${p.fichier} — ${p.genre} : ${p.detail}`);
}
console.log(
  "\nUn caractere CJK ou cyrillien signale presque toujours une phrase reecrite dont un fragment ete laisse. Le relire et le remplacer par du francais.",
);
process.exit(1);
