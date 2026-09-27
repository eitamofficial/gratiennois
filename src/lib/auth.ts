import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "./jwt";
import { getUserRole } from "./users";
import { ROLE_INFO, USER_ROLES, type Session, type UserRole } from "./types";

/**
 * Lit et vérifie la session depuis les cookies (Server Components / Route Handlers).
 * Le compte est revalidé à chaque requête : un compte retiré de WIKI_USERS
 * (ou dont la charge a changé) perd immédiatement l'accès, sans attendre l'expiration.
 */
export async function getServerSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;
  if (!(USER_ROLES as readonly string[]).includes(payload.role)) return null;

  const currentRole = getUserRole(payload.username);
  if (!currentRole || currentRole !== payload.role) return null;

  return {
    username: payload.username,
    role: currentRole,
    expiresAt: new Date(payload.exp * 1000),
  };
}

/** Création, modification et restauration d'articles (Dauphin, Régent, Conseil, Baillit). */
export function canWrite(session: Session | null): boolean {
  return session ? ROLE_INFO[session.role].canWrite : false;
}

/** Suppression d'articles et synchronisation Discord : réservé au Dauphin. */
export function isDauphin(session: Session | null): boolean {
  return session ? ROLE_INFO[session.role].isDauphin : false;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;
