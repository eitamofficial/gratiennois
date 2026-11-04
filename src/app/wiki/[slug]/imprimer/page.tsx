import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedArticleBySlug, getPublishedArticles } from "@/lib/articles-store";
import { buildLinkMap } from "@/lib/link-graph";
import { categoryLabel, formatDate, SITE } from "@/lib/constants";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { SourcesSection } from "@/components/ArticleExtras";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  return { title: article ? `${article.title} — version imprimable` : "Introuvable" };
}

/**
 * Version imprimable.
 *
 * Elle ne réutilise pas la page d'article : une impression encyclopédique n'a
 * ni barre latérale, ni sommaire flottant, ni boutons. Elle porte en revanche
 * ce qu'une page web cache — l'adresse d'origine et la date de consultation —
 * pour qu'une feuille imprimée reste citable.
 */
export default async function ImprimerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  const all = await getPublishedArticles();
  const linkMap = buildLinkMap(all);

  return (
    <div className="mx-auto max-w-3xl bg-white px-8 py-10 text-slate-900 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <a href={`/wiki/${article.slug}`} className="text-xs text-slate-500 hover:underline">
          ← Revenir à l&apos;article
        </a>
        <PrintButton />
      </div>

      <header className="border-b border-slate-300 pb-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
          {SITE.wikiName} · {categoryLabel(article.category)}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">{article.title}</h1>
        <p className="mt-2 text-sm italic text-slate-600">{article.summary}</p>
      </header>

      <article className="prose-print mt-6 text-[15px] leading-relaxed [&_a]:text-slate-900 [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mt-3">
        <MarkdownRenderer markdown={article.content} linkMap={linkMap} />
      </article>

      <SourcesSection article={article} />

      <footer className="mt-10 border-t border-slate-300 pt-3 text-[10px] text-slate-500">
        <p>
          {SITE.name} — page « {article.title} », consultée le{" "}
          {new Date().toLocaleDateString("fr-FR")}. Dernière modification :{" "}
          {formatDate(article.updatedAt)}.
        </p>
        <p className="mt-1">
          Adresse : /wiki/{article.slug} · Licence et crédits : /credits
        </p>
      </footer>
    </div>
  );
}
