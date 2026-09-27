import { NextResponse } from "next/server";
import { searchArticles } from "@/lib/search";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { CATEGORIES, type Category } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=…&categorie=… — recherche publique.
 * Renvoie les résultats (tableau), les facettes par catégorie et les suggestions.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const categoryParam = searchParams.get("categorie") ?? "";
  const category = (CATEGORIES as readonly string[]).includes(categoryParam)
    ? (categoryParam as Category)
    : undefined;

  if (query.length < 2) {
    return NextResponse.json({ results: [], facets: [], total: 0, suggestions: [] });
  }

  // Protection contre l'abus de l'API de recherche.
  const limit = rateLimit(`search:${clientIp(request)}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { results: [], facets: [], total: 0, suggestions: [], error: "Trop de requêtes, réessayez dans un instant." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const outcome = await searchArticles(query, { category, limit: 10 });
  return NextResponse.json(outcome);
}
