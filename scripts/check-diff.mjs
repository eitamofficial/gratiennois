/**
 * Vérification de l'algorithme de diff (src/lib/diff.ts) sans dépendance de test.
 *   node scripts/check-diff.mjs
 * Code de sortie : 0 si tous les cas passent.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const dir = await mkdtemp(path.join(tmpdir(), "difftest-"));
const tsc = path.join("node_modules", "typescript", "bin", "tsc");
console.log("Compilation de src/lib/diff.ts …");
execFileSync(
  process.execPath,
  [
    tsc,
    "src/lib/diff.ts",
    "--outDir",
    dir,
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--skipLibCheck",
  ],
  { stdio: "inherit" },
);

const { diffLines, diffWords, diffStats, groupDiff } = await import(
  pathToFileURL(path.join(dir, "diff.js")).href
);

let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    failures++;
    console.log(`  ❌ ${label} ${detail}`);
  }
};

console.log("\nDiff ligne à ligne");
const before = "Article 1\nLe Dauphin commande.\nArticle 2\nFin du texte.";
const after = "Article 1\nLe Dauphin commande au Conseil.\nArticle 2\nFin du texte.";
const chunks = diffLines(before, after);
const stats = diffStats(chunks);
check("une ligne modifiée détectée", stats.removed === 1 && stats.added === 1, JSON.stringify(stats));
check(
  "texte identique préservé",
  chunks.filter((c) => c.kind === "equal").map((c) => c.text).join("\n") === "Article 1\nArticle 2\nFin du texte.",
);

const identical = diffLines(before, before);
check("documents identiques → aucun changement", diffStats(identical).added === 0 && diffStats(identical).removed === 0);

const addition = diffLines("A\nB", "A\nB\nC");
check("ajout en fin détecté", diffStats(addition).added === 1);

const removal = diffLines("A\nB\nC", "A\nC");
check("suppression au milieu détectée", diffStats(removal).removed === 1 && diffStats(removal).added === 0);

console.log("\nDiff mot à mot");
const words = diffWords("Le chat dort", "Le chien dort");
const wordAdded = words.filter((c) => c.kind === "added").map((c) => c.text).join("");
check("mot remplacé identifié", wordAdded === "chien", `→ "${wordAdded}"`);

console.log("\nRegroupement des modifications");
const groups = groupDiff(chunks);
const change = groups.find((g) => g.kind === "change");
check("un groupe de modification présent", Boolean(change));
check(
  "diff mot à mot calculé dans le groupe",
  Boolean(change && change.wordChunks.length > 0),
);
if (change) {
  const addedWords = change.wordChunks
    .filter((c) => c.kind === "added")
    .map((c) => c.text)
    .join("");
  console.log(`     → mots ajoutés : "${addedWords.trim()}"`);
}

console.log(failures === 0 ? "\n✅ Diff conforme\n" : `\n❌ ${failures} test(s) en échec\n`);
process.exit(failures === 0 ? 0 : 1);
