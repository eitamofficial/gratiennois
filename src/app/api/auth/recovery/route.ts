import { NextResponse } from "next/server";
import { verifyCredentials, getUserRole } from "@/lib/users";
import { SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/jwt";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkWriteRequest } from "@/lib/request-security";
import { verifyRecoveryCode } from "@/lib/twofactor";

export const runtime = "nodejs";

/**
 * Quota volontairement plus serré que la connexion normale.
 *
 * Un code de secours est long, mais il est unique et sans expiration : c'est
 * exactement le genre de secret qu'un attaquant essaie lentement, sur la durée.
 * Cinq essais par quart d'heure rendent l'exercice sans espoir.
 */
const ATTEMPTS_PER_IP = 5;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * POST /api/auth/recovery — connexion avec le code de secours.
 *
 * Sert quand Discord est injoignable ou que les MP du compte sont fermés : sans
 * cette porte, une panne de Discord deviendrait une panne du wiki. Le code de
 * secours ne remplace pas l'A2F, il la double d'une clé physique que seul le
 * titulaire possède.
 *
 * Le mot de passe est **revérifié ici** : le code de secours seul ne suffit
 * pas. Un bout de papier perdu ne doit pas ouvrir le wiki à qui le ramasse.
 */
export async function POST(request: Request) {
  const formatError = checkWriteRequest(request);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 415 });
  }

  const ip = clientIp(request);
  const limite = rateLimit(`recovery:ip:${ip}`, ATTEMPTS_PER_IP, WINDOW_MS);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } },
    );
  }

  if (!process.env.WIKI_2FA_RECOVERY?.trim()) {
    return NextResponse.json(
      { error: "Aucun code de secours n'est configuré sur ce serveur.", code: "sans_secours" },
      { status: 501 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { username, password, code } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof code !== "string" ||
    !username ||
    !password ||
    !code
  ) {
    return NextResponse.json(
      { error: "Identifiant, mot de passe et code de secours requis." },
      { status: 400 },
    );
  }

  if (!verifyCredentials(username, password) || !verifyRecoveryCode(code)) {
    return NextResponse.json(
      { error: "Identifiants ou code de secours incorrects." },
      { status: 401 },
    );
  }

  const role = getUserRole(username);
  if (!role) {
    return NextResponse.json({ error: "Ce compte n'existe plus." }, { status: 401 });
  }

  const token = await signSessionToken(username, role);
  const response = NextResponse.json({ ok: true, role, viaRecovery: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return response;
}
