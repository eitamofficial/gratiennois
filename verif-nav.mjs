import { chromium } from "playwright";

const pages = ["/wiki/eitam", "/wiki/esto", "/", "/repertoire", "/portails"];
let browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext();
const page = await context.newPage();

const erreurs = [];
page.on("console", (msg) => { if (msg.type() === "error") erreurs.push(`[console] ${msg.text().slice(0, 200)}`); });
page.on("pageerror", (err) => erreurs.push(`[page] ${err.message.slice(0, 200)}`));

for (const chemin of pages) {
  erreurs.length = 0;
  const reponse = await page.goto("https://wiki-gratiennois.duckdns.org" + chemin, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  const texte = await page.locator("body").innerText();
  const enErreur = texte.includes("rencontre un problème technique");
  console.log(`${chemin.padEnd(16)} HTTP ${reponse?.status()} | erreur affichée: ${enErreur ? "OUI" : "non"} | erreurs JS: ${erreurs.length}`);
  erreurs.slice(0, 2).forEach((e) => console.log("   ", e));
}

await browser.close();
