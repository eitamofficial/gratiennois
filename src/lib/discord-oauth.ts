import { getRoster } from "./roster";
import { ROLE_INFO, USER_ROLES, type UserRole } from "./types";

/**
 * Connexion au wiki via Discord (OAuth2, flux « code d'autorisation »).
 *
 * ## Pourquoi ce module existe
 *
 * Le wiki est l'encyclopédie d'une micronation **dont Discord est la place
 * publique**. Demander un identifiant et un mot de passe de plus, c'est
 * ajouter une serrure à une porte que tout le monde franchit déjà ailleurs. On
 * laisse donc Discord attester de l'identité, et le wiki se contente de lire ce
 * qu'il sait déjà : qui vous êtes, et quels rôles le serveur vous a donnés.
 *
 * ## Ce que le wiki demande, et rien de plus
 *
 *   - `identify` : le pseudo, l'identifiant et la photo de profil ;
 *   - `guilds.members.read` : les **rôles** du membre sur le serveur du
 *     Delphinat, qui déterminent ses droits d'écriture.
 *
 * Aucun accès aux messages, aux salons, aux amis ni à la liste des serveurs.
 * Le jeton d'accès n'est jamais conservé : il sert à deux lectures, puis il est
 * oublié. Seul un jeton de session signé par le wiki, valable quatre heures,
 * est déposé dans le navigateur.
 *
 * ## Le secret client
 *
 * Discord exige normalement un `client_secret` pour échanger le code. Il est
 * facultatif en PKCE : le wiki envoie donc **toujours** un vérificateur, et le
 * secret seulement s'il est configuré. Une installation qui n'a pas le secret
 * peut tout de même ouvrir la connexion, à condition que l'application Discord
 * soit déclarée « publique ».
 */

const DISCORD_API = "https://discord.com/api/v10";
const AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
const TOKEN_URL = `${DISCORD_API}/oauth2/token`;

/** Portées demandées. Volontairement minimales. */
const SCOPES = ["identify", "guilds.members.read"] as const;

/** Délai au-delà duquel un appel à Discord est abandonné. */
const FETCH_TIMEOUT_MS = 8000;

export interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  /** URI de retour, telle que déclarée dans le portail développeur Discord. */
  redirectUri: string;
}

/** Configuration lue dans l'environnement ; `redirectUri` déduite du site si absente. */
export function getOAuthConfig(origin: string): DiscordOAuthConfig {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI?.trim() || `${origin}/api/auth/discord/callback`;

  return { clientId, clientSecret, redirectUri };
}

/** La connexion Discord est-elle configurée ? */
export function isDiscordLoginEnabled(): boolean {
  return Boolean(process.env.DISCORD_CLIENT_ID?.trim());
}

/**
 * Le parcours peut-il aboutir ?
 *
 * Un identifiant d'application suffit à *afficher* le bouton, pas à terminer la
 * connexion : l'échange du code demande un secret client (ou une application
 * déclarée publique). On distingue donc les deux états, pour que la page de
 * connexion puisse dire précisément ce qui manque au lieu d'échouer après un
 * aller-retour chez Discord.
 */
export function isDiscordLoginComplete(): boolean {
  return Boolean(
    process.env.DISCORD_CLIENT_ID?.trim() && process.env.DISCORD_CLIENT_SECRET?.trim(),
  );
}

// ---------------------------------------------------------------------------
// PKCE et état
// ---------------------------------------------------------------------------

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Chaîne aléatoire encodée en base64url, d'au moins 32 octets d'entropie. */
export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

/** Empreinte S256 du vérificateur, telle que l'attend Discord. */
export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/** URL d'autorisation vers laquelle rediriger le navigateur. */
export function authorizeUrl(
  config: DiscordOAuthConfig,
  state: string,
  challenge: string,
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  // `consent` évite une boucle de redirection quand l'utilisateur a déjà
  // autorisé l'application mais que Discord juge la portée modifiée.
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Échanges avec l'API Discord
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

/** Échange le code d'autorisation contre un jeton d'accès. */
export async function exchangeCode(
  config: DiscordOAuthConfig,
  code: string,
  verifier: string,
): Promise<{ token: string } | { error: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: verifier,
  });
  // Le secret n'est joint que s'il existe : en PKCE seul, Discord l'accepte
  // absent pour une application déclarée publique.
  if (config.clientSecret) body.set("client_secret", config.clientSecret);

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return { error: "Discord est injoignable. Réessayez dans un instant." };
  }

  const payload = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || !payload.access_token) {
    const detail = payload.error_description || payload.error || `HTTP ${response.status}`;
    // Le message d'erreur de Discord est technique ; on le garde dans les
    // journaux et on n'en expose qu'un résumé lisible.
    console.error("[discord-oauth] échange du code refusé :", detail);
    return { error: "Discord a refusé la connexion. Réessayez." };
  }

  return { token: payload.access_token };
}

