import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/users";
import { SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/jwt";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkWriteRequest } from "@/lib/request-security";
import { MAX_ATTEMPTS, verifyChallenge } from "@/lib/twofactor";

export const runtime = "nodejs";

/** Une adresse ne peut pas essayer indéfiniment, même sur des défis neufs. */
const ATTEMPTS_PER_IP = 20;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * POST /api/auth/verify-2fa — seconde étape : le code reçu en MP Discord.
 *
 * Le `challengeId` est un identifiant opaque tiré par le serveur ; il ne donne
 * aucun droit à lui seul. Toute la sécurité repose sur le code, comparé à une
 * empreinte HMAC liée à ce défi.
 */
export async function POST(request: Request) {
  const formatError = checkWriteRequest(request);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 415 });
  }

  const ip = clientIp(request);
  const limite = rateLimit(`2fa:ip:${ip}`, ATTEMPTS_PER_IP, WINDOW_MS);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives de code. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { challengeId, code } = (body ?? {}) as Record<string, unknown>;
  if (typeof challengeId !== "string" || !challengeId) {
    return NextResponse.json({ error: "Défi manquant." }, { status: 400 });
  }
  if (typeof code !== "string") {
    return NextResponse.json({ error: "Code requis." }, { status: 400 });
  }

  // On accepte les espaces (copier-coller depuis Discord en ajoute parfois) et
  // les chiffres uniquement : un code n'a aucune raison de contenir autre chose.
  const normalise = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalise)) {
    return NextResponse.json(
      { error: `Le code doit contenir ${6} chiffres.` },
      { status: 400 },
    );
  }

  const resultat = verifyChallenge(challengeId, normalise);
  if (!resultat.ok) {
    // Chaque motif a son message : « code faux » et « défi expiré » n'appellent
    // pas la même action de la part de l'utilisateur.
    const messages: Record<string, string> = {
      inconnu: "Ce défi a expiré ou n'existe pas. Reconnectez-vous.",
      expire: "Le code a expiré. Reconnectez-vous pour en recevoir un nouveau.",
      trop_de_tentatives: "Trop de codes faux. Reconnectez-vous pour recommencer.",
      incorrect: `Code incorrect. Au-delà de ${MAX_ATTEMPTS} essais, le défi est annulé.`,
    };
    return NextResponse.json(
      { error: messages[resultat.motif] ?? "Code incorrect.", code: resultat.motif },
      { status: 401 },
    );
  }

  const role = getUserRole(resultat.username);
  if (!role) {
    // Le compte a pu être retiré de WIKI_USERS entre les deux étapes.
    return NextResponse.json(
      { error: "Ce compte n'existe plus.", code: "compte_absent" },
      { status: 401 },
    );
  }

  const token = await signSessionToken(resultat.username, role);
  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return response;
}
