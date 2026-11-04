import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { requestOrigin } from "@/lib/site-url";
import {
  authorizeUrl,
  codeChallenge,
  getOAuthConfig,
  isDiscordLoginEnabled,
  randomToken,
} from "@/lib/discord-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/discord — début du parcours de connexion.
 *
 * La route ne fait que préparer le voyage : elle tire un `state` (protection
 * contre le rejeu et les requêtes forgées) et un vérificateur PKCE, les dépose
 * dans deux cookies `httpOnly` de courte durée, puis renvoie le navigateur vers
 * Discord. Rien n'est écrit côté serveur : le wiki n'a pas d'état à tenir entre
 * les deux étapes, ce qui est exactement ce qu'on veut d'une tablette qui peut
 * redémarrer entre-temps.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request.headers);

  const limit = rateLimit(`discord-start:${clientIp(request)}`, 20, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.redirect(new URL("/connexion?erreur=trop_de_tentatives", origin));
  }

  if (!isDiscordLoginEnabled()) {
    return NextResponse.redirect(new URL("/connexion?erreur=discord_indisponible", origin));
  }

  const config = getOAuthConfig(origin);
  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = await codeChallenge(verifier);

  const response = NextResponse.redirect(authorizeUrl(config, state, challenge));

  const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/discord",
    maxAge: 600,
  };

  response.cookies.set("wiki_oauth_state", state, cookieBase);
  response.cookies.set("wiki_oauth_verifier", verifier, cookieBase);

  // Destination après connexion. Elle est validée ici : un chemin relatif
  // seulement, jamais `//domaine.tiers`, sans quoi la page de connexion
  // deviendrait une redirection ouverte.
  const next = url.searchParams.get("next") ?? "";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  response.cookies.set("wiki_oauth_next", safeNext, cookieBase);

  return response;
}
