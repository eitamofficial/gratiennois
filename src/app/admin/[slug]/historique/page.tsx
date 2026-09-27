import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getArticleBySlug, getRevisionPage, listRevisionAuthors } from "@/lib/articles-store";
import { formatDateTime } from "@/lib/constants";
import type { RevisionAction } from "@/lib/types";
import RestoreRevisionButton from "@/components/RestoreRevisionButton";
import MobileNav from "@/components/MobileNav";
import Pagination from "@/components/Pagination";
import RevisionFilters from "@/components/RevisionFilters";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
  title: "Historique des révisions",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<RevisionAction, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  restore: "Restauration",
};

/** Transforme `?perPage=50` (une valeur possible) en URLSearchParams. */
function toSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value) search.set(key, value);
  }
  return search;
}

export default async function RevisionHistoryPage({ params, searchParams }: Props) {
  const session = await getServerSession();
  const { slug } = await params;
  if (!session) redirect(`/connexion?next=/admin/${slug}/historique`);

  const query = toSearchParams(await searchParams);
  const [article, page, authors] = await Promise.all([
    getArticleBySlug(slug),
    getRevisionPage(query, { slug }),
    listRevisionAuthors(),
  ]);
  const { revisions, total, totalPages } = page;
  const hasFilters = Boolean(page.query.q || page.query.action || page.query.author);
  if (!article && total === 0) notFound();

  const selfPath = `/admin/${slug}/historique`;
  const filterParams = {
    q: page.query.q,
    action: page.query.action,
    author: page.query.author,
    perPage: String(page.query.perPage),
  };

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-sm text-slate-400">
          <Link href="/admin" className="transition hover:text-gold-200">
            Administration
          </Link>{" "}
          / Historique
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-gold-200 sm:text-3xl">
          {article ? article.title : `Historique de « ${slug} »`}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {total} révision{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""} (50 maximum par
          article). Chaque création, modification, suppression et restauration est tracée.
        </p>
        <p className="mt-3">
          <Link
            href={`/wiki/${slug}/versions`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gold-500/40 px-3 py-1.5 text-xs font-medium text-gold-300 transition hover:bg-gold-500/10"
          >
            🕘 Comparer deux versions →
          </Link>
        </p>
      </header>

      <RevisionFilters
        action={selfPath}
        authors={authors}
        values={{
          q: page.query.q,
          action: page.query.action,
          author: page.query.author,
          perPage: page.query.perPage,
        }}
      />

      {revisions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          {hasFilters
            ? "Aucune révision ne correspond à ces filtres."
            : "Cet article n'a aucune révision enregistrée."}
        </p>
      ) : (
        <ol className="space-y-4">
          {revisions.map((revision) => (
          <li key={revision.id} className="rounded-xl border border-night-600 bg-night-800/60">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2.5 py-0.5 text-xs font-medium text-gold-300">
                    {ACTION_LABELS[revision.action] ?? revision.action}
                  </span>
                  <span className="text-slate-200">{revision.snapshot.title}</span>
                  <span className="text-xs text-slate-400">
                    par {revision.author} · {formatDateTime(revision.createdAt)}
                  </span>
                </span>
                <span className="text-xs text-gold-300/80">Détails ▾</span>
              </summary>

              <div className="border-t border-night-600 px-5 py-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">
                  Contenu à cette révision
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-night-600 bg-night-950 p-3 text-xs leading-5 text-slate-400">
                  {revision.snapshot.content}
                </pre>
                <div className="mt-3">
                  <RestoreRevisionButton
                    slug={slug}
                    revisionId={revision.id}
                    createdAt={revision.createdAt}
                  />
                </div>
              </div>
            </details>
          </li>
          ))}
        </ol>
      )}

      <Pagination
        pathname={selfPath}
        params={filterParams}
        page={page.query.page}
        totalPages={totalPages}
        total={total}
        perPage={page.query.perPage}
      />
    </div>
  );
}
