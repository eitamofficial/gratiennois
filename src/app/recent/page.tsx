import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles, getRecentRevisions } from "@/lib/articles-store";
import { recentComments } from "@/lib/comments-store";
import { categoryLabel, formatDateTime } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Modifications récentes",
  description:
    "Le fil des dernières modifications du wiki de Gratianopolis : qui a changé quoi, et quand.",
};

export const dynamic = "force-dynamic";

/** Libellé lisible d'une action de révision. */
const ACTIONS: Record<string, { label: string; icon: string; tone: string }> = {
  create: { label: "création", icon: "＋", tone: "text-emerald-300 border-emerald-500/40" },
  update: { label: "modification", icon: "✎", tone: "text-gold-200 border-gold-500/40" },
  restore: { label: "restauration", icon: "↺", tone: "text-sky-300 border-sky-500/40" },
  delete: { label: "suppression", icon: "✕", tone: "text-red-300 border-red-500/40" },
};

/**
 * Modifications récentes — la page que toute encyclopédie collaborative doit.
 *
 * Elle rend le wiki **vérifiable** : n'importe qui peut voir ce qui a bougé,
 * par qui, et remonter à la version précédente. C'est aussi le meilleur
 * indicateur de vitalité d'un projet — une page figée depuis six mois se voit
 * immédiatement ici.
 */
export default async function RecentPage() {
  const [revisions, articles, comments] = await Promise.all([
    getRecentRevisions(60),
    getPublishedArticles(),
    recentComments(12),
  ]);

  const bySlug = new Map(articles.map((article) => [article.slug, article]));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
          Journal du wiki
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Modifications récentes
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-400">
          Chaque ligne est une version enregistrée. Une page supprimée reste
          visible ici : c&apos;est le principe même d&apos;un historique — on ne
          réécrit pas le passé, on l&apos;annote.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="Dernières modifications">
          {revisions.length === 0 ? (
            <p className="rounded-lg border border-night-600 bg-night-800/50 px-4 py-6 text-sm text-slate-400">
              Aucune modification enregistrée pour l&apos;instant.
            </p>
          ) : (
            <ol className="divide-y divide-night-700 overflow-hidden rounded-xl border border-night-600">
              {revisions.map((revision) => {
                const article = bySlug.get(revision.articleSlug);
                const action = ACTIONS[revision.action] ?? ACTIONS.update;
                const vivant = Boolean(article);

                return (
                  <li key={revision.id} className="bg-night-800/40 px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span
                        className={`rounded border px-1.5 py-px text-[10px] uppercase tracking-wide ${action.tone}`}
                      >
                        {action.icon} {action.label}
                      </span>

                      {vivant ? (
                        <Link
                          href={`/wiki/${revision.articleSlug}`}
                          className="min-w-0 font-medium text-slate-100 transition hover:text-gold-200"
                        >
                          {revision.snapshot.title}
                        </Link>
                      ) : (
                        <span className="min-w-0 text-slate-400 line-through">
                          {revision.snapshot.title}
                        </span>
                      )}

                      <span className="text-xs text-slate-500">
                        {vivant ? categoryLabel(revision.snapshot.category) : "page retirée"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(revision.createdAt)} · par{" "}
                      <span className="text-bronze-300">{revision.author}</span>
                      {vivant && (
                        <>
                          {" · "}
                          <Link
                            href={`/wiki/${revision.articleSlug}/versions`}
                            className="underline decoration-night-500 underline-offset-2 transition hover:text-gold-200"
                          >
                            voir l&apos;historique
                          </Link>
                        </>
                      )}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside className="space-y-6">
          <section
            aria-labelledby="commentaires-recents"
            className="rounded-xl border border-night-600 bg-night-800/40 p-4"
          >
            <h2
              id="commentaires-recents"
              className="font-display text-lg font-semibold text-gold-200"
            >
              Dernières discussions
            </h2>
            {comments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Personne n&apos;a encore commenté. Les articles ont chacun un fil,
                en bas de page.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {comments.map((comment) => (
                  <li key={comment.id} className="text-sm">
                    <Link
                      href={`/wiki/${comment.slug}#discussion`}
                      className="text-slate-300 underline decoration-night-500 underline-offset-2 transition hover:text-gold-200"
                    >
                      {bySlug.get(comment.slug)?.title ?? comment.slug}
                    </Link>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {comment.displayName} — {comment.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gold-500/25 bg-gold-500/5 p-4">
            <h2 className="font-display text-lg font-semibold text-gold-200">
              Participer
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Un compte Discord suffit pour commenter. L&apos;écriture des articles
              est réservée aux charges de la Constitution.
            </p>
            <Link
              href="/connexion"
              className="mt-3 inline-block rounded-md bg-gold-500 px-3 py-2 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
            >
              Se connecter
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
