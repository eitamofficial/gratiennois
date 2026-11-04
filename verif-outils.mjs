import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 160)));
page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text().slice(0, 160)); });

await page.goto("https://wiki-gratiennois.duckdns.org/wiki/eitam", { waitUntil: "networkidle" });

async function clic(nom) {
  const bouton = page.getByRole("button", { name: nom, exact: false }).first();
  if (!(await bouton.count())) { console.log(`  ${nom} : absent`); return; }
  await bouton.click();
  await page.waitForTimeout(300);
  console.log(`  ${nom} : cliqué, erreurs=${erreurs.length}`);
}

console.log("Boutons de l'article :");
await clic("Sépia");
console.log("    classe sepia appliquée :", await page.evaluate(() => document.documentElement.classList.contains("lecture-sepia")));
await clic("Contraste");
console.log("    classe contraste appliquée :", await page.evaluate(() => document.documentElement.classList.contains("lecture-contraste")));
await clic("A++");
console.log("    classe texte appliquée :", await page.evaluate(() => document.documentElement.classList.contains("lecture-texte-tres-grand")));
await clic("Nuit");
await clic("Écouter");

// Barre de recherche : le raccourci « / » doit donner le focus.
await page.keyboard.press("Escape");
await page.locator("body").click({ position: { x: 5, y: 5 } });
await page.keyboard.press("/");
await page.waitForTimeout(200);
console.log("  raccourci « / » : focus =", await page.evaluate(() => document.activeElement?.getAttribute("aria-label")));

console.log("\nErreurs JS totales :", erreurs.length);
erreurs.slice(0, 3).forEach((e) => console.log("  ", e));
await browser.close();
