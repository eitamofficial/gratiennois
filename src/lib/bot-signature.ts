import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Authentification des requêtes envoyées par le **bot Discord** vers le wiki.
 *
 * Le bot tourne hors du site (sur son propre serveur) : il ne peut donc pas
 * présenter de cookie de session. Il s'authentifie avec une **signature HMAC**
 * du corps de la requête, calculée avec un secret partagé — le même principe
 * qu'un webhook, mais avec un secret au lieu d'une URL.
 *
 * Trois propriétés :
 *   - le corps est signé **intégralement** : une charge utile modifiée est
 *     rejetée, ce qui empêche un intermédiaire d'ajouter des rôles ou des
 *     identifiants ;
 *   - la comparaison est **à temps constant** : pas de fuite par timing ;
 *   - un **horodatage** borne la fenêtre d'usage, pour qu'une requête
 *     interceptée ne soit rejouable que brièvement.
 */

export const BOT_SIGNATURE_HEADER = "x-wiki-signature";
export const BOT_TIMESTAMP_HEADER = "x-wiki-timestamp";

/** Fenêtre de validité d'une requête signée (5 minutes). */
export const SIGNATURE_WINDOW_MS = 5 * 60 * 1000;

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Calcule la signature attendue pour un corps et un horodatage. */
export function signBody(secret: string, body: string, timestamp: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export interface SignatureCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Vérifie une requête signée. Le corps est fourni **en texte brut** : il faut
 * le lire une seule fois, tel qu'il a été transmis, sans le re-sérialiser.
 */
export function verifyBotSignature(
  secret: string | undefined,
  body: string,
  signature: string | null,
  timestamp: string | null,
  now: number = Date.now(),
): SignatureCheck {
  if (!secret) {
    return { ok: false, reason: "BOT_SYNC_SECRET non défini sur le wiki." };
  }
  if (!signature || !timestamp) {
    return { ok: false, reason: "Signature ou horodatage manquant." };
  }

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) {
    return { ok: false, reason: "Horodatage invalide." };
  }
  if (Math.abs(now - sent) > SIGNATURE_WINDOW_MS) {
    return { ok: false, reason: "Requête trop ancienne (hors de la fenêtre de 5 minutes)." };
  }

  const expected = signBody(secret, body, timestamp);
  if (!safeEqual(expected, signature)) {
    return { ok: false, reason: "Signature invalide." };
  }
  return { ok: true };
}
