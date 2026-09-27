import { NextResponse } from "next/server";
import { canWrite, getServerSession } from "@/lib/auth";
import {
  createArticle,
  getAllArticles,
  listArticleSummaries,
  parseArticleInput,
  ValidationError,
} from "@/lib/articles-store";
import { checkWriteRequest } from "@/lib/request-security";
import { storageErrorResponse } from "@/lib/store/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/articles — liste publique (sans le corps des articles). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const withContent = searchParams.get("content") === "true";
  const articles = withContent ? await getAllArticles() : await listArticleSummaries();
  return NextResponse.json({ articles });
}

/** POST /api/articles — création, réservée aux charges ayant pouvoir d'écriture (Dauphin, Régent, Conseil, Baillit). */
export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  try {
    const input = parseArticleInput(body);
    const article = await createArticle({ ...input, author: session.username });
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[POST /api/articles]", error);
    const { body, status } = storageErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
