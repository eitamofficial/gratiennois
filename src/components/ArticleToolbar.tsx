import Link from "next/link";

export interface ToolbarItem {
  href: string;
  label: string;
  /** Marqué « current » : on est déjà sur cette vue. */
  active?: boolean;
  /** Route protégée : jamais préchargée, sinon la requête part à la dérive
   *  pour un visiteur anonyme et se termine en erreur console. */
  protected?: boolean;
}

/**
 * Barre d'outils d'un article.
 *
 * Reprend la rangée d'onglets des encyclopédies (« Article / Discussion /
 * Modification / Historique »), réduite aux vues qui existent réellement sur ce
 * wiki : l'article lui-même, son historique des versions et — pour une charge
 * constitutionnelle — sa modification. Un onglet qui mènerait nulle part serait
 * pire qu'un onglet absent, donc aucune page de discussion n'est annoncée : le
 * wiki n'en possède pas.
 *
 * Le composant est **serveur** : le motif actif est calculé par la page, ce qui
 * évite d'embarquer un routeur client dans chaque page d'article.
 */
export default function ArticleToolbar({
  items,
  label = "Outils de l'article",
}: {
  items: ToolbarItem[];
  label?: string;
}) {
  return (
    <nav aria-label={label} className="flex items-center gap-1 overflow-x-auto text-sm">
      {items.map((item) =>
        item.active ? (
          <span
            key={item.href}
            aria-current="page"
            className="-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-gold-500 px-3 py-2.5 font-semibold text-gold-200"
          >
            {item.label}
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            prefetch={item.protected ? false : undefined}
            className="-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-slate-300 transition hover:border-night-500 hover:text-gold-200"
          >
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}
