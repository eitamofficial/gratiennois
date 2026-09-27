import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAllArticles, setDiscordUserIds } from "@/lib/articles-store";
import { isDiscordConfigured, refreshDiscordSnapshot } from "@/lib/discord";
import {
  BOT_SIGNATURE_HEADER,
  BOT_TIMESTAMP_HEADER,
  verifyBotSignature,
} from "@/lib/bot-signature";
import { getRoster } from "@/lib/roster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sync/bot — point d'entrée du **bot Discord**.
 *
 * Le bot appelle cette route quand un membre du serveur est modifié (rôle
 * changé, nom modifié). Le wiki répond en rattachant ce membre à la bonne page
 * grâce à la configuration partagée : c'est le mécanisme qui fait remonter une
 * modification de rôle de Discord vers le wiki sans double saisie.
 *
 * Authentification : signature HMAC du corps (`BOT_SYNC_SECRET`), **pas** de
 * cookie. Voir `src/lib/bot-signature.ts`.
 *
 * Le bot n'écrit **jamais** de contenu : il ne fait que rattacher des
 * identifiants à des pages existantes. L'écriture du wiki reste réservée aux
 * charges constitutionnelles, via l'espace d'édition.
 */

/** Nombre d'identifiants qu'un seul appel peut rattacher. */
const MAX_LINKS = 20;

export async function POST(request: Request) {
  const limit = rateLimit("sync-bot", 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un instant." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterSeconds)) } },
    );
  }

  // Le corps est lu **en une fois** : c'est exactement ces octets qui sont
  // signés, il ne faut pas le re-sérialiser pour le revérifier.
  const body = await request.text();
  const check = verifyBotSignature(
    process.env.BOT_SYNC_SECRET,
    body,
    request.headers.get(BOT_SIGNATURE_HEADER),
    request.headers.get(BOT_TIMESTAMP_HEADER),
  );
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const input = payload as { liens?: unknown };
  const articles = await getAllArticles();
  const bySlug = new Map(articles.map((article) => [article.slug, article]));

  // On n'accepte que des paires {slug, discordUserId} : un rattachement vers une
  // page de personnalité du wiki. Tout le reste est ignoré.
  const requested = Array.isArray(input.liens) ? input.liens : [];
  const mapping: Record<string, string> = {};
  const ignored: Array<{ slug: string; reason: string }> = [];

  for (const item of requested.slice(0, MAX_LINKS)) {
    const link = item as { slug?: unknown; discordUserId?: unknown };
    const slug = typeof link?.slug === "string" ? link.slug : "";
    const userId = typeof link?.discordUserId === "string" ? link.discordUserId : "";
    const character = getRoster().personnages.find((item) => item.slug === slug);

    if (!character) {
      ignored.push({ slug, reason: "Personnage absent de la configuration partagée." });
      continue;
    }
    if (!/^[0-9]{5,25}$/.test(userId)) {
      ignored.push({ slug, reason: "Identifiant Discord invalide." });
      continue;
    }
    if (bySlug.get(slug)?.category !== "personnalites") {
      ignored.push({ slug, reason: "La page n'est pas une fiche de personnalité." });
      continue;
    }
    mapping[slug] = userId;
  }

  if (Object.keys(mapping).length > 0) {
    await setDiscordUserIds(mapping);
  }

  // Photo de profil : renvoyée au bot pour qu'il puisse l'afficher, et
  // journalisée ici pour que la page soit à jour dès le prochain rendu.
  let avatar: string | null = null;
  const firstId = Object.values(mapping)[0];
  if (firstId && isDiscordConfigured()) {
    try {
      const snapshot = await refreshDiscordSnapshot();
      avatar =
        snapshot.members.find((member) => member.id === firstId)?.avatarUrl ?? null;
    } catch {
      // Le rattachement est déjà enregistré : l'absence de photo n'annule rien.
    }
  }

  return NextResponse.json({
    ok: true,
    rosterVersion: getRoster().version,
    linked: Object.keys(mapping),
    ignored,
    avatar,
    at: new Date().toISOString(),
  });
}

/** GET /api/sync/bot — état de la liaison, sans rien modifier. */
export async function GET() {
  const roster = getRoster();
  return NextResponse.json({
    ok: true,
    version: roster.version,
    invite: roster.invite,
    personnages: roster.personnages.map((character) => ({
      slug: character.slug,
      nom: character.nom,
      charge: character.charge,
      // On ne publie jamais l'identifiant Discord : il ne sert qu'au bot.
      rattache: Boolean(character.discordUserId),
    })),
    roles: roster.roleMapping.map((entry) => ({
      roleDiscord: entry.roleDiscord,
      charge: entry.charge,
      articleSlug: entry.articleSlug,
    })),
    signature: {
      secretConfigured: Boolean(process.env.BOT_SYNC_SECRET),
      header: BOT_SIGNATURE_HEADER,
      timestampHeader: BOT_TIMESTAMP_HEADER,
    },
  });
}
