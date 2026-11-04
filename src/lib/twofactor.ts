import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { verifyHashedSecret } from "./users";

/**
 * Authentification à deux facteurs par code envoyé en message privé Discord.
 *
 * ## Le principe
 *
 * Le mot de passe seul ne suffit plus : après sa vérification, le serveur tire
 * un code à six chiffres, l'envoie par MP Discord au titulaire du compte, et
 * n'ouvre la session qu'une fois ce code recopié. Un mot de passe volé ne suffit
 * donc plus — il faut aussi accéder au compte Discord.
 *
 * ## Ce qui n'est jamais stocké
 *
 * Le code en clair n'existe que le temps d'un appel HTTP : il est envoyé à
 * Discord, puis oublié. La mémoire du serveur ne garde qu'une **empreinte
 * HMAC**, et cette empreinte est liée à l'identifiant du défi (`challengeId`).
 * Quelqu'un qui lirait la mémoire du processus n'y trouverait donc pas de code
 * utilisable : il faudrait casser le HMAC, et le résultat ne vaudrait que pour
 * ce défi, déjà consommé.
 *
 * ## Les garde-fous
 *
 *   - **durée de vie** : 5 minutes ;
 *   - **tentatives** : 5 par défi, puis le défi est détruit ;
 *   - **usage unique** : un défi qui aboutit est supprimé ;
 *   - **comparaison en temps constant** : pas de fuite par le temps de réponse ;
 *   - **purge** : les défis expirés sont balayés à chaque création.
 *
 * ## Le cas où Discord est injoignable
 *
 * Un code de secours (`WIKI_2FA_RECOVERY`, haché en scrypt) permet de se
 * connecter sans MP. Sans lui, un compte dont les MP sont fermés serait
 * définitivement inaccessible — ce qui est une panne, pas une sécurité.
 */

/** Durée de vie d'un code, en millisecondes. */
export const CODE_TTL_MS = 5 * 60 * 1000;

/** Nombre de tentatives autorisées par défi. */
export const MAX_ATTEMPTS = 5;

/** Au-delà, on purge les défis expirés : la Map ne doit pas croître sans fin. */
const MAX_CHALLENGES = 2_000;

interface Challenge {
  username: string;
  /** HMAC du code, jamais le code lui-même. */
  empreinte: Buffer;
  expiresAt: number;
  attempts: number;
}

const challenges = new Map<string, Challenge>();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Destinataires par compte, lus dans `WIKI_2FA`.
 *
 * Format : `compte:idDiscord` ou `compte:id1+id2`, entrées séparées par des
 * virgules. Exemple :
 *
 *   WIKI_2FA="eitam:1377681054550196295,esto:1467301113710514309+1470468669866774632"
 *
 * Un compte peut avoir plusieurs identifiants : le code part vers tous, et le
 * premier qui aboutit suffit. C'est le cas d'Esto, qui utilise deux comptes
 * Discord.
 */
export function twoFactorRecipients(): Map<string, string[]> {
  const table = new Map<string, string[]>();
  const brut = process.env.WIKI_2FA?.trim();
  if (!brut) return table;

  for (const entree of brut.split(",")) {
    const [compte, ids] = entree.split(":").map((partie) => partie?.trim());
    if (!compte || !ids) continue;
    const liste = ids
      .split("+")
      .map((id) => id.trim())
      .filter((id) => /^\d{15,25}$/.test(id));
    if (liste.length > 0) table.set(compte.toLowerCase(), liste);
  }
  return table;
}

/**
 * Vrai si l'A2F est configurée pour au moins un compte.
 *
 * Attention : dès qu'elle l'est, **tous** les comptes doivent avoir leurs
 * destinataires. Un compte oublié se voit refuser la connexion plutôt que de
 * contourner silencieusement la double authentification — un oubli de
 * configuration ne doit pas devenir une porte ouverte.
 */
export function twoFactorEnabled(): boolean {
  return twoFactorRecipients().size > 0;
}

/** Identifiants Discord d'un compte, ou tableau vide. */
export function recipientsFor(username: string): string[] {
  return twoFactorRecipients().get(username.trim().toLowerCase()) ?? [];
}

// ---------------------------------------------------------------------------
// Défis
// ---------------------------------------------------------------------------

function secret(): string {
  const valeur = process.env.AUTH_SECRET;
  if (!valeur) throw new Error("AUTH_SECRET n'est pas défini : impossible de signer l'A2F.");
  return valeur;
}

