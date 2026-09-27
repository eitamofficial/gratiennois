import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Index des tags",
  description: "Tous les mots-clés utilisés dans le wiki du IIIe Delphinat, classés par fréquence.",
};

export const dynamic = "force-dynamic";

export default async function TagsIndexPage() {
  const articles = await getPublishedArticles();

  const counts = new Map<string, number>();
  for (const article of articles) {
    for (const tag of article.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  const max = tags[0]?.[1] ?? 1;

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
          Organisation
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Index des tags
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          {tags.length} mot-clé{tags.length > 1 ? "s" : ""} utilisé
          {tags.length > 1 ? "s" : ""} sur {articles.length} article
          {articles.length > 1 ? "s" : ""}. Utilisez-les pour parcourir le wiki par thème.
        </p>
      </header>

      {tags.length === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          Aucun tag pour le moment.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map(([tag, count]) => (
            <li key={tag}>
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                style={{ fontSize: `${0.8 + (count / max) * 0.6}rem` }}
                className="inline-flex items-center gap-1.5 rounded-full border border-night-600 bg-night-800/70 px-3.5 py-2.5 text-bronze-200 transition hover:border-gold-500/50 hover:text-gold-200"
              >
                #{tag}
                <span className="text-xs text-slate-400">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
