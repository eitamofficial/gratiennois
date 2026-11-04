import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORY_INFO } from "@/lib/constants";
import { CATEGORIES, type Category } from "@/lib/types";
import { getArticlesByCategory, getPublishedArticles } from "@/lib/articles-store";
import { categoryFacets } from "@/lib/analysis";
import ArticleCard from "@/components/ArticleCard";
import MobileNav from "@/components/MobileNav";

interface Props {
  params: Promise<{ category: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return { title: "Catégorie introuvable" };
  }
  const info = CATEGORY_INFO[category as Category];
  return {
    title: `${info.label} — Catégories`,
    description: info.description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  if (!(CATEGORIES as readonly string[]).includes(category)) notFound();

  const id = category as Category;
  const info = CATEGORY_INFO[id];
  const [articles, toutes] = await Promise.all([
    getArticlesByCategory(id),
    getPublishedArticles(),
  ]);
  const facettes = categoryFacets(toutes, id);

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-sm text-slate-400">
          <Link href="/wiki" className="transition hover:text-gold-200">
            Wiki
          </Link>{" "}
          / Catégorie
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          <span aria-hidden className="mr-3">
            {info.icon}
          </span>
          {info.label}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{info.description}</p>
      </header>

      {/* Sous-niveaux : les étiquettes servent de sous-catégories. Le wiki n'a
          pas de hiérarchie saisie à la main, mais chaque article porte déjà ses
          étiquettes — les regrouper donne une arborescence sans travail
          supplémentaire, et sans risque d'inventer une structure. */}
      {facettes.length > 1 && (
        <nav aria-label="Sous-thèmes" className="flex flex-wrap gap-1.5">
          {facettes.slice(0, 14).map((facette) => (
            <Link
              key={facette.tag}
              href={`/tags/${encodeURIComponent(facette.tag)}`}
              className="rounded-full border border-night-500 px-2.5 py-0.5 text-[11px] text-slate-300 hover:border-gold-500 hover:text-gold-200"
            >
              {facette.tag}
              <span className="ml-1 text-slate-500">{facette.count}</span>
            </Link>
          ))}
        </nav>
      )}

      <section aria-labelledby="articles-categorie">
        <h2 id="articles-categorie" className="text-sm font-medium uppercase tracking-[0.18em] text-bronze-400">
          {articles.length} article{articles.length > 1 ? "s" : ""}
        </h2>

        {articles.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
            Aucun article dans cette catégorie pour l&apos;instant. Revenez bientôt — la
            rédaction du wiki travaille sur de nouvelles pages.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
