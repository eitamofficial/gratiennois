import Link from "next/link";
import type { Metadata } from "next";
import { getArticlesByCategory } from "@/lib/articles-store";
import { getHistoryPeriods } from "@/lib/roster";
import { formatDate } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Chronologie du Delphinat",
  description:
    "Les règnes, l'interrègne et les ruptures du Delphinat de Gratianopolis, dans l'ordre du récit officiel.",
};

export const dynamic = "force-dynamic";

/**
 * Chronologie du Delphinat.
 *
 * ## Pourquoi l'ordre vient du fichier partagé
 *
 * `shared/roster.json` porte déjà la suite officielle des périodes, avec un
 * champ `ordre`. C'est ce même fichier que lit le bot Discord pour présenter
 * l'histoire. Reconstituer l'ordre ici à partir des dates de rédaction aurait
 * donné une chronologie de **l'écriture du wiki**, pas de l'histoire qu'il
 * raconte — deux choses qui n'ont rien à voir, et que la page aurait confondues.
 */
export default async function ChronologiePage() {
  const [periodes, articles] = await Promise.all([
    Promise.resolve(getHistoryPeriods()),
    getArticlesByCategory("histoire"),
  ]);

  const parSlug = new Map(articles.map((article) => [article.slug, article]));

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
          Mémoire du Delphinat
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Chronologie
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-400">
          Du premier règne à aujourd&apos;hui : les périodes constitutionnelles,
          dans l&apos;ordre où la Constitution les reconnaît.
        </p>
      </header>

      <ol className="relative space-y-6 border-l border-gold-500/25 pl-6 sm:pl-8">
        {periodes.map((periode, index) => {
          const article = parSlug.get(periode.articleSlug);

          return (
            <li key={periode.id} className="relative">
              {/* Le point de la frise. Décoratif : l'information est dans le
                  titre qui suit, jamais dans la puce. */}
              <span
                aria-hidden
                className="absolute -left-[1.72rem] top-2 flex h-4 w-4 items-center justify-center rounded-full border border-gold-500/60 bg-night-900 sm:-left-[2.22rem]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
              </span>

              <article className="rounded-xl border border-night-600 bg-night-800/50 p-5 transition hover:border-gold-500/40">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-bronze-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-display text-xl font-semibold text-gold-200">
                    {periode.libelle}
                  </h2>
                  {periode.periode && periode.periode !== periode.libelle && (
                    <span className="text-xs text-slate-500">{periode.periode}</span>
                  )}
                </div>

                {article ? (
                  <>
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-400">
                      {article.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                      <Link
                        href={`/wiki/${article.slug}`}
                        className="font-medium text-gold-300 underline decoration-gold-500/40 underline-offset-2 transition hover:text-gold-200"
                      >
                        Lire la période →
                      </Link>
                      <span className="text-slate-600">
                        page mise à jour le {formatDate(article.updatedAt)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    La page de cette période reste à écrire.
                  </p>
                )}
              </article>
            </li>
          );
        })}
      </ol>

      {articles.length > 0 && (
        <section aria-labelledby="autres-histoires" className="space-y-4">
          <h2
            id="autres-histoires"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Toutes les pages d&apos;histoire
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/wiki/${article.slug}`}
                  className="block rounded-lg border border-night-600 bg-night-800/40 px-4 py-3 transition hover:border-gold-500/40"
                >
                  <span className="block text-sm font-medium text-slate-200">
                    {article.title}
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-xs text-slate-500">
                    {article.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
