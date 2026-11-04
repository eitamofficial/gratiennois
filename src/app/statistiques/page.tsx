import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles, queryRevisions } from "@/lib/articles-store";
import { countCommentsBySlug } from "@/lib/comments-store";
import { CATEGORY_LIST, categoryIcon, categoryLabel, formatDate } from "@/lib/constants";
import { CATEGORIES, type Category } from "@/lib/types";

export const metadata: Metadata = {
  title: "Chiffres du wiki",
  description:
    "État des lieux du wiki de Gratianopolis : nombre d'articles, de versions, de contributeurs et répartition par domaine.",
};

export const dynamic = "force-dynamic";

/** Nombre de mots d'un texte Markdown, approximé sur les espaces. */
function countWords(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|[\]()!-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Compteur présenté comme une tuile de chiffre clé. */
function Stat({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-night-600 bg-night-800/50 p-4">
      <p className="font-display text-3xl font-semibold tabular-nums text-gold-200">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-300">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/**
 * Chiffres du wiki.
 *
 * Une page de statistiques n'est pas un ornement : sur un projet porté par
 * quelques bénévoles, elle dit ce qui avance et ce qui stagne. La répartition
 * par domaine, en particulier, révèle les pans délaissés — une catégorie à un
 * seul article est un chantier, pas un succès.
 */
export default async function StatsPage() {
  const [articles, revisionPage, commentCounts] = await Promise.all([
    getPublishedArticles(),
    queryRevisions({ limit: 2000, offset: 0 }),
    countCommentsBySlug(),
  ]);

  const revisions = revisionPage.revisions;
  const totalRevisions = revisionPage.total;
  const totalComments = Object.values(commentCounts).reduce((sum, n) => sum + n, 0);

  const words = articles.reduce(
    (sum, article) => sum + countWords(article.content) + countWords(article.summary),
    0,
  );

  const authors = new Set(revisions.map((revision) => revision.author));

  // Répartition par catégorie.
  const parCategorie = CATEGORIES.map((category) => ({
    category,
    count: articles.filter((article) => article.category === category).length,
  }));
  const maxCategorie = Math.max(1, ...parCategorie.map((entry) => entry.count));

  // Pages les plus modifiées.
  const parArticle = new Map<string, { title: string; count: number }>();
  for (const revision of revisions) {
    const entry = parArticle.get(revision.articleSlug);
    if (entry) entry.count += 1;
    else parArticle.set(revision.articleSlug, { title: revision.snapshot.title, count: 1 });
  }
  const plusModifiees = [...parArticle.entries()]
    .map(([slug, entry]) => ({ slug, ...entry }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Articles les plus commentés.
  const plusCommentes = Object.entries(commentCounts)
    .map(([slug, count]) => ({
      slug,
      count,
      title: articles.find((article) => article.slug === slug)?.title ?? slug,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const derniere = articles
    .map((article) => article.updatedAt)
    .sort((a, b) => b.localeCompare(a))[0];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
          État des lieux
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Le wiki en chiffres
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-400">
          Chiffres calculés à l&apos;instant, sur le contenu réellement publié.
          {derniere ? ` Dernière mise à jour : ${formatDate(derniere)}.` : ""}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={String(articles.length)} label="articles publiés" />
        <Stat value={words.toLocaleString("fr-FR")} label="mots rédigés" />
        <Stat
          value={String(totalRevisions)}
          label="versions enregistrées"
          hint="chaque enregistrement est conservé"
        />
        <Stat
          value={String(authors.size)}
          label="contributeurs"
          hint={`${totalComments} commentaire${totalComments > 1 ? "s" : ""}`}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section
          aria-labelledby="repartition"
          className="rounded-xl border border-night-600 bg-night-800/40 p-5"
        >
          <h2 id="repartition" className="font-display text-xl font-semibold text-gold-200">
            Répartition par domaine
          </h2>
          <ul className="mt-4 space-y-3">
            {parCategorie.map(({ category, count }) => (
              <li key={category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <Link
                    href={`/wiki/categorie/${category}`}
                    className="text-slate-300 transition hover:text-gold-200"
                  >
                    <span aria-hidden>{categoryIcon(category as Category)}</span>{" "}
                    {categoryLabel(category as Category)}
                  </Link>
                  <span className="tabular-nums text-slate-500">{count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-night-700">
                  <div
                    className="h-full rounded-full bg-gold-500/70"
                    style={{ width: `${Math.round((count / maxCategorie) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Une barre courte n&apos;est pas un échec : c&apos;est une page à écrire.
            {CATEGORY_LIST.length} domaines structurent l&apos;encyclopédie.
          </p>
        </section>

        <section
          aria-labelledby="activite"
          className="rounded-xl border border-night-600 bg-night-800/40 p-5"
        >
          <h2 id="activite" className="font-display text-xl font-semibold text-gold-200">
            Pages les plus retravaillées
          </h2>
          {plusModifiees.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Pas encore de version enregistrée.</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {plusModifiees.map((entry, index) => (
                <li key={entry.slug} className="flex items-baseline gap-3 text-sm">
                  <span className="w-5 shrink-0 text-right tabular-nums text-slate-600">
                    {index + 1}
                  </span>
                  <Link
                    href={`/wiki/${entry.slug}`}
                    className="min-w-0 flex-1 truncate text-slate-300 transition hover:text-gold-200"
                  >
                    {entry.title}
                  </Link>
                  <span className="shrink-0 tabular-nums text-xs text-slate-500">
                    {entry.count} versions
                  </span>
                </li>
              ))}
            </ol>
          )}

          {plusCommentes.length > 0 && (
            <>
              <h3 className="mt-6 font-display text-base font-semibold text-gold-200/90">
                Les plus discutées
              </h3>
              <ol className="mt-3 space-y-2">
                {plusCommentes.map((entry) => (
                  <li key={entry.slug} className="flex items-baseline gap-3 text-sm">
                    <Link
                      href={`/wiki/${entry.slug}#discussion`}
                      className="min-w-0 flex-1 truncate text-slate-300 transition hover:text-gold-200"
                    >
                      {entry.title}
                    </Link>
                    <span className="shrink-0 tabular-nums text-xs text-slate-500">
                      {entry.count}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Les compteurs sont recalculés à chaque visite : aucun chiffre n&apos;est
        mis en cache, et aucun ne vient d&apos;un service tiers.
      </p>
    </div>
  );
}
