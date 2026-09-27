import { NextResponse } from "next/server";
import { getServerSession, isDauphin } from "@/lib/auth";
import { installSeedArticles } from "@/lib/articles-store";
import { checkWriteRequest } from "@/lib/request-security";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/seed — installe le jeu de données initial, réservé au Dauphin.
 *
 * Le wiki n'est amorcé que lorsqu'il est vide ; cette route permet de le mettre
 * à niveau après une évolution du contenu de `src/lib/seed-data.ts` (ajout
 * d'articles, d'infobox) **sans écraser le travail de la rédaction** :
 *
 *   - les articles absents sont créés ;
 *   - les infoboxes absentes sont posées ;
 *   - le texte des articles n'a **jamais** été retouché est mis à jour quand
 *     `SEED_VERSION` a augmenté (correction d'une faute, nouveau lore) ;
 *   - les articles qu'un rédacteur a modifiés sont laissés intacts et
 *     signalés comme protégés dans la réponse.
 *
 * Corps JSON accepté : `{ "refresh": true }` pour forcer la mise à jour des
 * textes. Sans ce drapeau, seule l'ajout a lieu.
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!isDauphin(session)) {
    return NextResponse.json(
      { error: "Installation du jeu de données réservée au Dauphin." },
      { status: 403 },
    );
  }

  // Le contrôle d'origine est déjà fait par le middleware ; on exige en plus un
  // corps JSON valide, et on limite le débit (l'opération est idempotente mais
  // elle écrit en base).
  const formatError = checkWriteRequest(request);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 415 });
  }

  const limit = rateLimit(`seed:${session.username}`, 6, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Trop de tentatives. Réessayez dans ${limit.retryAfterSeconds} s.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as { refresh?: unknown };
    const report = await installSeedArticles(session.username, {
      refresh: payload.refresh === true,
    });
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    console.error("[POST /api/seed]", error);
    return NextResponse.json({ error: "Installation impossible." }, { status: 500 });
  }
}
