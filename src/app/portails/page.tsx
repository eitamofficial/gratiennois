import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import { CATEGORY_LIST } from "@/lib/constants";
import { completeness, inboundCounts, wikiStats } from "@/lib/analysis";
import { formatDate } from "@/lib/constants";
import PageHeader, { PageShell } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Portails",
  description: "Entrées thématiques du wiki : histoire, institutions, géographie, culture, lois, personnalités.",
};

export const dynamic = "force-dynamic";

export default async function PortailsPage() {
  const articles = await getPublishedArticles();
  const counts = inboundCounts(articles);
  const stats = wikiStats(articles);

  return (
    <PageShell>
      <PageHeader eyebrow="Sommaire général" icon="🧭" title="Portails thématiques">
        <p>
          Six entrées, une par domaine. Chaque portail propose les pages les plus
          étoffées de sa catégorie — celles qui ont des sources, un lien entrant et
          une infobox complète, plutôt que les plus récemment modifiées.
        </p>
        <p className="text-xs text-slate-500">
          {stats.articles} articles · {stats.sources} sources citées · complétude moyenne{" "}
          {stats.averageCompleteness} %
        </p>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        {CATEGORY_LIST.map((category) => {
          const pages = articles
            .filter((article) => article.category === category.id)
            .map((article) => ({
              article,
              score: completeness(article, counts.get(article.slug) ?? 0).score,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);

          return (
            <section
              key={category.id}
              className="rounded-2xl border border-night-600 bg-night-800/40 p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-gold-200">
                  <span aria-hidden className="mr-2">
                    {category.icon}
                  </span>
                  {category.label}
                </h2>
                <Link
                  href={`/wiki/categorie/${category.id}`}
                  className="text-xs text-bronze-300 hover:text-gold-200"
                >
                  Tout voir →
                </Link>
              </div>
              <p className="mt-1 text-xs text-slate-400">{category.description}</p>

              {pages.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-night-500 p-3 text-xs text-slate-500">
                  Aucune page dans cette catégorie.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {pages.map(({ article, score }) => (
                    <li key={article.slug} className="flex items-baseline gap-2 text-sm">
                      <span
                        aria-hidden
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          score >= 70 ? "bg-emerald-400" : score >= 45 ? "bg-gold-400" : "bg-night-400"
                        }`}
                      />
                      <Link href={`/wiki/${article.slug}`} className="text-slate-200 hover:text-gold-200">
                        {article.title}
                      </Link>
                      <span className="ml-auto shrink-0 text-[11px] text-slate-500">{score} %</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-night-600 bg-night-800/30 p-5">
        <h2 className="font-display text-lg font-semibold text-gold-200">Autres entrées</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {[
            { href: "/repertoire", label: "Index alphabétique" },
            { href: "/chronologie", label: "Chronologie" },
            { href: "/galerie", label: "Galerie" },
            { href: "/homonymie", label: "Homonymies" },
            { href: "/calendrier", label: "Calendrier" },
            { href: "/recent", label: "Modifications récentes" },
            { href: "/statistiques", label: "Statistiques" },
            { href: "/a-propos", label: "À propos" },
          ].map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className="rounded-full border border-night-500 px-3 py-1 text-slate-300 hover:border-gold-500 hover:text-gold-200"
            >
              {lien.label}
            </Link>
          ))}
        </div>
        {stats.lastUpdate && (
          <p className="mt-4 text-xs text-slate-500">
            Dernière modification du corpus : {formatDate(stats.lastUpdate)}
          </p>
        )}
      </section>
    </PageShell>
  );
}