export interface DiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
}

interface RawUser {
  id?: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
}

/** Photo de profil Discord, ou chaîne vide si le compte n'en a pas. */
export function avatarUrlFor(userId: string, hash: string | null | undefined): string {
  if (!hash) return "";
  const extension = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${extension}?size=128`;
}

/** Lit le profil de l'utilisateur connecté. */
export async function fetchUser(accessToken: string): Promise<DiscordUser | null> {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) return null;

  const raw = (await response.json().catch(() => ({}))) as RawUser;
  if (!raw.id || !raw.username) return null;

  return {
    id: raw.id,
    username: raw.username,
    globalName: raw.global_name ?? null,
    avatarUrl: avatarUrlFor(raw.id, raw.avatar),
  };
}

/**
 * Rôles Discord du membre sur le serveur du Delphinat.
 *
 * `null` signifie « impossible à savoir » : le membre n'est pas sur le serveur,
 * ou l'application n'a pas la portée nécessaire. Ce n'est pas une erreur — un
 * visiteur qui se connecte sans avoir rejoint le serveur reste un lecteur.
 */
export async function fetchMemberRoleIds(
  accessToken: string,
  guildId: string,
): Promise<string[] | null> {
  if (!guildId) return null;

  const response = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) return null;

  const raw = (await response.json().catch(() => ({}))) as { roles?: unknown };
  return Array.isArray(raw.roles) ? raw.roles.filter((id): id is string => typeof id === "string") : null;
}

/**
 * Ordre de préséance des charges.
 *
 * Un membre porte souvent plusieurs rôles (« Conseil Delphinal » et « Député »,
 * par exemple). Sans ordre explicite, le résultat dépendrait de l'ordre de la
 * liste renvoyée par Discord, c'est-à-dire du hasard. On retient donc la charge
 * la plus haute, dans l'ordre de la Constitution.
 *
 * Les deux charges à **accès complet** viennent en tête, et le Premier Ministre
 * juste après le Dauphin : un membre qui cumule « Baillit » et « Premier
 * Ministre » doit obtenir l'accès complet, pas la charge la plus modeste des
 * deux. C'était le défaut de l'ordre précédent, où « Baillit » passait avant le
 * Premier Ministre et lui retirait silencieusement la suppression et la
 * modération.
 */
const ROLE_PRIORITY: readonly UserRole[] = [
  "dauphin",
  "premier-ministre",
  "regent",
  "conseil",
  "baillit",
  "ministre",
  "representant",
  "depute",
];

/** Normalisation d'un libellé de rôle, comme partout ailleurs dans le wiki. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Charge du wiki correspondant aux rôles Discord d'un membre.
 *
 * Deux modes de rapprochement, et l'ordre compte :
 *
 *   1. **par identifiant** — dès qu'une entrée de `roleMapping` déclare des
 *      `roleIds`, seuls ces identifiants comptent. Un serveur peut contenir
 *      deux rôles homonymes (« 🐬|Dauphin » ancien et nouveau) : le nom ne
 *      permet pas de les distinguer, l'identifiant si.
 *   2. **par nom** — pour les entrées sans identifiant, on compare le libellé,
 *      sans accents ni casse.
 *
 * Le fichier `shared/roster.json` reste la seule source de vérité : renommer un
 * rôle sur Discord ne demande aucune modification du code.
 */
export function chargeFromRoles(roleIds: string[], roleNames: string[]): UserRole | null {
  const mapping = getRoster().roleMapping;
  const found = new Set<UserRole>();
  const ids = new Set(roleIds);
  const noms = new Set(roleNames.map(normalize));

  for (const entry of mapping) {
    if (!(USER_ROLES as readonly string[]).includes(entry.charge)) continue;

    const parIdentifiant =
      entry.roleIds.length > 0 && entry.roleIds.some((id) => ids.has(id));
    const parNom = entry.roleIds.length === 0 && noms.has(normalize(entry.roleDiscord));

    if (parIdentifiant || parNom) found.add(entry.charge as UserRole);
  }

  return ROLE_PRIORITY.find((role) => found.has(role)) ?? null;
}

/** Droits effectifs d'un rôle Discord, pour l'affichage sur la page de connexion. */
export function describeCharge(role: UserRole): string {
  const info = ROLE_INFO[role];
  return info.canWrite ? `${info.label} — accès à l'écriture` : `${info.label} — lecture et commentaires`;
}
