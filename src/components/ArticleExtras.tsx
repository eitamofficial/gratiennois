import Link from "next/link";
import type { Article } from "@/lib/types";
import { banners, citedSourceIds, sourceLabel, suggestedBanners } from "@/lib/analysis";
import { categoryLabel } from "@/lib/constants";

/**
 * Bandeaux d'entretien et étiquettes d'état.
 *
 * Les bandeaux posés par la rédaction passent avant ceux déduits
 * automatiquement : c'est un jugement humain, il prime sur une heuristique.
 */
export function MaintenanceBanners({ article }: { article: Article }) {
  const explicites = banners(article);
  const deduits = suggestedBanners(article);
  const tous = [...explicites, ...deduits];
  if (tous.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {tous.map((banner) => (
        <p
          key={banner.code}
          className={`rounded-lg border px-3 py-2 text-xs ${
            banner.tone === "warn"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
              : "border-sky-500/40 bg-sky-500/10 text-sky-200"
          }`}
        >
          <strong className="font-semibold">{banner.label}</strong> — {banner.detail}
        </p>
      ))}
    </div>
  );
}

/** Étiquettes d'état affichées sous le titre : qualité, protection, langue. */
export function StatusBadges({ article }: { article: Article }) {
  const badges: Array<{ label: string; className: string }> = [];
  if (article.quality) {
    badges.push({
      label: "★ Article de qualité",
      className: "border-gold-500/60 bg-gold-500/10 text-gold-200",
    });
  }
  if (article.protection === "semi") {
    badges.push({
      label: "🔒 Semi-protégé",
      className: "border-slate-500/50 bg-slate-500/10 text-slate-300",
    });
  }
  if (article.protection === "full") {
    badges.push({
      label: "🔐 Protégé",
      className: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    });
  }
  if (article.lang && article.lang !== "fr") {
    badges.push({
      label: article.lang.toUpperCase(),
      className: "border-sky-500/40 bg-sky-500/10 text-sky-200",
    });
  }
  if (badges.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {badges.map((badge) => (
        <li
          key={badge.label}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.className}`}
        >
          {badge.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Bibliographie.
 *
 * Deux choses la distinguent d'une liste de liens : chaque source est numérotée
 * dans l'ordre du texte, et une citation archivée reste lisible même si le lien
 * d'origine a disparu. C'est le point où une encyclopédie se distingue d'un blog.
 */
export function SourcesSection({ article }: { article: Article }) {
  const sources = article.sources ?? [];
  if (sources.length === 0) return null;
  const citees = citedSourceIds(article.content);

  return (
    <section
      aria-labelledby="sources"
      className="mt-12 rounded-xl border border-night-600 bg-night-800/40 p-5"
    >
      <h2
        id="sources"
        className="mb-1 font-sans text-sm font-semibold uppercase tracking-[0.18em] text-gold-300"
      >
        Sources
      </h2>
      <p className="text-xs text-slate-500">
        {sources.length} référence{sources.length > 1 ? "s" : ""} ·{" "}
        {citees.size > 0
          ? `${citees.size} citée${citees.size > 1 ? "s" : ""} dans le texte`
          : "aucune appelée par une note"}
      </p>
      <ol className="mt-3 space-y-3">
        {sources.map((source, index) => (
          <li key={source.id} className="text-sm">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-xs text-bronze-300">[{index + 1}]</span>
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                {sourceLabel(source)}
              </span>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-200 underline decoration-night-500 hover:text-gold-200"
                >
                  {source.title}
                </a>
              ) : (
                <span className="text-slate-200">{source.title}</span>
              )}
            </div>
            <p className="ml-8 text-xs text-slate-500">
              {[source.author, source.date].filter(Boolean).join(" · ")}
            </p>
            {source.quote && (
              <blockquote className="ml-8 mt-1 border-l-2 border-night-500 pl-3 text-xs italic text-slate-400">
                « {source.quote} »
              </blockquote>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Renvoi vers la catégorie et les pages voisines, en bas d'article. */
export function CategoryFooter({ article }: { article: Article }) {
  return (
    <p className="mt-8 text-xs text-slate-500">
      Classé dans{" "}
      <Link
        href={`/wiki/categorie/${article.category}`}
        className="text-bronze-300 hover:text-gold-200"
      >
        {categoryLabel(article.category)}
      </Link>
      {article.tags.length > 0 && (
        <>
          {" · "}
          {article.tags.map((tag, index) => (
            <span key={tag}>
              {index > 0 && ", "}
              <Link href={`/tags/${encodeURIComponent(tag)}`} className="hover:text-gold-200">
                {tag}
              </Link>
            </span>
          ))}
        </>
      )}
    </p>
  );
}
