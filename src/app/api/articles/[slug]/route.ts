import { NextResponse } from "next/server";
import { canWrite, getServerSession, isDauphin } from "@/lib/auth";
import {
  deleteArticle,
  getArticleBySlug,
  parseArticleInput,
  updateArticle,
  ValidationError,
} from "@/lib/articles-store";
import { checkWriteRequest } from "@/lib/request-security";
import { storageErrorResponse } from "@/lib/store/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

/** GET /api/articles/[slug] — lecture publique d'un article. */
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }
  return NextResponse.json({ article });
}

/** PUT /api/articles/[slug] — modification, réservée à une session admin. */
export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json(
      { error: "Votre charge ne permet pas l'édition du wiki." },
      { status: 403 },
    );
  }

  const formatError = checkWriteRequest(request);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 415 });
  }

  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  try {
    const input = parseArticleInput(body);
    const article = await updateArticle(slug, { ...input, author: session.username });
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[PUT /api/articles/:slug]", error);
    const { body, status } = storageErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/** DELETE /api/articles/[slug] — suppression, réservée au Dauphin. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!isDauphin(session)) {
    return NextResponse.json(
      { error: "Suppression réservée au Dauphin (article P-1 : pouvoir de véto)." },
      { status: 403 },
    );
  }

  const { slug } = await params;
  const deleted = await deleteArticle(slug, session.username);
  if (!deleted) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
