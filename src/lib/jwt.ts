/**
 * JWT HS256 minimal, implémenté avec la Web Crypto API.
 * Compatible à la fois avec le runtime Node (routes API) et Edge (middleware).
 */

export const SESSION_COOKIE_NAME = "gratianopolis_session";
/** Durée de vie d'une session locale : 8 heures. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/**
 * Durée de vie d'une session ouverte via Discord.
 *
 * Plus courte que la session locale, et pour une raison précise : le rôle d'un
 * membre Discord est lu **au moment de la connexion**, puis figé dans le jeton.
 * Contrairement à un compte local, dont la charge est relue dans `WIKI_USERS` à
 * chaque requête, une rétrogradation sur le serveur ne peut pas être constatée
 * sans réinterroger l'API Discord. Quatre heures bornent donc la fenêtre pendant
 * laquelle un rôle retiré reste actif sur le wiki.
 */
export const SESSION_DISCORD_MAX_AGE_SECONDS = 60 * 60 * 4;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Fournisseur d'identité à l'origine de la session. */
export type SessionProvider = "local" | "discord";

interface SessionTokenPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
  /** `local` (identifiant du wiki) ou `discord` (OAuth2). Absent = local. */
  p?: SessionProvider;
  /** Nom affiché, plus lisible que l'identifiant technique. */
  dn?: string;
  /** Photo de profil Discord (URL du CDN), si le compte en a une. */
  av?: string;
  /** Identifiant Discord, conservé pour rattacher l'auteur à sa fiche. */
  did?: string;
}

export interface VerifiedSessionToken {
  username: string;
  role: string;
  exp: number;
  provider: SessionProvider;
  displayName: string;
  avatarUrl: string;
  discordUserId: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Champs facultatifs d'une session : ils distinguent un compte Discord d'un compte local. */
export interface SessionExtras {
  provider?: SessionProvider;
  displayName?: string;
  avatarUrl?: string;
  discordUserId?: string;
  /** Durée de vie ; par défaut celle d'une session locale. */
  maxAgeSeconds?: number;
}

/** Signe une session (identifiant + rôle) et renvoie le token JWT sérialisé. */
export async function signSessionToken(
  username: string,
  role: string,
  extras: SessionExtras = {},
): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET n'est pas défini dans l'environnement.");

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SessionTokenPayload = {
    sub: username,
    role,
    iat: issuedAt,
    exp: issuedAt + (extras.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS),
  };

  if (extras.provider) payload.p = extras.provider;
  if (extras.displayName) payload.dn = extras.displayName;
  if (extras.avatarUrl) payload.av = extras.avatarUrl;
  if (extras.discordUserId) payload.did = extras.discordUserId;

  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;

  const signature = await crypto.subtle.sign("HMAC", await importKey(secret), encoder.encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Vérifie la signature et l'expiration d'un token ; renvoie le payload ou null. */
export async function verifySessionToken(
  token: string | null | undefined,
): Promise<VerifiedSessionToken | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await importKey(secret),
      base64UrlDecode(signature),
      encoder.encode(`${header}.${body}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(base64UrlDecode(body))) as SessionTokenPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    if (typeof payload.role !== "string" || !payload.role) return null;

    const provider: SessionProvider = payload.p === "discord" ? "discord" : "local";

    return {
      username: payload.sub,
      role: payload.role,
      exp: payload.exp,
      provider,
      displayName: typeof payload.dn === "string" && payload.dn ? payload.dn : payload.sub,
      avatarUrl: typeof payload.av === "string" ? payload.av : "",
      discordUserId: typeof payload.did === "string" ? payload.did : "",
    };
  } catch {
    return null;
  }
}
