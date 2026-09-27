import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import { CATEGORY_LIST, SITE } from "@/lib/constants";
import { buildLinkMap, extractReferences, normalizeKey } from "@/lib/link-graph";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Plan du site",
  description:
    "Plan du site du wiki du IIIe Delphinat de Gratianopolis : tous les articles par catégorie et par ordre alphabétique, les pages spéciales et les mots-clés.",
  alternates: { canonical: "/plan" },
};

export const dynamic = "force-dynamic";

/** Pages hors du graphe d'articles, listées explicitement. */
const PAGES_SPECIALES = [
  { href: "/", label: "Accueil", description: "Derniers articles et accès rapides." },
  { href: "/wiki", label: "Index du wiki", description: "Tous les articles, filtres par catégorie." },
  { href: "/recherche", label: "Recherche", description: "Recherche intelligente, facettes et suggestions." },
  { href: "/constitution", label: "Constitution (PDF)", description: "Prévisualisation du document officiel." },
  { href: "/institutions", label: "Institutions", description: "Les huit charges et leurs détenteurs." },
  { href: "/personnalites", label: "Personnalités", description: "Membres du serveur Discord officiel." },
  { href: "/tags", label: "Tags", description: "Nuage de mots-clés du wiki." },
  { href: "/credits", label: "Crédits", description: "Auteur, sources et outillage du wiki." },
];

