#!/usr/bin/env node
/**
 * Test de non-régression navigateur.
 *
 * Les tests existants (`check:xss`, `check:2fa`, `check:markdown`) vérifient du
 * code exécuté hors navigateur. Ils n'auraient jamais vu le bug du
 * 4 novembre : `classList.toggle("")` levait une SyntaxError **à
 * l'hydratation**, le serveur répondait 200, et toutes les fiches affichaient
 * une page d'erreur dans un vrai navigateur.
 *
 * Ce script charge les pages dans Chrome et échoue si :
 *   - une page affiche la frontière d'erreur ;
 *   - une erreur JavaScript est émise en console ;
 *   - un bouton de confort casse la page au clic.
 *
 *   node scripts/check-navigateur.mjs [url-de-base]
 *
 * Dépendance optionnelle : `npm install --no-save playwright`. Sans elle, le
 * script s'arrête avec un message explicite plutôt qu'un échec obscur.
 */

const BASE = process.argv[2] ?? "https://wiki-gratiennois.duckdns.org";

const ROUTES = [
  "/",
  "/wiki",
  "/personnalites",
  "/institutions",
  "/constitution",
  "/manifeste-psrg",
  "/tags",
  "/recherche?q=dauphin",
  "/plan",
  "/credits",
  "/bot",
  "/portails",
  "/repertoire",
  "/galerie",
  "/homonymie",
  "/a-propos",
  "/statut",
  "/calendrier",
  "/sondages",
  "/comparer",
  "/wiki/categorie/histoire",
  "/wiki/eitam",
  "/wiki/eitam/versions",
  "/wiki/eitam/imprimer",
  "/connexion",
];

/** Texte de la frontière d'erreur de l'application. */
const MARQUEUR_ERREUR = "rencontre un problème technique";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "playwright est absent. Installez-le sans l'ajouter au projet :\n" +
      "  npm install --no-save playwright\n" +
      "  npx playwright install chromium   # ou utilisez --channel=chrome",
  );
  process.exit(2);
}

const navigateur = await chromium.launch({ channel: process.env.NAVIGATEUR ?? "chrome" });
const page = await navigateur.newPage();

const erreurs = [];
page.on("pageerror", (erreur) => erreurs.push(erreur.message.slice(0, 200)));
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const texte = message.text();
  // Une 404 demandée volontairement journalise une erreur réseau : ce n'est pas
  // un défaut de la page.
  if (/status of 404/.test(texte)) return;
  erreurs.push(texte.slice(0, 200));
});

let problemes = 0;

for (const route of ROUTES) {
  erreurs.length = 0;
  let statut = 0;
  try {
    const reponse = await page.goto(BASE + route, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    statut = reponse?.status() ?? 0;
    await page.waitForTimeout(350);
  } catch (erreur) {
    erreurs.push(`navigation : ${String(erreur?.message ?? erreur).slice(0, 120)}`);
  }

  const texte = await page.locator("body").innerText().catch(() => "");
  const enErreur = texte.includes(MARQUEUR_ERREUR);
  const ok = !enErreur && erreurs.length === 0 && statut > 0 && statut < 500;

  if (!ok) problemes += 1;
  console.log(
    `${ok ? "ok " : "KO "} ${route.padEnd(32)} ${String(statut).padEnd(4)}` +
      `${enErreur ? " ERREUR-AFFICHEE" : ""}${erreurs.length ? ` js:${erreurs.length}` : ""}`,
  );
  if (!ok) erreurs.slice(0, 2).forEach((erreur) => console.log("      ", erreur));
}

// --- Les boutons de confort, là où le bug du 4 novembre se produisait --------

erreurs.length = 0;
await page.goto(`${BASE}/wiki/eitam`, { waitUntil: "networkidle" });

for (const [nom, classe] of [
  ["Sépia", "lecture-sepia"],
  ["Contraste", "lecture-contraste"],
  ["A++", "lecture-texte-tres-grand"],
  ["Nuit", null],
]) {
  const bouton = page.getByRole("button", { name: nom, exact: false }).first();
  if ((await bouton.count()) === 0) {
    console.log(`KO  bouton « ${nom} » introuvable`);
    problemes += 1;
    continue;
  }
  await bouton.click();
  await page.waitForTimeout(200);
  if (classe) {
    const appliquee = await page.evaluate(
      (nomClasse) => document.documentElement.classList.contains(nomClasse),
      classe,
    );
    if (!appliquee) {
      console.log(`KO  « ${nom} » n'applique pas ${classe}`);
      problemes += 1;
    }
  }
}

if (erreurs.length > 0) {
  problemes += 1;
  console.log(`KO  outils d'article : ${erreurs.length} erreur(s) JavaScript`);
  erreurs.slice(0, 2).forEach((erreur) => console.log("      ", erreur));
}

await navigateur.close();

console.log(`\n${ROUTES.length} routes + outils d'article — ${problemes} problème(s).`);
process.exit(problemes === 0 ? 0 : 1);
