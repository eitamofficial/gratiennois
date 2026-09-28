// Simule fidelement l'exclusion de Vercel : on parcourt l'arborescence du
// projet et on ne retient que ce que le .vercelignore n'exclut pas. On verifie
// ensuite qu'aucun secret ne se retrouve dans la liste.
//
// `git check-ignore` ne convient pas ici : il ne lit que .gitignore.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const RACINE = process.argv[2] ?? process.cwd();
const DIR = path.join(RACINE, ".vercelignore");

// Les exclusions que Vercel applique deja, avant meme de lire .vercelignore.
const PAR_DEFAUT = ["node_modules", ".git", ".next", ".vercel"];

/** Transforme une ligne de motif gitignore en regex. */
function motifEnRegex(motif) {
  let s = motif;
  s = s.replace(/^!/, ""); // negation : traitee a part
  const ancre = s.endsWith("/");
  if (ancre) s = s.slice(0, -1);
  let re = "";
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === "*") {
      if (s[i + 1] === "*") {
        re += ".*";
        i += 1;
        if (s[i + 1] === "/") i += 1;
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if ("\\^$.|+()[]{}".includes(c)) re += "\\" + c;
    else re += c;
  }
  // `dir/*` ou `dir/` : le motif couvre tout ce qui est dessous.
  const prefixe = ancre || /\*\*|\*\//.test(s) ? "" : "(?:/.*)?";
  return new RegExp("^" + re + prefixe + "$");
}

const lignes = readFileSync(DIR, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

const negations = [];
const motifs = [];
for (const l of lignes) {
  if (l.startsWith("!")) negations.push(motifEnRegex(l.slice(1)));
  else motifs.push(motifEnRegex(l));
}

function exclu(relatif) {
  const base = relatif.split("/")[0];
  if (PAR_DEFAUT.includes(base)) return true;
  let e = motifs.some((r) => r.test(relatif));
  for (const n of negations) if (n.test(relatif)) e = false;
  return e;
}

const transmis = [];
function parcourir(repertoire, prefixe = "") {
  for (const entree of readdirSync(repertoire, { withFileTypes: true })) {
    const rel = prefixe ? prefixe + "/" + entree.name : entree.name;
    if (exclu(rel)) continue;
    if (entree.isDirectory()) {
      parcourir(path.join(repertoire, entree.name), rel);
    } else {
      transmis.push(rel);
    }
  }
}
parcourir(RACINE);

// `--copier <destination>` : materialise exactement ce que Vercel recevrait.
// Sert a verifier le build dans ces conditions, plutot que de supposer que
// l'exclusion a produit le bon effet.
if (process.argv[3] === "--copier" && process.argv[4]) {
  const { copyFileSync, mkdirSync } = await import("node:fs");
  const dest = path.resolve(process.argv[4]);
  mkdirSync(dest, { recursive: true });
  for (const rel of transmis) {
    const cible = path.join(dest, rel);
    mkdirSync(path.dirname(cible), { recursive: true });
    copyFileSync(path.join(RACINE, rel), cible);
  }
  console.log(`${transmis.length} fichier(s) copies vers ${dest}\n`);
}

console.log(`${transmis.length} fichier(s) seraient transmis a Vercel.\n`);

const INTERDITS = [
  /^\.env$/,
  /^\.env\.(?!example$)/,
  /^\.neon$/,
  /^data\//,
  /^public\/avatars\//,
  /node_modules/,
  /^\.next\//,
];

const fuites = transmis.filter((f) => INTERDITS.some((r) => r.test(f)));
if (fuites.length) {
  console.log("ECHEC — ces fichiers partiraient :");
  for (const f of fuites) console.log("  " + f);
  process.exit(1);
}
console.log("OK — aucun secret ni fichier local parmi les fichiers transmis.");
console.log("\nEchantillon transmis :");
for (const f of transmis.slice(0, 8)) console.log("  " + f);
console.log("  ...");
const env = transmis.find((f) => f.includes("env"));
console.log(env ? "  " + env : "  (aucun fichier d'environnement)");
