import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_DISCORD_MAX_AGE_SECONDS,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "./jwt";
import { getUserRole } from "./users";
import { ROLE_INFO, USER_ROLES, type Session } from "./types";

/**
 * Lit et vérifie la session depuis les cookies (Server Components / Route Handlers).
 *
 * ## Deux provenances, deux règles
 *
 * Un compte **local** (identifiant du wiki) est revalidé à chaque requête : une
 * entrée retirée de `WIKI_USERS`, ou dont la charge a changé, perd immédiatement
 * l'accès sans attendre l'expiration du jeton.
 *
 * Un compte **Discord** ne peut pas l'être : le wiki ne conserve aucune base
 * d'utilisateurs, et réinterroger l'API Discord à chaque page rendrait le site
 * dépendant de sa disponibilité. Le rôle est donc celui figé dans le jeton au
 * moment de la connexion, et la session est volontairement plus courte
 * (`SESSION_DISCORD_MAX_AGE_SECONDS`) pour borner la fenêtre pendant laquelle
 * une rétrogradation sur le serveur reste sans effet ici.
 */
export async function getServerSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;
  if (!(USER_ROLES as readonly string[]).includes(payload.role)) return null;

  if (payload.provider === "local") {
    const currentRole = getUserRole(payload.username);
    if (!currentRole || currentRole !== payload.role) return null;
  }

  return {
    username: payload.username,
    role: payload.role as Session["role"],
    expiresAt: new Date(payload.exp * 1000),
    provider: payload.provider,
    displayName: payload.displayName,
    avatarUrl: payload.avatarUrl,
    discordUserId: payload.discordUserId,
  };
}

/** Création, modification et restauration d'articles (Dauphin, Régent, Conseil, Baillit). */
export function canWrite(session: Session | null): boolean {
  return session ? ROLE_INFO[session.role].canWrite : false;
}

/**
 * Accès complet : suppression, synchronisation Discord, jeu de données,
 * modération des commentaires. Porté par le Dauphin **et** le Premier Ministre
 * (voir `ROLE_INFO`).
 */
export function hasFullAccess(session: Session | null): boolean {
  return session ? ROLE_INFO[session.role].fullAccess : false;
}

/** Écriture de commentaires : tout compte connecté, quelle que soit sa charge. */
export function canComment(session: Session | null): boolean {
  return Boolean(session);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

/** Mêmes garanties, avec la durée de vie réduite d'une session Discord. */
export const SESSION_DISCORD_COOKIE_OPTIONS = {
  ...SESSION_COOKIE_OPTIONS,
  maxAge: SESSION_DISCORD_MAX_AGE_SECONDS,
} as const;

/** Alias de compatibilite : le depot importe encore isDauphin. */
export const isDauphin = hasFullAccess;
