import Link from "next/link";
import { PAGE_TEMPLATES } from "@/content/templates";
import { categoryLabel, categoryIcon } from "@/lib/constants";

/**
 * Galerie des modèles de page.
 *
 * Chaque carte mène à `/admin/nouveau?modele=<id>` : le formulaire s'ouvre
 * pré-rempli, et le rédacteur n'a plus qu'à remplacer. C'est un composant
 * serveur — il n'y a rien d'interactif, seulement des liens, et une galerie qui
 * n'envoie pas de JavaScript s'affiche instantanément.
 */
export default function TemplateGallery() {
  return (
    <section aria-labelledby="modeles-titre" className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="modeles-titre"
          className="font-display text-xl font-semibold text-gold-200"
        >
          Partir d&apos;un modèle
        </h2>
        <p className="text-xs text-slate-400">
          {PAGE_TEMPLATES.length} modèles · structure, catégorie et infobox pré-remplies
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {PAGE_TEMPLATES.map((modele) => (
          <li key={modele.id}>
            <Link
              href={`/admin/nouveau?modele=${encodeURIComponent(modele.id)}`}
              className="group flex h-full flex-col rounded-lg border border-night-600 bg-night-900/50 p-4 transition hover:border-gold-500/50 hover:bg-night-800/60"
            >
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="text-xl leading-none">
                  {modele.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100 group-hover:text-gold-200">
                    {modele.name}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {modele.description}
                  </p>
                </div>
              </div>

              <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded border border-night-600 px-1.5 py-0.5">
                  {categoryIcon(modele.category)} {categoryLabel(modele.category)}
                </span>
                {modele.tags.length > 0 && (
                  <span className="truncate">
                    {modele.tags.slice(0, 3).join(" · ")}
                  </span>
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-md border border-night-700 bg-night-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
        Les modèles écrivent « <strong className="text-slate-300">non renseigné</strong> »
        là où le récit ne dit rien. C&apos;est la règle de l&apos;encyclopédie : une page
        incomplète mais honnête vaut mieux qu&apos;une page complète et supposée.
      </p>
    </section>
  );
}
