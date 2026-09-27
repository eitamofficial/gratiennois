import Link from "next/link";

export interface PaginationProps {
  /** Chemin de base, filtres compris, sans le paramètre `page`. */
  pathname: string;
  /** Paramètres à reconduire sur chaque lien (recherche, action, auteur…). */
  params: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  /** Libellé du compteur, ex. « révisions » ou « résultats ». */
  label?: string;
}

function href(pathname: string, params: PaginationProps["params"], page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Pagination par liens : fonctionne sans JavaScript et partageable (l'URL
 * contient la page courante et les filtres). Affiche au plus cinq numéros
 * autour de la page active, plus les extrémités.
 */
export default function Pagination({
  pathname,
  params,
  page,
  totalPages,
  total,
  perPage,
  label = "révisions",
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const numbers = new Set<number>([1, totalPages, page]);
  for (const offset of [-2, -1, 1, 2]) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= totalPages) numbers.add(candidate);
  }
  const visible = [...numbers].sort((a, b) => a - b);

  const linkClass =
    "inline-flex min-h-[2.5rem] items-center justify-center rounded-md border border-night-600 px-3 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200";
  const activeClass =
    "inline-flex min-h-[2.5rem] items-center justify-center rounded-md border border-gold-500/60 bg-gold-500/15 px-3 py-2.5 text-sm font-medium text-gold-200";
  // Un lien désactivé reste un texte normal (et non une couleur « night-500 »
  // qui disparaît en thème clair) : seule la bordure empruntée le signale.
  const disabledClass =
    "inline-flex min-h-[2.5rem] items-center justify-center rounded-md border border-dashed border-night-500 px-3 py-2.5 text-sm text-slate-400";

  return (
    <nav
      aria-label="Pagination de l'historique"
      className="flex flex-col items-center gap-3 border-t border-night-600 pt-4 sm:flex-row sm:justify-between"
    >
      <p className="text-xs text-slate-400">
        {from}–{to} sur {total} {label}
        {totalPages > 1 && ` (page ${page} / ${totalPages})`}
      </p>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {page > 1 ? (
            <Link href={href(pathname, params, page - 1)} className={linkClass} rel="prev">
              ← Précédent
            </Link>
          ) : (
            <span className={disabledClass}>← Précédent</span>
          )}

          {visible.map((number, index) => (
            <span key={number} className="flex items-center gap-1.5">
              {index > 0 && number - visible[index - 1] > 1 && (
                <span className="px-1 text-sm text-slate-400">…</span>
              )}
              {number === page ? (
                <span className={activeClass} aria-current="page">
                  {number}
                </span>
              ) : (
                <Link href={href(pathname, params, number)} className={linkClass}>
                  {number}
                </Link>
              )}
            </span>
          ))}

          {page < totalPages ? (
            <Link href={href(pathname, params, page + 1)} className={linkClass} rel="next">
              Suivant →
            </Link>
          ) : (
            <span className={disabledClass}>Suivant →</span>
          )}
        </div>
      )}
    </nav>
  );
}
