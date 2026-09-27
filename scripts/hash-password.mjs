/**
 * Génère un hash de mot de passe (scrypt) pour WIKI_USERS.
 *
 *   node scripts/hash-password.mjs "mon mot de passe"
 *
 * Collez le résultat dans .env à la place du mot de passe en clair :
 *   WIKI_USERS="esto:scrypt$<sel>:<empreinte>:dauphin"
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error("Usage : node scripts/hash-password.mjs \"mot de passe\"");
  process.exit(1);
}
if (password.length < 12) {
  console.warn("⚠  Moins de 12 caractères : utilisez un mot de passe long et unique.");
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64).toString("hex");

console.log("\nMot de passe à copier dans .env (après l'identifiant et «:»):\n");
console.log(`scrypt$${salt.toString("hex")}$${hash}`);
console.log("\nExemple : WIKI_USERS=\"esto:scrypt$abc123$def456:dauphin\"\n");
