import { NextResponse } from "next/server";
import { getAllArticles, storageName } from "@/lib/articles-store";
import { getStorageError } from "@/lib/store";
import { getDiscordSnapshot } from "@/lib/discord";
import {
  checkDeploymentReadiness,
  checkDeploymentWarnings,
  describeRuntime,
  isEphemeralRuntime,
} from "@/lib/store/environment";
import { maskDatabaseUrl } from "@/lib/store/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — sonde de supervision (utilisable par un monitoring externe).
 * Ne renvoie jamais de secret : uniquement l'état du service.
 *
 * `status` passe à `degraded` (503) dès qu'un **problème de configuration**
 * empêche le fonctionnement durable — typiquement un déploiement sans base de
 * données : le site répond, mais son contenu ne survivrait pas. Un site « vert »
 * sur ce critère serait pire qu'une panne franche.
 */
export async function GET() {
  const driver = storageName();
  let ok = true;
  let articleCount: number | null = null;
  let error: string | null = null;

  try {
    articleCount = (await getAllArticles()).length;
  } catch (caught) {
    ok = false;
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const discord = await getDiscordSnapshot().catch(() => null);
  const problems = checkDeploymentReadiness();
  const warnings = checkDeploymentWarnings();
  if (problems.length > 0) ok = false;

  // Configuration de l'authentification. Sans `AUTH_SECRET`, le mot de passe et
  // le code A2F peuvent être justes : aucune session ne peut être signée, donc
  // **personne ne peut se connecter**. C'est arrivé, et rien ne le signalait —
  // le site répondait 200 et la connexion échouait en silence.
  const authSecret = Boolean(process.env.AUTH_SECRET?.trim());
  const twoFactor = Boolean(process.env.WIKI_2FA?.trim());
  const accounts = (process.env.WIKI_USERS ?? "")
    .split(",")
    .map((entree) => entree.trim())
    .filter(Boolean).length;

  if (!authSecret) {
    ok = false;
    problems.push({
      code: "auth-secret-absent",
      message:
        "AUTH_SECRET n'est pas défini : aucune session ne peut être signée, la connexion est impossible.",
    } as (typeof problems)[number]);
  }

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      storage: {
        driver,
        url: driver === "postgres" ? maskDatabaseUrl(process.env.DATABASE_URL) : "data/*.json",
        // Un contenu de zéro article sur une plateforme éphémère signifie que
        // rien n'a jamais pu être écrit : le site est en ligne et vide.
        durable: !isEphemeralRuntime() || driver === "postgres",
        lastError: getStorageError(),
      },
      articles: articleCount,
      runtime: describeRuntime(),
      discord: {
        configured: Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID),
        lastSync: discord?.fetchedAt ?? null,
      },
      auth: {
        /** Signature des sessions : sans lui, la connexion est impossible. */
        secret: authSecret,
        /** Double authentification active pour tous les comptes. */
        twoFactor,
        /** Nombre de comptes déclarés, jamais leur identité. */
        accounts,
        /** Connexion Discord disponible (identifiant d'application présent). */
        discordOAuth: Boolean(process.env.DISCORD_CLIENT_ID?.trim()),
      },
      deployment: { problems, warnings },
      error,
    },
    { status: ok ? 200 : 503 },
  );
}
