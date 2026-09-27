import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { USER_ROLES, type UserRole } from "./types";

export interface WikiUser {
  username: string;
  /** Mot de passe en clair (développement) ou hash au format `scrypt$sel$empreinte`. */
  password: string;
  role: UserRole;
}

/**
 * Comptes d'édition définis par la variable d'environnement WIKI_USERS :
 *
 *   WIKI_USERS="esto:motdepasse:dauphin,baillit1:motdepasse2:baillit"
 *
 * Format de chaque entrée : `identifiant:motdepasse:charge`, entrées séparées
 * par des virgules. Les charges sont celles de la Constitution (article P-1) :
 *   dauphin | regent | conseil | baillit | premier-ministre | ministre
 *   | representant | depute
 *
 * En production, utilisez un hash scrypt plutôt qu'un mot de passe en clair :
 *   node scripts/hash-password.mjs "votre mot de passe"
 *   WIKI_USERS="esto:scrypt$sel$empreinte:dauphin"
 *
 * Droits sur le wiki :
 *   - dauphin   : tout, y compris suppression d'articles et synchronisation Discord
 *   - regent, conseil, baillit : création, modification, restauration
 *   - les autres charges : consultation seule
 *
 * Compatibilité : si WIKI_USERS est vide, ADMIN_USERNAME / ADMIN_PASSWORD
 * créent un compte unique avec la charge `dauphin`.
 */
function parseUsers(): WikiUser[] {
  const users: WikiUser[] = [];

  const raw = process.env.WIKI_USERS;
  if (raw && raw.trim()) {
    for (const entry of raw.split(/[;,]/)) {
      const [username, password, role] = entry.split(":").map((part) => part.trim());
      if (!username || !password) continue;
      if (!(USER_ROLES as readonly string[]).includes(role ?? "")) continue;
      users.push({ username, password, role: role as UserRole });
    }
  }

  if (users.length === 0 && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    users.push({
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
      role: "dauphin",
    });
  }

  return users;
}

/** Liste des comptes sans les mots de passe (affichage admin). */
export function listUsers(): Array<{ username: string; role: UserRole }> {
  return parseUsers().map(({ password: _password, ...user }) => user);
}

export function getUserRole(username: string): UserRole | null {
  return parseUsers().find((user) => user.username === username)?.role ?? null;
}

/** Vérifie un mot de passe face à une entrée utilisateur (clair ou scrypt). */
function checkPassword(candidate: string, stored: string): boolean {
  if (stored.startsWith("scrypt$")) {
    const [, saltHex, hashHex] = stored.split("$");
    if (!saltHex || !hashHex) return false;
    try {
      const expected = Buffer.from(hashHex, "hex");
      const actual = scryptSync(candidate, Buffer.from(saltHex, "hex"), expected.length);
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  // Développement : comparaison en temps constant sur l'empreinte.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(stored));
}

/** Comparaison en temps constant (SHA-256 + timingSafeEqual), scrypt si hashé. */
export function verifyCredentials(username: string, password: string): boolean {
  const users = parseUsers();
  if (users.length === 0) {
    console.error("[auth] Aucun compte d'édition configuré (WIKI_USERS ou ADMIN_*).");
    return false;
  }

  const digest = (value: string) => createHash("sha256").update(value).digest();

  return users.some(
    (user) =>
      timingSafeEqual(digest(username), digest(user.username)) &&
      checkPassword(password, user.password),
  );
}
