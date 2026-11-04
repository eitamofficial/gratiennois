import type { ReactNode } from "react";
import MobileNav from "./MobileNav";

/**
 * En-tête de page commun.
 *
 * Il existe pour une raison précise : l'eyebrow, le titre, le chapeau et la
 * ligne de contexte étaient recopiés à l'identique sur chaque page, avec de
 * légères divergences de taille et d'espacement. Une seule définition garantit
 * que les vingt nouvelles pages ressemblent aux anciennes.
 */
export default function PageHeader({
  eyebrow,
  icon,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  icon?: string;
  title: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="border-b border-night-600 pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
        {icon && <span aria-hidden>{icon} </span>}
        {eyebrow}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-gold-200 sm:text-4xl">{title}</h1>
        {aside}
      </div>
      {children && (
        <div className="mt-3 max-w-3xl space-y-2 text-sm leading-relaxed text-slate-400">
          {children}
        </div>
      )}
    </header>
  );
}

/** Enveloppe standard d'une page : navigation mobile + espacement vertical. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8">
      <MobileNav />
      {children}
    </div>
  );
}
