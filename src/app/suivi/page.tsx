import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getPublishedArticles } from "@/lib/articles-store";
import { watchedSlugs } from "@/lib/features";
import { formatDateTime } from "@/lib/constants";
import PageHeader, { PageShell } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Ma liste de suivi" };
export const dynamic = "force-dynamic";

export default async function SuiviPage() {
  const session = await getServerSession();
  if (!session) redirect("/connexion?suite=/suivi");

  const [slugs, articles] = await Promise.all([
    watchedSlugs(session.username),
    getPublishedArticles(),
  ]);
  const suivis = articles
    .filter((article) => slugs.includes(article.slug))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <PageShell>
      <PageHeader eyebrow="Veille" icon="👁️" title="Ma liste de suivi">
        <p>
          Les pages que vous suivez. Une modification y apparaît en tête, avec sa
          date — de quoi relire ce qui a changé sans parcourir tout l&apos;historique.
        </p>
      </PageHeader>

      {suivis.length === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          Vous ne suivez aucune page. Le bouton « Suivre » se trouve en haut de
          chaque article.
        </p>
      ) : (
        <ul className="divide-y divide-night-700 rounded-xl border border-night-600">
          {suivis.map((article) => (
            <li key={article.slug} className="flex flex-wrap items-baseline gap-3 p-3">
              <Link href={`/wiki/${article.slug}`} className="text-sm text-slate-200 hover:text-gold-200">
                {article.title}
              </Link>
              <span className="ml-auto text-xs text-slate-500">
                modifié le {formatDateTime(article.updatedAt)}
              </span>
              <Link
                href={`/wiki/${article.slug}/versions`}
                className="text-xs text-bronze-300 hover:text-gold-200"
              >
                historique
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
