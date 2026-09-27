import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getRevisionPage, listRevisionAuthors } from "@/lib/articles-store";
import { formatDateTime } from "@/lib/constants";
import type { RevisionAction } from "@/lib/types";
import MobileNav from "@/components/MobileNav";
import Pagination from "@/components/Pagination";
import RevisionFilters from "@/components/RevisionFilters";

export const metadata: Metadata = {
  title: "Activité",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<RevisionAction, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  restore: "Restauration",
};

const ACTION_STYLES: Record<RevisionAction, string> = {
  create: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  update: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  delete: "border-red-500/40 bg-red-500/10 text-red-300",
  restore: "border-violet-500/40 bg-violet-500/10 text-violet-300",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/connexion?next=/admin/activite");

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string" && value) query.set(key, value);
  }

  const [page, authors] = await Promise.all([getRevisionPage(query), listRevisionAuthors()]);
  const { revisions, total, totalPages } = page;
  const hasFilters = Boolean(page.query.q || page.query.action || page.query.author);

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-sm text-slate-400">
          <Link href="/admin" className="transition hover:text-gold-200">
            Administration
          </Link>{" "}
          / Activité
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200">
          Fil d&apos;activité
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {total} révision{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""}, tous articles
          confondus.
        </p>
      </header>

      <RevisionFilters
        action="/admin/activite"
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
            : "Aucune révision enregistrée pour le moment."}
        </p>
      ) : (
        <ol className="space-y-2">
          {revisions.map((revision) => (
            <li
              key={revision.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-night-600 bg-night-800/60 px-4 py-3 text-sm"
            >
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  ACTION_STYLES[revision.action] ?? ACTION_STYLES.update
                }`}
              >
                {ACTION_LABELS[revision.action] ?? revision.action}
              </span>
              <Link
                href={`/wiki/${revision.articleSlug}`}
                className="font-medium text-slate-100 transition hover:text-gold-200"
              >
                {revision.snapshot.title}
              </Link>
              <span className="text-xs text-slate-400">
                par {revision.author} · {formatDateTime(revision.createdAt)}
              </span>
              <Link
                href={`/admin/${revision.articleSlug}/historique`}
                className="ml-auto text-xs text-gold-300/80 hover:underline"
              >
                historique →
              </Link>
            </li>
          ))}
        </ol>
      )}

      <Pagination
        pathname="/admin/activite"
        params={{
          q: page.query.q,
          action: page.query.action,
          author: page.query.author,
          perPage: String(page.query.perPage),
        }}
        page={page.query.page}
        totalPages={totalPages}
        total={total}
        perPage={page.query.perPage}
      />
    </div>
  );
}
