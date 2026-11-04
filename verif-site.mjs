import { chromium } from "playwright";

const routes = [
  "/", "/wiki", "/personnalites", "/institutions", "/constitution", "/tags",
  "/recherche?q=dauphin", "/plan", "/credits", "/bot", "/la-loba", "/programme",
  "/manifeste-psrg", "/portails", "/repertoire", "/galerie", "/homonymie",
  "/a-propos", "/statut", "/calendrier", "/sondages", "/comparer",
  "/wiki/categorie/histoire", "/wiki/categorie/personnalites",
  "/wiki/eitam", "/wiki/eitam/versions", "/wiki/eitam/imprimer",
  "/wiki/la-constitution", "/wiki/le-premier-ministre", "/wiki/esto",
  "/connexion", "/404-page-inexistante",
];

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(`${e.message.slice(0, 120)}`));
page.on("console", (m) => { if (m.type() === "error") erreurs.push(`${m.text().slice(0, 120)}`); });

let soucis = 0;
for (const route of routes) {
  erreurs.length = 0;
  let statut = 0;
  try {
    const r = await page.goto("https://wiki-gratiennois.duckdns.org" + route, { waitUntil: "domcontentloaded", timeout: 45000 });
    statut = r?.status() ?? 0;
    await page.waitForTimeout(400);
  } catch { statut = -1; }
  const texte = await page.locator("body").innerText().catch(() => "");
  const enErreur = texte.includes("rencontre un problème technique");
  const ok = !enErreur && erreurs.length === 0 && statut < 500;
  if (!ok) soucis += 1;
  console.log(`${ok ? "ok " : "KO "} ${route.padEnd(34)} ${String(statut).padEnd(4)} js:${erreurs.length}${enErreur ? " ERREUR-AFFICHEE" : ""}`);
  if (!ok) erreurs.slice(0, 1).forEach((e) => console.log("      ", e));
}

console.log(`\n${routes.length} routes testées, ${soucis} problème(s).`);
await browser.close();
