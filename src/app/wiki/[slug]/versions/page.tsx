import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedArticleBySlug, getRevisionsBySlug } from "@/lib/articles-store";
import { getServerSession } from "@/lib/auth";
import { categoryIcon, categoryLabel, formatDateTime } from "@/lib/constants";
import type { RevisionAction } from "@/lib/types";
import RevisionCompare from "@/components/RevisionCompare";
import MobileNav from "@/components/MobileNav";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return { title: "Article introuvable" };
  return {
    title: `Versions de « ${article.title} »`,
    description: `Comparaison des versions successives de ${article.title}, à partir de l'historique des révisions.`,
  };
}

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

export default async function ArticleVersionsPage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  const [revisions, session] = await Promise.all([
    getRevisionsBySlug(slug),
    getServerSession(),
  ]);

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link href="/wiki" className="transition hover:text-gold-200">
            Wiki
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/wiki/${article.slug}`} className="transition hover:text-gold-200">
            {article.title}
          </Link>
          <span aria-hidden>/</span>
          <span>Versions</span>
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
          {categoryIcon(article.category)} {categoryLabel(article.category)}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Versions de « {article.title} »
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Chaque publication est conservée : {revisions.length} version
          {revisions.length > 1 ? "s" : ""} enregistrée
          {revisions.length > 1 ? "s" : ""}. Sélectionnez deux versions pour voir précisément
          ce qui a changé.
        </p>
      </header>

      <section aria-labelledby="comparaison" className="space-y-3">
        <h2 id="comparaison" className="font-display text-xl font-semibold text-gold-300">
          Comparer deux versions
        </h2>
        <RevisionCompare
          slug={article.slug}
          canRestore={Boolean(session)}
          revisions={revisions.map(({ snapshot: _snapshot, ...metadata }) => metadata)}
        />
        {session ? (
          <p className="text-xs text-slate-400">
            Vous êtes connecté en tant que <span className="text-gold-300">{session.username}</span>{" "}
            ({session.role}) : la restauration est possible et sera elle-même tracée dans
            l&apos;historique.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            La consultation est publique ; la restauration exige une connexion
            (<Link href="/connexion" className="text-gold-300 hover:underline">connexion</Link>).
          </p>
        )}
      </section>

      <section aria-labelledby="chronologie">
        <h2 id="chronologie" className="mb-4 font-display text-xl font-semibold text-gold-300">
          Chronologie des révisions
        </h2>
        {revisions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
            Aucune révision enregistrée pour cet article.
          </p>
        ) : (
          <ol className="space-y-2">
            {revisions.map((revision, index) => (
              <li
                key={revision.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-night-600 bg-night-800/60 px-4 py-3 text-sm"
              >
                <span className="text-xs text-slate-400">
                  {revisions.length - index}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    ACTION_STYLES[revision.action] ?? ACTION_STYLES.update
                  }`}
                >
                  {ACTION_LABELS[revision.action] ?? revision.action}
                </span>
                <span className="text-slate-200">{revision.author}</span>
                <span className="text-xs text-slate-400">
                  {formatDateTime(revision.createdAt)}
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {revision.snapshot.title}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
