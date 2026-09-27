/**
 * `template.tsx` est rechargé à chaque navigation (contrairement à `layout.tsx`) :
 * c'est le point d'appui officiel de Next.js pour animer les changements de
 * page sans bibliothèque externe et sans toucher à l'hydratation.
 *
 * L'animation est purement CSS (`.page-transition`, voir `globals.css`) et
 * neutralisée automatiquement si l'utilisateur a demandé moins de animations.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
