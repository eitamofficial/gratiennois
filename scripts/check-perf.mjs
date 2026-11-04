#!/usr/bin/env node
/**
 * Budget de performance.
 *
 * Le wiki tourne sur une tablette : une page lourde ne ralentit pas seulement le
 * visiteur, elle occupe la seule machine qui sert tout le monde. Ce script
 * mesure ce qui est réellement transféré et échoue au-delà du budget.
 *
 *   node scripts/check-perf.mjs [url-de-base]
 *
 * Budgets volontairement simples : ils portent sur le HTML et le temps de
 * réponse, les deux choses qu'un serveur unique peut dégrader sans qu'on le
 * remarque.
 */

const BASE = process.argv[2] ?? "https://wiki-gratiennois.duckdns.org";

/** Budget par page : octets de HTML et millisecondes. */
const BUDGET = {
  html: 120_000,
  ms: 2_500,
};

const PAGES = [
  { chemin: "/", nom: "accueil" },
  { chemin: "/wiki", nom: "index du wiki" },
  { chemin: "/portails", nom: "portails" },
  { chemin: "/arbre", nom: "arborescence" },
  { chemin: "/wiki/eitam", nom: "article" },
  { chemin: "/recherche?q=dauphin", nom: "recherche" },
  { chemin: "/repertoire", nom: "répertoire" },
];

let depassements = 0;

console.log(`budget : ${(BUDGET.html / 1024).toFixed(0)} Ko de HTML, ${BUDGET.ms} ms\n`);

for (const page of PAGES) {
  const debut = Date.now();
  let taille = 0;
  let statut = 0;
  try {
    const reponse = await fetch(BASE + page.chemin, {
      headers: { "accept-encoding": "gzip, br" },
      signal: AbortSignal.timeout(15_000),
    });
    statut = reponse.status;
    const corps = await reponse.arrayBuffer();
    taille = corps.byteLength;
  } catch (erreur) {
    console.log(`KO  ${page.nom.padEnd(16)} injoignable (${String(erreur?.message ?? erreur).slice(0, 60)})`);
    depassements += 1;
    continue;
  }
  const duree = Date.now() - debut;
  const tropGros = taille > BUDGET.html;
  const tropLent = duree > BUDGET.ms;
  const ok = statut === 200 && !tropGros && !tropLent;

  if (!ok) depassements += 1;
  console.log(
    `${ok ? "ok " : "KO "} ${page.nom.padEnd(16)} ${String(statut).padEnd(4)} ` +
      `${(taille / 1024).toFixed(0).padStart(4)} Ko  ${String(duree).padStart(5)} ms` +
      `${tropGros ? "  HTML trop lourd" : ""}${tropLent ? "  trop lent" : ""}`,
  );
}

console.log(`\n${PAGES.length} pages — ${depassements} dépassement(s).`);
process.exit(depassements === 0 ? 0 : 1);
