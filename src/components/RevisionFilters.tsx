import { REVISION_ACTIONS } from "@/lib/articles-store";
import type { RevisionAction } from "@/lib/types";

const ACTION_LABELS: Record<RevisionAction, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  restore: "Restauration",
};

const FIELD =
  "w-full rounded-md border border-night-500 bg-night-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500/60 focus:outline-none";

export interface RevisionFilterValues {
  q?: string;
  action?: string;
  author?: string;
  perPage?: number;
}

/** Tailles de page proposées (alignées sur le plafond du serveur). */
const PER_PAGE_OPTIONS = [10, 20, 50];

export default function RevisionFilters({
  action,
  authors,
  values,
}: {
  /** URL de la page courante : le formulaire y renvoie. */
  action: string;
  /** Auteurs proposés dans le filtre (vide = champ libre). */
  authors: string[];
  values: RevisionFilterValues;
}) {
  const hasFilters = Boolean(values.q || values.action || values.author);

  return (
    <form
      method="get"
      action={action}
      className="rounded-xl border border-night-600 bg-night-800/60 p-4"
      role="search"
      aria-label="Filtrer l'historique"
    >
      {/* Toute nouvelle recherche repart de la première page. */}
      <input type="hidden" name="page" value="1" />

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="filter-q" className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
            Rechercher
          </label>
          <input
            id="filter-q"
            name="q"
            type="search"
            defaultValue={values.q ?? ""}
            placeholder="Un mot du titre ou du contenu…"
            maxLength={200}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="filter-action" className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
            Action
          </label>
          <select id="filter-action" name="action" defaultValue={values.action ?? ""} className={FIELD}>
            <option value="">Toutes</option>
            {REVISION_ACTIONS.map((item) => (
              <option key={item} value={item}>
                {ACTION_LABELS[item]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-author" className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
            Auteur
          </label>
          {authors.length > 0 ? (
            <select id="filter-author" name="author" defaultValue={values.author ?? ""} className={FIELD}>
              <option value="">Tous</option>
              {authors.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="filter-author"
              name="author"
              defaultValue={values.author ?? ""}
              placeholder="Identifiant"
              maxLength={64}
              className={FIELD}
            />
          )}
        </div>

        <div>
          <label htmlFor="filter-per-page" className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
            Par page
          </label>
          <select
            id="filter-per-page"
            name="perPage"
            defaultValue={String(values.perPage ?? 20)}
            className={FIELD}
          >
            {PER_PAGE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md border border-gold-500/50 bg-gold-500/10 px-4 py-2.5 text-sm font-medium text-gold-200 transition hover:bg-gold-500/20"
          >
            Filtrer
          </button>
          {hasFilters && (
            <a
              href={action}
              className="rounded-md border border-night-500 px-3 py-2.5 text-sm text-slate-400 transition hover:border-night-400 hover:text-slate-200"
            >
              Réinitialiser
            </a>
          )}
        </div>
      </div>
    </form>
  );
}
