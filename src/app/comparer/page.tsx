import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import PageHeader, { PageShell } from "@/components/PageHeader";
import { buildLinkMap } from "@/lib/link-graph";

export const metadata: Metadata = {
  title: "Comparer deux pages",
  description: "Deux articles côte à côte, pour confronter deux récits.",
};

export const dynamic = "force-dynamic";

export default async function ComparerPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const articles = await getPublishedArticles();
  const gauche = articles.find((article) => article.slug === a) ?? null;
  const droite = articles.find((article) => article.slug === b) ?? null;
  const linkMap = buildLinkMap(articles);

  return (
    <PageShell>
      <PageHeader eyebrow="Confrontation" icon="⚖️" title="Comparer deux pages">
        <p>
          Deux textes côte à côte, chacun avec son titre et son résumé. Utile
          lorsqu&apos;un même événement est raconté à deux endroits — et que les
          deux récits ne s&apos;accordent pas.
        </p>
      </PageHeader>

      <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs text-slate-400">
          Première page
          <select
            name="a"
            defaultValue={a ?? ""}
            className="mt-1 w-full rounded-lg border border-night-500 bg-night-900 px-3 py-2 text-sm text-slate-200"
          >
            <option value="">— choisir —</option>
            {articles.map((article) => (
              <option key={article.slug} value={article.slug}>
                {article.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Seconde page
          <select
            name="b"
            defaultValue={b ?? ""}
            className="mt-1 w-full rounded-lg border border-night-500 bg-night-900 px-3 py-2 text-sm text-slate-200"
          >
            <option value="">— choisir —</option>
            {articles.map((article) => (
              <option key={article.slug} value={article.slug}>
                {article.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-lg border border-gold-500 bg-gold-500/10 px-4 py-2 text-sm text-gold-200"
        >
          Comparer
        </button>
      </form>

      {(gauche || droite) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {[gauche, droite].map((article, index) => (
            <section key={index} className="min-w-0">
              {article ? (
                <>
                  <h2 className="font-display text-xl text-gold-200">
                    <Link href={`/wiki/${article.slug}`} className="hover:underline">
                      {article.title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">{article.summary}</p>
                  <div className="mt-3 max-h-[32rem] overflow-y-auto rounded-xl border border-night-600 bg-night-900/40 p-4">
                    <MarkdownRenderer markdown={article.content} linkMap={linkMap} />
                  </div>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-500">
                  Choisissez une page.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
