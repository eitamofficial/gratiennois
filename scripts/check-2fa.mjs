/**
 * Banc d'essai de l'authentification à deux facteurs.
 *
 * ## Pourquoi tester le moteur plutôt que l'écran
 *
 * Un formulaire peut sembler fonctionner tout en laissant passer un code faux,
 * en acceptant deux fois le même code, ou en ignorant l'expiration. Ces défauts
 * ne se voient pas à l'œil : ils se voient quand on essaie de les exploiter.
 * Chaque cas ci-dessous correspond donc à une **attaque** :
 *
 *   - rejouer un code déjà utilisé ;
 *   - deviner par force brute ;
 *   - utiliser un code après expiration ;
 *   - présenter un défi inventé.
 *
 * Le module réel est chargé par transpilation (même technique que
 * `check-markdown.mjs`), avec ses vraies dépendances : on ne teste pas une
 * réécriture, on teste le code livré.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Chargement du graphe de modules src/lib (types → users → twofactor)
// ---------------------------------------------------------------------------

const ts = require("typescript");
const charges = new Map();

function charger(fichier) {
  if (charges.has(fichier)) return charges.get(fichier);

  const source = readFileSync(path.join(ROOT, "src", "lib", fichier), "utf8");
  const js = ts
    .transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    })
    .outputText.replace(/Object\.defineProperty\(exports, "__esModule"[\s\S]*?\);/m, "");

  const module = { exports: {} };
  charges.set(fichier, module.exports);

  const requireLocal = (id) => {
    if (id.startsWith("./")) {
      const cible = id.slice(2);
      return charger(cible.endsWith(".ts") ? cible : `${cible}.ts`);
    }
    return require(id);
  };

  // `exports` est réaffecté par le module : on lit `module.exports` après coup.
  const executer = new Function("exports", "require", "module", js);
  executer(module.exports, requireLocal, module);

  charges.set(fichier, module.exports);
  return module.exports;
}

// ---------------------------------------------------------------------------
// Environnement de test
// ---------------------------------------------------------------------------

process.env.AUTH_SECRET = "secret-de-test-uniquement-pour-le-banc-d-essai";

// Les deux comptes Discord d'Esto, tels que fournis par le Premier Ministre.
process.env.WIKI_2FA =
  "eitam:1377681054550196295,esto:1467301113710514309+1470468669866774632";

const { scryptSync, randomBytes } = require("node:crypto");
const sel = randomBytes(16);
const empreinte = scryptSync("CODE-DE-SECOURS-DE-TEST", sel, 32);
process.env.WIKI_2FA_RECOVERY = `scrypt$${sel.toString("hex")}$${empreinte.toString("hex")}`;

const deuxfacteurs = charger("twofactor.ts");

// ---------------------------------------------------------------------------
// Petit cadre d'assertions
// ---------------------------------------------------------------------------

let echecs = 0;
let total = 0;

function verifier(intitule, condition, detail = "") {
  total += 1;
  if (condition) {
    console.log(`  ok    ${intitule}`);
  } else {
    echecs += 1;
    console.log(`  ÉCHEC ${intitule}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------------------

console.log("\n=== Configuration ===");

const destinataires = deuxfacteurs.twoFactorRecipients();
verifier("A2F détectée comme active", deuxfacteurs.twoFactorEnabled() === true);
verifier(
  "Eitam a bien un destinataire",
  JSON.stringify(destinataires.get("eitam")) === JSON.stringify(["1377681054550196295"]),
);
verifier(
  "Esto a bien deux destinataires",
  JSON.stringify(destinataires.get("esto")) ===
    JSON.stringify(["1467301113710514309", "1470468669866774632"]),
  JSON.stringify(destinataires.get("esto")),
);
verifier(
  "un compte inconnu n'a aucun destinataire",
  deuxfacteurs.recipientsFor("inconnu").length === 0,
);

console.log("\n=== Génération du code ===");

const { challengeId, code } = deuxfacteurs.createChallenge("eitam");
verifier("le défi a un identifiant", typeof challengeId === "string" && challengeId.length > 10);
verifier("le code fait six chiffres", /^\d{6}$/.test(code), code);

const codes = new Set();
for (let i = 0; i < 40; i += 1) codes.add(deuxfacteurs.createChallenge("eitam").code);
verifier("les codes ne sont pas constants", codes.size > 30, `${codes.size}/40 distincts`);

console.log("\n=== Vérification ===");

verifier(
  "un code faux est refusé",
  deuxfacteurs.verifyChallenge(challengeId, "000000").ok === false,
);
verifier(
  "le bon code est accepté",
  deuxfacteurs.verifyChallenge(challengeId, code).ok === true,
);
verifier(
  "le même code ne peut pas être rejoué",
  deuxfacteurs.verifyChallenge(challengeId, code).ok === false,
);

console.log("\n=== Force brute ===");

const attaque = deuxfacteurs.createChallenge("esto");
let refuse = 0;
for (let i = 0; i < 8; i += 1) {
  if (!deuxfacteurs.verifyChallenge(attaque.challengeId, "111111").ok) refuse += 1;
}
verifier("toutes les tentatives fausses sont refusées", refuse === 8);
const apresBruteforce = deuxfacteurs.verifyChallenge(attaque.challengeId, attaque.code);
verifier(
  "le défi est détruit après trop d'essais, même avec le bon code",
  apresBruteforce.ok === false,
);

console.log("\n=== Expiration ===");

const perime = deuxfacteurs.createChallenge("eitam");
const vraiNow = Date.now;
Date.now = () => vraiNow() + 6 * 60 * 1000; // six minutes plus tard
const apresExpiration = deuxfacteurs.verifyChallenge(perime.challengeId, perime.code);
Date.now = vraiNow;
verifier("un code expiré est refusé", apresExpiration.ok === false);
verifier("le motif est bien l'expiration", apresExpiration.motif === "expire", apresExpiration.motif);

console.log("\n=== Défi inventé ===");

verifier(
  "un identifiant de défi inconnu est refusé",
  deuxfacteurs.verifyChallenge("00000000-0000-0000-0000-000000000000", "123456").ok === false,
);

console.log("\n=== Code de secours ===");

verifier(
  "le bon code de secours est accepté",
  deuxfacteurs.verifyRecoveryCode("CODE-DE-SECOURS-DE-TEST") === true,
);
verifier(
  "un code de secours faux est refusé",
  deuxfacteurs.verifyRecoveryCode("CODE-DE-SECOURS-DE-TES") === false,
);
verifier(
  "un code de secours vide est refusé",
  deuxfacteurs.verifyRecoveryCode("") === false,
);

// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(56));
if (echecs === 0) {
  console.log(`${total} vérifications, aucune anomalie.`);
  process.exit(0);
}
console.log(`${echecs} échec(s) sur ${total} vérifications.`);
process.exit(1);
