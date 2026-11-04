import { NextResponse } from "next/server";
import { verifyCredentials, getUserRole } from "@/lib/users";
import { SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/jwt";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkWriteRequest } from "@/lib/request-security";
import { envoyerMessagePrive } from "@/lib/discord-dm";
import {
  CODE_TTL_MS,
  createChallenge,
  recipientsFor,
  twoFactorEnabled,
} from "@/lib/twofactor";

export const runtime = "nodejs";

/** Fenêtre et quotas de protection contre le bourrage d'identifiants. */
const ATTEMPTS_PER_IP = 10;
const ATTEMPTS_PER_USER = 5;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * POST /api/auth/login — première étape de la connexion.
 *
 * Deux issues possibles, et une seule diffère selon la configuration :
 *
 *   - **A2F désactivée** (aucun `WIKI_2FA`) : la session est ouverte
 *     immédiatement, comme avant. C'est le mode de développement.
 *   - **A2F activée** : le mot de passe ne suffit plus. On tire un code, on
 *     l'envoie en MP Discord, et on renvoie un `challengeId`. La session ne
 *     sera créée qu'à l'étape suivante, par `/api/auth/verify-2fa`.
 *
 * Le message d'erreur reste identique entre « identifiant inconnu » et « mot de
 * passe faux » : révéler lequel des deux est en cause diviserait par deux le
 * travail d'un attaquant.
 */
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

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  const role = getUserRole(username) ?? "depute";

  // -------------------------------------------------------------------------
  // A2F désactivée : comportement historique.
  // -------------------------------------------------------------------------
  if (!twoFactorEnabled()) {
    const token = await signSessionToken(username, role);
    const response = NextResponse.json({ ok: true, role, twoFactor: false });
    response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    return response;
  }

  // -------------------------------------------------------------------------
  // A2F activée.
  // -------------------------------------------------------------------------
  const destinataires = recipientsFor(username);
  if (destinataires.length === 0) {
    // Échec fermé : un compte sans destinataire ne doit pas contourner l'A2F.
    // L'erreur est explicite parce qu'elle ne concerne que la configuration
    // interne — elle n'apprend rien d'exploitable à un tiers.
    console.error(
      `[auth] A2F active mais aucun identifiant Discord pour « ${username} » (WIKI_2FA).`,
    );
    return NextResponse.json(
      {
        error:
          "La double authentification est active, mais aucun compte Discord n'est associé à cet identifiant. Prévenez le Dauphin.",
        code: "2fa_non_configure",
      },
      { status: 403 },
    );
  }

  const { challengeId, code } = createChallenge(username);
  const minutes = Math.round(CODE_TTL_MS / 60_000);

  const envoi = await envoyerMessagePrive(
    destinataires,
    [
      "**Wiki de Gratianopolis — connexion**",
      "",
      `Code de vérification : **${code}**`,
      "",
      `Il expire dans ${minutes} minutes et ne fonctionne qu'une seule fois.`,
      "Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe.",
    ].join("\n"),
  );

  if (envoi.envoyes.length === 0) {
    // On ne renvoie pas les identifiants Discord au client : les raisons
    // (identifiant inconnu, MP fermés) suffisent au diagnostic.
    console.error("[auth] Aucun MP n'a pu être envoyé :", envoi.echecs);
    return NextResponse.json(
      {
        error:
          "Impossible d'envoyer le code par message privé Discord. Autorisez les MP des membres du serveur, puis réessayez.",
        code: "dm_echec",
        raisons: envoi.echecs.map((e) => e.raison),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    twoFactor: true,
    challengeId,
    expiresInSeconds: Math.round(CODE_TTL_MS / 1000),
    destinataires: envoi.envoyes.length,
  });
}
