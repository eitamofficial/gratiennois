import { NextResponse } from "next/server";
import { getRevisionPage } from "@/lib/articles-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/articles/[slug]/revisions — historique public paginé et filtrable.
 *
 * Paramètres : `page` (1 par défaut), `perPage` (20, max 100), `q` (recherche
 * dans le titre, le résumé et le contenu de la révision), `action`
 * (create|update|delete|restore) et `author`.
 *
 * Le contenu n'est jamais renvoyé ici : `metadata` suffit à alimenter une liste.
 */
export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const url = new URL(request.url);
  const result = await getRevisionPage(url.searchParams, { slug });

  return NextResponse.json({
    revisions: result.revisions.map(({ snapshot: _snapshot, ...metadata }) => metadata),
    page: result.query.page,
    perPage: result.query.perPage,
    total: result.total,
    totalPages: result.totalPages,
    filters: {
      q: result.query.q ?? null,
      action: result.query.action ?? null,
      author: result.query.author ?? null,
    },
  });
}