/** Lettre de classement : les accents sont ramenés à leur version simple. */
function indexLetter(title: string): string {
  const first = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .charAt(0)
    .replace(/[^A-Z]/, "");
  return /[A-Z]/.test(first) ? first : AUTRES;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Ancre du groupe « titres ne commençant pas par une lettre latine ». */
const AUTRES = "autres";

export default async function SitePlanPage() {
  const articles = await getPublishedArticles();
  const linkMap = buildLinkMap(articles);

  // Rétroliens : combien d'articles pointent vers chaque article.
  const backlinkCount = new Map<string, number>();
  for (const article of articles) {
    for (const reference of extractReferences(article.content)) {
      const target = linkMap.get(normalizeKey(reference));
      if (!target || target.slug === article.slug) continue;
      backlinkCount.set(target.slug, (backlinkCount.get(target.slug) ?? 0) + 1);
    }
  }

  const orphans = articles.filter((article) => (backlinkCount.get(article.slug) ?? 0) === 0);
  const mostLinked = [...articles]
    .map((article) => ({ article, count: backlinkCount.get(article.slug) ?? 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.article.title.localeCompare(b.article.title, "fr"))
    .slice(0, 5);

  const alphabetical = [...articles].sort((a, b) => a.title.localeCompare(b.title, "fr"));
  const byLetter = new Map<string, typeof alphabetical>();
  for (const article of alphabetical) {
    const letter = indexLetter(article.title);
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), article]);
  }
  const letters = LETTERS.filter((letter) => byLetter.has(letter));

  const tagCounts = new Map<string, number>();
  for (const article of articles) {
    for (const tag of article.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const tags = [...tagCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"),
  );

  return (
    <div className="space-y-10">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">Organisation</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Plan du site
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Toutes les pages du {SITE.wikiName} en un seul écran : {articles.length} article
          {articles.length > 1 ? "s" : ""}, {tags.length} mot-clé{tags.length > 1 ? "s" : ""} et{" "}
          {PAGES_SPECIALES.length} pages spéciales. Cette page est générée à partir du contenu
          réel : elle reste automatiquement à jour.
        </p>
      </header>

      <nav aria-label="Sommaire du plan du site" className="flex flex-wrap gap-2 text-sm">
        <a href="#par-categorie" className="rounded-full border border-night-600 px-3 py-2.5 text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200">
          Par catégorie
        </a>
        <a href="#alphabetique" className="rounded-full border border-night-600 px-3 py-2.5 text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200">
          Index alphabétique
        </a>
        <a href="#pages" className="rounded-full border border-night-600 px-3 py-2.5 text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200">
          Pages spéciales
        </a>
        <a href="#mots-cles" className="rounded-full border border-night-600 px-3 py-2.5 text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200">
          Mots-clés
        </a>
        <a href="#etat" className="rounded-full border border-night-600 px-3 py-2.5 text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200">
          État du graphe
        </a>
      </nav>

      <section id="par-categorie" aria-labelledby="par-categorie-titre" className="space-y-6">
        <h2 id="par-categorie-titre" className="font-display text-2xl font-semibold text-gold-300">
          Par catégorie
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {CATEGORY_LIST.map((category) => {
            const items = articles
              .filter((article) => article.category === category.id)
              .sort((a, b) => a.title.localeCompare(b.title, "fr"));
            return (
              <section
                key={category.id}
                className="rounded-xl border border-night-600 bg-night-800/60 p-5"
              >
                <h3 className="flex items-center justify-between gap-2 font-medium text-gold-200">
                  <span>
                    {category.icon} {category.label}
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    {items.length} article{items.length > 1 ? "s" : ""}
                  </span>
                </h3>
                {items.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">Aucun article dans cette catégorie.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {items.map((article) => (
                      <li key={article.slug}>
                        <Link
                          href={`/wiki/${article.slug}`}
                          className="text-slate-200 transition hover:text-gold-200"
                        >
                          {article.title}
                        </Link>
                        {article.summary && (
                          <p className="text-xs leading-relaxed text-slate-400">{article.summary}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <section id="alphabetique" aria-labelledby="alphabetique-titre" className="space-y-4">
        <h2 id="alphabetique-titre" className="font-display text-2xl font-semibold text-gold-300">
          Index alphabétique
        </h2>

        <div className="flex flex-wrap gap-1.5 text-sm">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#lettre-${letter}`}
              className="rounded-md border border-night-600 px-2.5 py-2.5 text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
            >
              {letter}
            </a>
          ))}
          {byLetter.has(AUTRES) && (
            <a
              href={`#lettre-${AUTRES}`}
              className="rounded-md border border-night-600 px-2.5 py-2.5 text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
            >
              #
            </a>
          )}
        </div>

        <div className="space-y-4">
          {[...byLetter.entries()].map(([letter, items]) => (
            <section key={letter} id={`lettre-${letter}`} className="scroll-mt-28">
              <h3 className="mb-2 border-b border-night-600 pb-1 font-display text-lg font-semibold text-bronze-300">
                {letter === AUTRES ? "#" : letter}
              </h3>
              <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {items.map((article) => (
                  <li key={article.slug} className="text-sm">
                    <Link
                      href={`/wiki/${article.slug}`}
                      className="text-slate-200 transition hover:text-gold-200"
                    >
                      {article.title}
                    </Link>
                    <span className="ml-2 text-xs text-slate-400">{article.category}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section id="pages" aria-labelledby="pages-titre" className="space-y-4">
        <h2 id="pages-titre" className="font-display text-2xl font-semibold text-gold-300">
          Pages spéciales
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PAGES_SPECIALES.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="block rounded-lg border border-night-600 bg-night-800/60 px-4 py-3 transition hover:border-gold-500/40"
              >
                <span className="text-sm font-medium text-gold-200">{page.label}</span>
                <code className="ml-2 text-xs text-slate-400">{page.href}</code>
                <p className="mt-1 text-xs text-slate-400">{page.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="mots-cles" aria-labelledby="mots-cles-titre" className="space-y-4">
        <h2 id="mots-cles-titre" className="font-display text-2xl font-semibold text-gold-300">
          Mots-clés
        </h2>
        {tags.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun mot-clé utilisé pour le moment.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map(([tag, count]) => (
              <li key={tag}>
                <Link
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-night-600 bg-night-800/70 px-3 py-2.5 text-sm text-bronze-200 transition hover:border-gold-500/50 hover:text-gold-200"
                >
                  #{tag}
                  <span className="text-xs text-slate-400">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="etat" aria-labelledby="etat-titre" className="space-y-4">
        <h2 id="etat-titre" className="font-display text-2xl font-semibold text-gold-300">
          État du graphe
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-night-600 bg-night-800/60 p-5">
            <h3 className="font-medium text-gold-200">Les plus cités par</h3>
            {mostLinked.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Aucun lien interne pour le moment.</p>
            ) : (
              <ol className="mt-3 space-y-1.5 text-sm">
                {mostLinked.map((item) => (
                  <li key={item.article.slug} className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/wiki/${item.article.slug}`}
                      className="text-slate-200 transition hover:text-gold-200"
                    >
                      {item.article.title}
                    </Link>
                    <span className="text-xs text-slate-400">
                      {item.count} lien{item.count > 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-xl border border-night-600 bg-night-800/60 p-5">
            <h3 className="font-medium text-gold-200">
              Sans lien entrant ({orphans.length})
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Articles que rien ne pointe encore : à relier depuis d&apos;autres pages.
            </p>
            {orphans.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Tous les articles sont reliés.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {orphans.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/wiki/${article.slug}`}
                      className="text-slate-300 transition hover:text-gold-200"
                    >
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
