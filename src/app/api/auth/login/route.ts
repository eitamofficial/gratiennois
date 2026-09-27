import { NextResponse } from "next/server";
import { verifyCredentials, getUserRole } from "@/lib/users";
import { SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/jwt";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkWriteRequest } from "@/lib/request-security";

export const runtime = "nodejs";

/** Fenêtre et quotas de protection contre le bourrage d'identifiants. */
const ATTEMPTS_PER_IP = 10;
const ATTEMPTS_PER_USER = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** POST /api/auth/login — { username, password } → cookie de session signé (avec rôle). */
export async function POST(request: Request) {
  const formatError = checkWriteRequest(request);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 415 });
  }

  const ip = clientIp(request);
  const ipLimit = rateLimit(`login:ip:${ip}`, ATTEMPTS_PER_IP, WINDOW_MS);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return NextResponse.json(
      { error: "Identifiant et mot de passe requis." },
      { status: 400 },
    );
  }

  const userLimit = rateLimit(`login:user:${username.toLowerCase()}`, ATTEMPTS_PER_USER, WINDOW_MS);
  if (!userLimit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives pour ce compte. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSeconds) } },
    );
  }

  // Message volontairement identique en cas d'identifiant inconnu ou de mot de passe faux
  // (ne pas révéler quels comptes existent).
  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  // Repli sur une charge consultative si la configuration évolue sans rôle explicite.
  const role = getUserRole(username) ?? "depute";
  const token = await signSessionToken(username, role);

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return response;
}
