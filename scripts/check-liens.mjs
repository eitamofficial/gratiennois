#!/usr/bin/env node
/**
 * Vérificateur de liens externes.
 *
 * Un article qui cite une source morte n'est plus vérifiable. Ce script
 * parcourt `data/articles.json`, teste chaque lien sortant et signale les
 * réponses qui ne sont ni 2xx ni 3xx.
 *
 *   node scripts/check-liens.mjs [--ecrire]
 *
 * `--ecrire` enregistre le rapport dans `data/rapports/liens.json`, que la page
 * d'administration pourra lire. Sans l'option, il ne fait qu'afficher.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const LIMITE = 120;
const DELAI = 10_000;

function liensDe(contenu) {
  const liens = [];
  for (const match of contenu.matchAll(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi)) {
    liens.push(match[1]);
  }
  return liens;
}

async function tester(url) {
  // HEAD d'abord : moins coûteux. Certains serveurs le refusent (405), on
  // retente alors en GET, sans lire le corps.
  for (const methode of ["HEAD", "GET"]) {
    try {
      const reponse = await fetch(url, {
        method: methode,
        redirect: "follow",
        signal: AbortSignal.timeout(DELAI),
        headers: { "user-agent": "wiki-gratianopolis/1.0 (vérification de liens)" },
      });
      if (reponse.status === 405 && methode === "HEAD") continue;
      return { statut: reponse.status, ok: reponse.status < 400 };
    } catch (erreur) {
      if (methode === "GET") {
        return { statut: 0, ok: false, erreur: String(erreur?.message ?? erreur).slice(0, 120) };
      }
    }
  }
  return { statut: 0, ok: false, erreur: "injoignable" };
}

const articles = JSON.parse(await readFile(path.join(ROOT, "data/articles.json"), "utf8"));
const cibles = [];
const vus = new Set();

for (const article of articles) {
  for (const url of liensDe(article.content ?? "")) {
    const cle = `${article.slug}\u0000${url}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    cibles.push({ slug: article.slug, url });
  }
}

console.log(`\n${cibles.length} liens externes dans ${articles.length} articles.\n`);

const resultats = [];
let morts = 0;
for (const cible of cibles.slice(0, LIMITE)) {
  const resultat = await tester(cible.url);
  resultats.push({ ...cible, ...resultat });
  if (!resultat.ok) {
    morts += 1;
    console.log(`  ✕ ${cible.slug.padEnd(32)} ${resultat.statut || "—"}  ${cible.url}`);
  }
}

if (cibles.length > LIMITE) {
  console.log(`\n  (limité aux ${LIMITE} premiers liens ; relancer avec LIMITE plus haut)`);
}

console.log(`\n${cibles.length - morts} liens vivants, ${morts} à vérifier.\n`);

if (process.argv.includes("--ecrire")) {
  await mkdir(path.join(ROOT, "data/rapports"), { recursive: true });
  await writeFile(
    path.join(ROOT, "data/rapports/liens.json"),
    JSON.stringify({ at: new Date().toISOString(), total: cibles.length, morts, resultats }, null, 2),
    "utf8",
  );
  console.log("Rapport écrit dans data/rapports/liens.json");
}

process.exit(morts > 0 ? 1 : 0);
