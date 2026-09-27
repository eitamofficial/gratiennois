import { NextResponse } from "next/server";
import { getRevisionsBySlug } from "@/lib/articles-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string; revisionId: string }>;
}

/** GET /api/articles/[slug]/revisions/[revisionId] — contenu d'une révision. */
export async function GET(_request: Request, { params }: Params) {
  const { slug, revisionId } = await params;
  const revisions = await getRevisionsBySlug(slug);
  const revision = revisions.find((item) => item.id === revisionId);

  if (!revision) {
    return NextResponse.json({ error: "Révision introuvable." }, { status: 404 });
  }
  return NextResponse.json({ revision });
}
