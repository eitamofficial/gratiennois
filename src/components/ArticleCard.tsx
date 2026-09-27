import Link from "next/link";
import { categoryIcon, categoryLabel, formatDate } from "@/lib/constants";
import type { ArticleListItem } from "@/lib/types";

export default function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <Link
      href={`/wiki/${article.slug}`}
      className="group flex h-full flex-col rounded-xl border border-night-600 bg-night-800/70 p-5 shadow-card transition hover:border-gold-500/50 hover:bg-night-800 focus:outline-none focus-visible:border-gold-400"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2.5 py-0.5 text-xs font-medium text-gold-300">
          {categoryIcon(article.category)} {categoryLabel(article.category)}
        </span>
      </div>

      <h3 className="font-display text-xl font-semibold text-slate-100 transition group-hover:text-gold-200">
        {article.title}
      </h3>

      {/* Résumé complet : rien n'est coupé, la carte s'allonge simplement. */}
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{article.summary}</p>

      {article.tags.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-night-700 px-2 py-0.5 text-xs text-bronze-300"
            >
              #{tag}
            </span>
          ))}
        </p>
      )}

      <p className="mt-auto pt-4 text-xs text-slate-400">
        Par {article.author} — mis à jour le {formatDate(article.updatedAt)}
      </p>
    </Link>
  );
}
