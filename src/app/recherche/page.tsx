import Link from "next/link";
import type { Metadata } from "next";
import { searchArticles } from "@/lib/search";
import { CATEGORY_INFO } from "@/lib/constants";
import { CATEGORIES, type Category } from "@/lib/types";
import MobileNav from "@/components/MobileNav";

interface Props {
  searchParams: Promise<{ q?: string; categorie?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Recherche : ${q}` : "Recherche",
    robots: { index: false },
  };
}

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: Props) {
  const { q, categorie } = await searchParams;
  const query = (q ?? "").trim();
  const activeCategory = (CATEGORIES as readonly string[]).includes(categorie ?? "")
    ? (categorie as Category)
    : undefined;

  const outcome = query
    ? await searchArticles(query, { category: activeCategory })
    : { results: [], facets: [], total: 0, suggestions: [] };

  return (
    <div className="space-y-8">
      <MobileNav />

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
          Recherche intelligente
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          {query ? <>Résultats pour « {query} »</> : "Recherche"}
        </h1>
        {query && (
          <p className="mt-2 text-sm text-slate-400">
            {outcome.total} résultat{outcome.total > 1 ? "s" : ""}
          </p>
        )}
      </header>

      {!query && (
        <p className="rounded-xl border border-night-600 bg-night-800/50 p-6 text-sm text-slate-400">
          Saisissez votre recherche dans la barre en haut de page (
          <kbd className="rounded border border-night-500 px-1.5 py-0.5 text-xs">Ctrl K</kbd>).
          Les fautes de frappe sont tolérées et les résultats sont classés par pertinence
          (titre, tags, résumé, contenu).
        </p>
      )}

      {query && outcome.facets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/recherche?q=${encodeURIComponent(query)}`}
            className={`rounded-full border px-3 py-3 text-xs transition ${
              !activeCategory
                ? "border-gold-500/60 bg-gold-500/10 text-gold-200"
                : "border-night-600 text-slate-300 hover:border-gold-500/50"
            }`}
          >
            Toutes
          </Link>
          {outcome.facets.map((facet) => (
            <Link
              key={facet.category}
              href={`/recherche?q=${encodeURIComponent(query)}&categorie=${facet.category}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-3 text-xs transition ${
                activeCategory === facet.category
                  ? "border-gold-500/60 bg-gold-500/10 text-gold-200"
                  : "border-night-600 text-slate-300 hover:border-gold-500/50"
              }`}
            >
              {CATEGORY_INFO[facet.category].icon} {CATEGORY_INFO[facet.category].label}
              <span className="text-slate-400">{facet.count}</span>
            </Link>
          ))}
        </div>
      )}

      {query && outcome.total === 0 && (
        <div className="rounded-xl border border-night-600 bg-night-800/50 p-6 text-sm text-slate-400">
          <p>Aucun article ne correspond à « {query} ».</p>
          {outcome.suggestions.length > 0 && (
            <p className="mt-3">
              Vouliez-vous dire{" "}
              {outcome.suggestions.map((suggestion, index) => (
                <span key={suggestion}>
                  {index > 0 && " ou "}
                  <Link
                    href={`/recherche?q=${encodeURIComponent(suggestion)}`}
                    className="text-gold-300 hover:underline"
                  >
                    {suggestion}
                  </Link>
                </span>
              ))}
              ?
            </p>
          )}
          <p className="mt-3">
            Parcourez <Link href="/wiki" className="text-gold-300 hover:underline">l&apos;index</Link>{" "}
            ou les <Link href="/tags" className="text-gold-300 hover:underline">tags</Link>.
          </p>
        </div>
      )}

      <ul className="space-y-4">
        {outcome.results.map((hit) => (
          <li key={hit.slug}>
            <Link
              href={`/wiki/${hit.slug}`}
              className="block rounded-xl border border-night-600 bg-night-800/60 p-5 transition hover:border-gold-500/50 hover:bg-night-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2.5 py-0.5 text-xs font-medium text-gold-300">
                  {CATEGORY_INFO[hit.category].icon} {CATEGORY_INFO[hit.category].label}
                </span>
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  trouvé dans : {hit.matchedIn.join(", ")}
                </span>
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold text-slate-100">{hit.title}</h2>
              <p
                className="excerpt mt-1.5 text-[0.95rem] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: hit.excerpt }}
              />
              {hit.tags.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {hit.tags.map((tag) => (
                    <span key={tag} className="rounded bg-night-700 px-2 py-0.5 text-xs text-bronze-300">
                      #{tag}
                    </span>
                  ))}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
