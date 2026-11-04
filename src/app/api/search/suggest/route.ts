import { NextResponse } from "next/server";
import { getPublishedArticles } from "@/lib/articles-store";
import { titleScore } from "@/lib/semantic";

/**
 * Autocomplétion de la barre de recherche.
 *
 * Volontairement légère : elle est appelée à chaque frappe. On ne construit pas
 * l'index sémantique ici — il coûte un parcours complet du corpus — on se
 * contente du titre, du résumé et des étiquettes, ce qui suffit à reconnaître
 * ce que le lecteur commence à taper.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  const articles = await getPublishedArticles();
  const suggestions = articles
    .map((article) => {
      const scoreTitre = titleScore(query, article.title);
      const scoreTag = article.tags.some((tag) =>
        tag.toLowerCase().includes(query.toLowerCase()),
      )
        ? 35
        : 0;
      const scoreResume = article.summary.toLowerCase().includes(query.toLowerCase()) ? 20 : 0;
      return {
        slug: article.slug,
        title: article.title,
        category: article.category,
        score: Math.max(scoreTitre, scoreTag, scoreResume),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return NextResponse.json(
    { suggestions },
    { headers: { "cache-control": "public, max-age=30" } },
  );
}
