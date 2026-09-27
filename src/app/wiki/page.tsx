import Link from "next/link";
import type { Metadata } from "next";
import { CATEGORY_LIST } from "@/lib/constants";
import { listArticleSummaries } from "@/lib/articles-store";
import type { ArticleListItem, Category } from "@/lib/types";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Index du wiki",
  description:
    "Index complet des articles du wiki du IIIe Delphinat de Gratianopolis, classés par ordre alphabétique et par catégorie.",
};

export const dynamic = "force-dynamic";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
/** Ancre des titres ne commençant par aucune lettre latine (chiffres, symboles). */
const AUTRES = "autres";

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

export default async function WikiIndexPage() {
  // Résumés seuls : l'index n'affiche aucun corps d'article, inutile d'en
  // charger quinze pour afficher des titres.
  const articles = await listArticleSummaries();
  const byCategory = new Map<Category, ArticleListItem[]>();
  for (const article of articles) {
    byCategory.set(article.category, [...(byCategory.get(article.category) ?? []), article]);
  }
  const categories = CATEGORY_LIST.map((category) => ({
    ...category,
    articles: byCategory.get(category.id) ?? [],
  }));

  // Index alphabétique : l'ordre de lecture d'une encyclopédie, où l'on
  // cherche une entrée par sa première lettre plutôt que par son thème.
  const alphabetical = [...articles].sort((a, b) =>
    a.title.localeCompare(b.title, "fr"),
  );
  const byLetter = new Map<string, ArticleListItem[]>();
  for (const article of alphabetical) {
    const letter = indexLetter(article.title);
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), article]);
  }
  const usedLetters = LETTERS.filter((letter) => byLetter.has(letter));
  const others = byLetter.get(AUTRES) ?? [];

  return (
    <div className="space-y-10">
      <MobileNav />

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
          Consultation publique
        </p>
        <h1 className="mt-2 text-balance font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Index du wiki
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Les {articles.length} registres du IIIe Delphinat, par ordre alphabétique
          ou par thème. Utilisez la recherche (Ctrl + K) pour retrouver un article
          à la volée.
        </p>
      </header>

      {/* Barre de navigation alphabétique : les lettres sans article sont
          grisées, comme dans l'index d'une encyclopédie imprimée. */}
      <nav aria-label="Index alphabétique" className="flex flex-wrap items-center gap-1">
        {LETTERS.map((letter) => {
          const bucket = byLetter.get(letter);
          return bucket ? (
            <a
              key={letter}
              href={`#lettre-${letter}`}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-gold-500/30 bg-night-800/60 font-semibold text-gold-200 transition hover:border-gold-500/70 hover:bg-night-700"
            >
              {letter}
              <span className="sr-only">
                , {bucket.length} article{bucket.length > 1 ? "s" : ""}
              </span>
            </a>
          ) : (
            <span
              key={letter}
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-md border border-night-700 text-slate-400 opacity-50"
            >
              {letter}
            </span>
          );
        })}
        {others.length > 0 && (
          <a
            href={`#lettre-${AUTRES}`}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-gold-500/30 bg-night-800/60 font-semibold text-gold-200 transition hover:border-gold-500/70 hover:bg-night-700"
          >
            #
            <span className="sr-only">, {others.length} articles</span>
          </a>
        )}
      </nav>

      <div className="space-y-8">
        {[...usedLetters, ...(others.length > 0 ? [AUTRES] : [])].map((letter) => (
          <section key={letter} aria-labelledby={`lettre-${letter}`}>
            <h2
              id={`lettre-${letter}`}
              className="mb-3 flex items-center gap-3 scroll-mt-28 border-b border-night-600 pb-2 font-display text-2xl font-semibold text-gold-200"
            >
              <span className="text-bronze-400">{letter === AUTRES ? "#" : letter}</span>
              <span className="text-sm font-normal tabular-nums text-slate-400">
                {(byLetter.get(letter) ?? []).length} article
                {(byLetter.get(letter) ?? []).length > 1 ? "s" : ""}
              </span>
            </h2>
            {/* Liste dense : titre + résumé sur une ou deux lignes, comme les
                entrées d'index d'un dictionnaire. */}
            <ul className="grid gap-2 sm:grid-cols-2">
              {(byLetter.get(letter) ?? []).map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/wiki/${article.slug}`}
                    className="group block rounded-lg border border-night-700 bg-night-800/40 px-4 py-3 transition hover:border-gold-500/50 hover:bg-night-800"
                  >
                    <span className="block text-sm font-semibold text-slate-100 transition group-hover:text-gold-200">
                      {article.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                      {article.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Le même contenu, classé par thème : l'autre porte d'entrée. */}
      <section aria-labelledby="par-theme" className="space-y-8">
        <h2
          id="par-theme"
          className="border-b border-night-600 pb-2 font-display text-2xl font-semibold text-gold-200"
        >
          Par thème
        </h2>
        {categories.map((category) => (
          <div key={category.id} aria-labelledby={`cat-${category.id}`}>
            <div className="mb-4 flex items-end justify-between gap-4">
              <h3
                id={`cat-${category.id}`}
                className="font-display text-xl font-semibold text-gold-300"
              >
                <span aria-hidden className="mr-2">
                  {category.icon}
                </span>
                {category.label}
              </h3>
              <Link
                href={`/wiki/categorie/${category.id}`}
                className="shrink-0 py-2.5 text-sm text-gold-300 transition hover:text-gold-200"
              >
                Voir la catégorie →
              </Link>
            </div>

            {category.articles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-night-500 px-4 py-5 text-sm text-slate-400">
                Aucun article dans cette catégorie pour l&apos;instant.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {category.articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/wiki/${article.slug}`}
                      className="block rounded-lg border border-night-600 bg-night-800/60 px-4 py-3 transition hover:border-gold-500/50 hover:bg-night-800"
                    >
                      <span className="block font-medium text-slate-100">
                        {article.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                        {article.summary}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
