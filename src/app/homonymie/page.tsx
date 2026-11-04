import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import { duplicateTitles } from "@/lib/analysis";
import PageHeader, { PageShell } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Homonymies",
  description: "Pages qui partagent un titre et demandent une désambiguïsation.",
};

export const dynamic = "force-dynamic";

export default async function HomonymiePage() {
  const articles = await getPublishedArticles();
  const groupes = duplicateTitles(articles);

  return (
    <PageShell>
      <PageHeader eyebrow="Désambiguïsation" icon="🔀" title="Homonymies">
        <p>
          Deux pages portant le même titre obligent le lecteur à deviner laquelle
          il cherche. Cette page les recense pour que la rédaction tranche : soit
          un titre plus précis, soit une page d&apos;homonymie qui oriente vers
          les deux.
        </p>
      </PageHeader>

      {groupes.size === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          Aucun titre en double. Rien à désambiguïser.
        </p>
      ) : (
        <ul className="space-y-4">
          {[...groupes].map(([titre, liste]) => (
            <li key={titre} className="rounded-xl border border-night-600 bg-night-800/40 p-4">
              <h2 className="font-display text-lg text-gold-200">
                « {liste[0].title} » — {liste.length} pages
              </h2>
              <ul className="mt-2 space-y-1 text-sm">
                {liste.map((article) => (
                  <li key={article.slug}>
                    <Link href={`/wiki/${article.slug}`} className="text-slate-200 hover:text-gold-200">
                      {article.title}
                    </Link>
                    <span className="ml-2 text-xs text-slate-500">/{article.slug}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
