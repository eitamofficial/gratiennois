import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import { CATEGORY_LIST } from "@/lib/constants";
import PageHeader, { PageShell } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Arborescence",
  description: "Le wiki en arbre : catégories, sous-thèmes et pages.",
};

export const dynamic = "force-dynamic";

/**
 * Arborescence.
 *
 * Le wiki n'a pas de hiérarchie saisie à la main — et c'est très bien : une
 * arborescence imposée vieillit mal et finit toujours par contredire le contenu.
 * Les étiquettes, elles, sont déjà là, et leur regroupement donne une structure
 * fidèle à ce qui est écrit.
 *
 * L'arbre est rendu avec `<details>` : replié par défaut, dépliable au clavier,
 * et lisible sans une ligne de JavaScript.
 */
export default async function ArbrePage() {
  const articles = await getPublishedArticles();

  const arbre = CATEGORY_LIST.map((categorie) => {
    const pages = articles.filter((article) => article.category === categorie.id);
    const parEtiquette = new Map<string, typeof pages>();

    for (const page of pages) {
      // Un article sans étiquette reste visible sous « sans étiquette » :
      // l'oublier le rendrait introuvable dans l'arbre.
      const etiquettes = page.tags.length > 0 ? page.tags : ["sans étiquette"];
      for (const etiquette of etiquettes) {
        const liste = parEtiquette.get(etiquette) ?? [];
        liste.push(page);
        parEtiquette.set(etiquette, liste);
      }
    }

    return {
      categorie,
      pages,
      branches: [...parEtiquette]
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "fr"))
        .map(([etiquette, liste]) => ({
          etiquette,
          pages: liste.sort((a, b) => a.title.localeCompare(b.title, "fr")),
        })),
    };
  });

  const total = articles.length;

  return (
    <PageShell>
      <PageHeader eyebrow="Structure" icon="🌳" title="Arborescence">
        <p>
          Catégories, puis sous-thèmes (les étiquettes), puis pages. Un article
          portant deux étiquettes apparaît deux fois : c&apos;est un index, pas
          un classement exclusif.
        </p>
        <p className="text-xs text-slate-500">
          {total} pages · {arbre.reduce((n, noeud) => n + noeud.branches.length, 0)} branches
        </p>
      </PageHeader>

      <div className="space-y-3">
        {arbre.map(({ categorie, pages, branches }) => (
          <details
            key={categorie.id}
            className="rounded-xl border border-night-600 bg-night-800/40"
            open={pages.length > 0 && pages.length <= 3}
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span aria-hidden>{categorie.icon}</span>
              <span className="font-display text-lg text-gold-200">{categorie.label}</span>
              <span className="text-xs text-slate-500">
                {pages.length} page{pages.length > 1 ? "s" : ""}
              </span>
              <span aria-hidden className="ml-auto text-xs text-bronze-400">
                ▾
              </span>
            </summary>

            <div className="space-y-2 border-t border-night-700 px-4 py-3">
              {branches.length === 0 && (
                <p className="text-xs text-slate-500">Aucune page dans cette catégorie.</p>
              )}
              {branches.map((branche) => (
                <details key={branche.etiquette} className="rounded-lg border border-night-700">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                    <span aria-hidden className="text-bronze-400">
                      ├
                    </span>
                    <span className="text-slate-200">{branche.etiquette}</span>
                    <span className="text-xs text-slate-500">{branche.pages.length}</span>
                  </summary>
                  <ul className="space-y-1 border-t border-night-700 px-3 py-2 pl-8">
                    {branche.pages.map((page) => (
                      <li key={`${branche.etiquette}-${page.slug}`} className="text-sm">
                        <Link href={`/wiki/${page.slug}`} className="text-slate-300 hover:text-gold-200">
                          {page.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
