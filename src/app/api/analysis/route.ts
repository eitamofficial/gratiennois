import { NextResponse } from "next/server";
import { canWrite, getServerSession } from "@/lib/auth";
import { getAllArticles } from "@/lib/articles-store";
import { analyzeArticle } from "@/lib/text-analysis";
import { checkWriteRequest } from "@/lib/request-security";
import { CATEGORIES, type Category } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/analysis — assistant de rédaction.
 * Analyse un brouillon (titre, résumé, contenu, tags) et renvoie : statistiques,
 * contrôle qualité, suggestions de catégorie et de tags, doublons proches,
 * liens internes cassés et un résumé extractif.
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json({ error: "Votre charge ne permet pas l'édition." }, { status: 403 });
  }

  const formatError = checkWriteRequest(request);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 415 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content : "";
  if (content.length > 200_000) {
    return NextResponse.json({ error: "Contenu trop volumineux pour l'analyse." }, { status: 413 });
  }

  const articles = await getAllArticles();
  const category = (CATEGORIES as readonly string[]).includes(String(body.category))
    ? (String(body.category) as Category)
    : undefined;

  const analysis = analyzeArticle({
    title: String(body.title ?? ""),
    slug: typeof body.slug === "string" ? body.slug : undefined,
    summary: typeof body.summary === "string" ? body.summary : "",
    content,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    category,
    articles: articles.map((article) => ({
      slug: article.slug,
      title: article.title,
      content: article.content,
      tags: article.tags,
      summary: article.summary,
    })),
  });

  return NextResponse.json({ analysis });
}