/**
 * Empreinte du code, liée au défi.
 *
 * Le `challengeId` entre dans le calcul : deux défis successifs tirant le même
 * code produisent des empreintes différentes, et une empreinte volée ne peut
 * pas être rejouée sur un autre défi.
 */
function empreinte(code: string, challengeId: string): Buffer {
  return createHmac("sha256", secret()).update(`${challengeId}:${code}`).digest();
}

function purger(maintenant: number): void {
  for (const [id, defi] of challenges) {
    if (defi.expiresAt <= maintenant) challenges.delete(id);
  }
  // Filet de sécurité : si la purge temporelle ne suffit pas (attaque qui
  // créerait des défis valides en masse), on retire les plus anciens.
  if (challenges.size > MAX_CHALLENGES) {
    const exces = challenges.size - MAX_CHALLENGES;
    let retires = 0;
    for (const id of challenges.keys()) {
      challenges.delete(id);
      if (++retires >= exces) break;
    }
  }
}

export interface ChallengeCree {
  challengeId: string;
  /** Code en clair — à transmettre à Discord, jamais à journaliser. */
  code: string;
}

/**
 * Tire un code, mémorise son empreinte et renvoie les deux.
 *
 * `randomInt` est cryptographique (contrairement à `Math.random`) : les codes
 * sont uniformément répartis, sans biais exploitable.
 */
export function createChallenge(username: string): ChallengeCree {
  const maintenant = Date.now();
  purger(maintenant);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const challengeId = randomUUID();

  challenges.set(challengeId, {
    username: username.trim(),
    empreinte: empreinte(code, challengeId),
    expiresAt: maintenant + CODE_TTL_MS,
    attempts: 0,
  });

  return { challengeId, code };
}

export type ResultatVerification =
  | { ok: true; username: string }
  | { ok: false; motif: "inconnu" | "expire" | "trop_de_tentatives" | "incorrect" };

/**
 * Vérifie un code face à un défi.
 *
 * Le défi est détruit dans tous les cas d'échec définitif : au-delà de cinq
 * tentatives, il ne sert plus à rien de le garder — et le garder
 * permettrait de continuer à deviner.
 */
export function verifyChallenge(challengeId: string, code: string): ResultatVerification {
  const defi = challenges.get(challengeId);
  if (!defi) return { ok: false, motif: "inconnu" };

  if (defi.expiresAt <= Date.now()) {
    challenges.delete(challengeId);
    return { ok: false, motif: "expire" };
  }

  defi.attempts += 1;
  if (defi.attempts > MAX_ATTEMPTS) {
    challenges.delete(challengeId);
    return { ok: false, motif: "trop_de_tentatives" };
  }

  const attendu = defi.empreinte;
  const fourni = empreinte(code.trim(), challengeId);

  if (attendu.length !== fourni.length || !timingSafeEqual(attendu, fourni)) {
    // Dernière tentative ratée : on nettoie tout de suite.
    if (defi.attempts >= MAX_ATTEMPTS) challenges.delete(challengeId);
    return { ok: false, motif: "incorrect" };
  }

  challenges.delete(challengeId);
  return { ok: true, username: defi.username };
}

/**
 * Code de secours, utilisé quand Discord est injoignable.
 *
 * Il est stocké haché (`WIKI_2FA_RECOVERY`, produit par
 * `node scripts/hash-password.mjs`) et comparé en temps constant. Volontairement
 * **sans expiration** : c'est une clé de secours, pas un code à usage unique —
 * sa valeur tient à sa longueur, pas à sa fraîcheur. Le changer consiste à
 * régénérer la variable.
 */
export function verifyRecoveryCode(candidat: string): boolean {
  const stocke = process.env.WIKI_2FA_RECOVERY?.trim();
  if (!stocke) return false;
  return verifyHashedSecret(candidat, stocke);
}

/** Nombre de défis en cours — exposé pour la page d'état de l'admin. */
export function pendingChallenges(): number {
  const maintenant = Date.now();
  let total = 0;
  for (const defi of challenges.values()) if (defi.expiresAt > maintenant) total += 1;
  return total;
}

/** Empreinte d'un identifiant Discord, pour les journaux (jamais l'identifiant brut). */
export function masquerIdDiscord(id: string): string {
  const digest = createHash("sha256").update(id).digest("hex");
  return `${id.slice(0, 4)}…${digest.slice(0, 6)}`;
}
