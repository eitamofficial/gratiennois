import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  SESSION_DISCORD_MAX_AGE_SECONDS,
} from "@/lib/jwt";
import { SESSION_DISCORD_COOKIE_OPTIONS } from "@/lib/auth";
import { requestOrigin } from "@/lib/site-url";
import { getDiscordConfig, getDiscordSnapshot } from "@/lib/discord";
import { auditFromRequest } from "@/lib/audit";
import {
  chargeFromRoles,
  exchangeCode,
  fetchMemberRoleIds,
  fetchUser,
  getOAuthConfig,
} from "@/lib/discord-oauth";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/discord/callback — retour depuis Discord.
 *
 * Le parcours complet, dans l'ordre :
 *   1. le `state` renvoyé par Discord doit correspondre au cookie déposé au
 *      départ — sinon la requête ne vient pas de nous et on s'arrête là ;
 *   2. le code est échangé contre un jeton d'accès, avec le vérificateur PKCE ;
 *   3. le profil et les **rôles sur le serveur** sont lus ;
 *   4. les rôles Discord sont traduits en charge constitutionnelle via
 *      `shared/roster.json` ;
 *   5. la session est signée et déposée en cookie.
 *
 * Un membre du serveur sans rôle reconnu n'est pas refusé : il entre comme
 * lecteur. C'est le cas de l'immense majorité des citoyens, et les priver de
 * l'annuaire ou des commentaires parce qu'ils ne siègent pas au Conseil serait
 * une drôle de façon de faire communauté.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request.headers);
  const store = await cookies();

  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/connexion?erreur=${code}`, origin));

  // Discord renvoie `error=access_denied` quand l'utilisateur clique sur
  // « Annuler ». Ce n'est pas une panne : on le dit sans dramatiser.
  if (url.searchParams.get("error")) {
    return fail("refus");
  }

  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const expectedState = store.get("wiki_oauth_state")?.value ?? "";
  const verifier = store.get("wiki_oauth_verifier")?.value ?? "";

  if (!code || !verifier) return fail("session_expiree");
  if (!state || !expectedState || state !== expectedState) {
    await auditFromRequest(request, {
      event: "connexion-refusee",
      provider: "discord",
      detail: "state invalide",
    });
    return fail("state_invalide");
  }

  const config = getOAuthConfig(origin);
  const exchange = await exchangeCode(config, code, verifier);
  if ("error" in exchange) {
    // Sans secret client, Discord refuse l'échange dès que l'application n'est
    // pas déclarée publique. Le dire clairement vaut mieux qu'un « réessayez »
    // qui renverrait l'administrateur vers la même impasse.
    return fail(config.clientSecret ? "echange_refuse" : "secret_manquant");
  }

  const user = await fetchUser(exchange.token);
  if (!user) return fail("profil_illisible");

  // ------------------------------------------------------------------
  // Rôles Discord → charge du wiki
  // ------------------------------------------------------------------
  const { guildId } = getDiscordConfig();
  const roleIds = await fetchMemberRoleIds(exchange.token, guildId);

  let charge: UserRole = "depute";
  let roleNames: string[] = [];

  if (roleIds && roleIds.length > 0) {
    // L'API du membre renvoie des **identifiants** de rôles ; le wiki accepte
    // les deux formes (identifiant et nom). Les noms viennent de l'instantané du
    // serveur, déjà mis en cache par la synchronisation : aucune requête
    // supplémentaire n'est faite à Discord.
    const snapshot = await getDiscordSnapshot().catch(() => null);
    const byId = new Map((snapshot?.roles ?? []).map((role) => [role.id, role.name]));
    roleNames = roleIds.map((id) => byId.get(id)).filter((name): name is string => Boolean(name));
    charge = chargeFromRoles(roleIds, roleNames) ?? "depute";
  }

  // ------------------------------------------------------------------
  // Session
  // ------------------------------------------------------------------
  const token = await signSessionToken(user.username, charge, {
    provider: "discord",
    displayName: user.globalName || user.username,
    avatarUrl: user.avatarUrl,
    discordUserId: user.id,
    maxAgeSeconds: SESSION_DISCORD_MAX_AGE_SECONDS,
  });

  const nextCookie = store.get("wiki_oauth_next")?.value ?? "";
  const destination =
    nextCookie.startsWith("/") && !nextCookie.startsWith("//") ? nextCookie : "/";

  const response = NextResponse.redirect(new URL(destination, origin));
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_DISCORD_COOKIE_OPTIONS);

  // Les cookies du parcours ont rempli leur rôle : les laisser traîner
  // reviendrait à garder un vérificateur PKCE utilisable après coup.
  for (const name of ["wiki_oauth_state", "wiki_oauth_verifier", "wiki_oauth_next"]) {
    response.cookies.set(name, "", { path: "/api/auth/discord", maxAge: 0 });
  }

  await auditFromRequest(request, {
    event: "connexion-reussie",
    username: user.globalName || user.username,
    provider: "discord",
    role: charge,
    detail:
      roleIds && roleIds.length > 0
        ? `Rôles Discord : ${roleNames.join(", ") || "noms indisponibles"} (${roleIds.join(", ")})`
        : "Aucun rôle sur le serveur — entrée en lecture seule",
  });

  return response;
}
