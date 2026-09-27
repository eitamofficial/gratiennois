import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import ArticleCard from "@/components/ArticleCard";
import MobileNav from "@/components/MobileNav";

interface Props {
  params: Promise<{ tag: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `Tag « ${decodeURIComponent(tag)} »` };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag).toLowerCase();
  const articles = await getPublishedArticles();
  const matching = articles.filter((article) =>
    article.tags.some((item) => item.toLowerCase() === decoded),
  );

  if (matching.length === 0) notFound();

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-sm text-slate-400">
          <Link href="/tags" className="transition hover:text-gold-200">
            Index des tags
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200">#{decoded}</h1>
      </header>

      <section aria-labelledby="articles-tag">
        <h2 id="articles-tag" className="text-sm font-medium uppercase tracking-[0.18em] text-bronze-400">
          {matching.length} article{matching.length > 1 ? "s" : ""}
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {matching.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-night-600 bg-night-800/50 p-5">
        <h2 className="text-sm font-medium text-slate-200">Autres tags</h2>
        <p className="mt-2 flex flex-wrap gap-2">
          {[...new Set(articles.flatMap((article) => article.tags))]
            .filter((item) => item.toLowerCase() !== decoded)
            .slice(0, 20)
            .map((item) => (
              <Link
                key={item}
                href={`/tags/${encodeURIComponent(item)}`}
                className="rounded-full border border-night-600 px-2.5 py-0.5 text-xs text-bronze-300 transition hover:border-gold-500/50"
              >
                #{item}
              </Link>
            ))}
        </p>
      </section>
    </div>
  );
}
