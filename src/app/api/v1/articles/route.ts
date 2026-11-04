import { NextResponse } from "next/server";
import { getPublishedArticles } from "@/lib/articles-store";
import type { Article } from "@/lib/types";

/**
 * API publique de lecture.
 *
 * Stable et sans authentification : elle expose ce que le site affiche déjà.
 * Les articles en proposition sont exclus — une page non relue ne doit pas
 * fuiter par une API plus permissive que l'interface.
 */
function resume(article: Article) {
  return {
    slug: article.slug,
    title: article.title,
    category: article.category,
    summary: article.summary,
    tags: article.tags,
    updatedAt: article.updatedAt,
    createdAt: article.createdAt,
    quality: article.quality ?? false,
    protection: article.protection ?? null,
    lang: article.lang ?? "fr",
    sources: article.sources?.length ?? 0,
    url: `/wiki/${article.slug}`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const category = url.searchParams.get("category");
  const query = (url.searchParams.get("q") ?? "").toLowerCase().trim();
  const since = url.searchParams.get("since");

  let articles = await getPublishedArticles();
  if (category) articles = articles.filter((article) => article.category === category);
  if (since) articles = articles.filter((article) => article.updatedAt >= since);
  if (query) {
    articles = articles.filter((article) =>
      `${article.title} ${article.summary} ${article.tags.join(" ")}`.toLowerCase().includes(query),
    );
  }

  articles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const total = articles.length;
  const slice = articles.slice((page - 1) * limit, page * limit);
  const etag = `W/"${total}-${articles[0]?.updatedAt ?? "vide"}"`;

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { etag } });
  }

  return NextResponse.json(
    {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      articles: slice.map(resume),
    },
    {
      headers: {
        etag,
        "cache-control": "public, max-age=60",
        "access-control-allow-origin": "*",
      },
    },
  );
}
