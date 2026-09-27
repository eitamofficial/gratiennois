import { NextResponse } from "next/server";
import { canWrite, getServerSession } from "@/lib/auth";
import { restoreRevision, ValidationError } from "@/lib/articles-store";
import { storageErrorResponse } from "@/lib/store/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string; revisionId: string }>;
}

/** POST /api/articles/[slug]/revisions/[revisionId]/restore — restauration (admin). */
export async function POST(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json(
      { error: "Votre charge ne permet pas la restauration d'une version." },
      { status: 403 },
    );
  }

  const { slug, revisionId } = await params;
  try {
    const article = await restoreRevision(slug, revisionId, session.username);
    if (!article) {
      return NextResponse.json({ error: "Révision introuvable." }, { status: 404 });
    }
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[POST restore]", error);
    const { body, status } = storageErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
