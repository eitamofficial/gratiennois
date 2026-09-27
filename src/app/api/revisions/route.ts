import { NextResponse } from "next/server";
import { canWrite, getServerSession } from "@/lib/auth";
import { getRevisionPage } from "@/lib/articles-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/revisions — fil d'activité paginé et filtrable, réservé aux rédacteurs.
 *
 * Mêmes paramètres que l'historique d'un article : `page`, `perPage`, `q`,
 * `action`, `author`. La réponse est ici en lecture seule côté interface : le
 * contenu des révisions est omis, il reste consultable article par article.
 */
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json({ error: "Votre charge ne permet pas de consulter l'historique global." }, { status: 403 });
  }

  const url = new URL(request.url);
  const result = await getRevisionPage(url.searchParams);

  return NextResponse.json({
    revisions: result.revisions.map(({ snapshot, ...metadata }) => ({
      ...metadata,
      // Titre seul : suffisant pour afficher le fil sans exposer les contenus.
      title: snapshot.title,
      category: snapshot.category,
    })),
    page: result.query.page,
    perPage: result.query.perPage,
    total: result.total,
    totalPages: result.totalPages,
  });
}
