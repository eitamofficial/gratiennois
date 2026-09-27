"use client";

import { useEffect, useMemo, useState } from "react";
import type { Heading } from "@/lib/markdown";

/**
 * Numérotation des rubriques, à la manière des dictionnaires : `1`, `1.1`,
 * `1.2`, puis `2`… Elle est **calculée, jamais stockée** : un article n'a pas à
 * être renuméroté quand une section est ajoutée au milieu.
 */
function numbered(headings: Heading[]): Array<Heading & { number: string }> {
  let major = 0;
  let minor = 0;
  return headings.map((heading) => {
    if (heading.level === 2) {
      major += 1;
      minor = 0;
      return { ...heading, number: String(major) };
    }
    minor += 1;
    return { ...heading, number: `${major}.${minor}` };
  });
}

interface Props {
  headings: Heading[];
  /** La colonne latérale (sticky + défilement) est gérée par la page appelante. */
  className?: string;
  /** Replie le sommaire dans un `<details>` (sous 1280 px, pas de colonne). */
  collapsible?: boolean;
  /** Libellé du repli, par exemple « Sommaire de l'article ». */
  collapsibleLabel?: string;
}

/**
 * Sommaire de l'article.
 *
 * Comportement repris de l'encyclopédie : une boîte encadrée en tête de page,
 * une numérotation des rubriques, la rubrique en cours de lecture mise en
 * évidence, et un repli complet (bouton « masquer »). Le suivi de lecture
 * passe par un `IntersectionObserver` : aucun calcul de position à chaque
 * défilement, donc rien ne saccade pendant que le lecteur scrolle.
 */
export default function TableOfContents({
  headings,
  className,
  collapsible = false,
  collapsibleLabel = "Sommaire",
}: Props) {
  // Mémoïsé sur l'identité du tableau de titres : l'effet plus bas ne
  // reconstruit l'observateur qu'à un vrai changement de sommaire.
  const items = useMemo(() => numbered(headings), [headings]);
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  // Sur mobile le sommaire est replié : déplié, il ferait près de mille pixels
  // avant le premier mot de l'article. Sur la colonne latérale il est visible.
  const [open, setOpen] = useState(!collapsible);

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = items
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: [0, 1] },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [headings, items]);

  if (items.length < 2) return null;

  const list = (
    <ol className="space-y-0.5 text-sm">
      {items.map((heading) => {
        const active = heading.id === activeId;
        return (
          <li
            key={heading.id}
            className={heading.level === 3 ? "pl-3" : undefined}
          >
            <a
              href={`#${heading.id}`}
              aria-current={active ? "location" : undefined}
              className={`flex items-baseline gap-2 border-l-2 py-1.5 pl-3 pr-2 transition ${
                active
                  ? "border-gold-500 font-medium text-gold-100"
                  : "border-transparent text-slate-300 hover:border-night-500 hover:text-gold-200"
              }`}
            >
              {/* Chiffre de rubrique : l'apport le plus utile d'un sommaire
                  dense, il permet de citer « § 3.2 » dans une discussion. */}
              <span
                aria-hidden
                className={`w-6 shrink-0 text-right tabular-nums text-xs ${
                  active ? "text-gold-300" : "text-bronze-400"
                }`}
              >
                {heading.number}
              </span>
              <span className="min-w-0">{heading.text}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );

  if (collapsible) {
    return (
      <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className={className}>
        <summary
          className="flex min-h-[2.75rem] cursor-pointer list-none items-center gap-2 rounded-lg border border-night-600 bg-night-800/60 px-4 py-3 text-sm font-semibold text-gold-200"
        >
          <span aria-hidden="true">▸</span>
          <span className="flex-1">{collapsibleLabel}</span>
          <span className="text-xs font-normal tabular-nums text-bronze-400">
            {items.length} rubriques
          </span>
        </summary>
        <nav
          aria-label="Sommaire de l'article"
          className="mt-2 rounded-lg border border-night-700 bg-night-900/50 p-3"
        >
          {list}
        </nav>
      </details>
    );
  }

  return (
    <nav aria-label="Sommaire" className={className}>
      <div className="rounded-xl border border-night-600 bg-night-800/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-night-600 pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
            Sommaire
          </p>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="rounded px-2 py-1 text-xs text-slate-400 transition hover:text-gold-200"
          >
            {open ? "masquer" : "afficher"}
          </button>
        </div>
        {open ? list : null}
      </div>
    </nav>
  );
}
