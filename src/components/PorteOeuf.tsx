"use client";

/**
 * La porte d'un œuf.
 *
 * Une seule page sert les quinze discoveries : la route est paramétrée par
 * l'identifiant, et le contenu affiché dépend de deux états distincts. La porte
 * principale doit être ouverte, sinon la page se fait passer pour absente. Et
 * l'œuf demandé doit avoir été trouvé, sinon seule sa teaser est montrée — ce
 * qui laisse deviner qu'il existe sans le révéler.
 *
 * Le décompte est affiché une fois la porte ouverte. C'est la seule chose qui
 * trahit qu'il y a autre chose à trouver, et il ne dit jamais lesquelles.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import { NOMBRE_OEUFS, trouverOeuf, type Oeuf } from "@/lib/oeufs";
import { aDejaOuvertLaPorte, decouvertes, noterDecouverte } from "@/lib/oeuf";

type Etat = "chargement" | "ferme" | "teaser" | "ouvert";

export default function Porte({ id }: { id: string }) {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [trouvees, setTrouvees] = useState<string[]>([]);
  const oeuf: Oeuf | undefined = trouverOeuf(id);

  useEffect(() => {
    if (!oeuf) {
      setEtat("ferme");
      return;
    }
    if (!aDejaOuvertLaPorte()) {
      setEtat("ferme");
      return;
    }
    const deja = decouvertes();
    if (!deja.includes(oeuf.id)) {
      setEtat("teaser");
      return;
    }
    setEtat("ouvert");
  }, [oeuf]);

  /** L'œuf est ouvert : on le note, pour qu'il compte au décompte. */
  useEffect(() => {
    if (etat !== "ouvert" || !oeuf) return;
    setTrouvees(noterDecouverte(oeuf.id));
  }, [etat, oeuf]);

  if (!oeuf || etat === "chargement") {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-100">
          Cette page n&apos;existe pas
        </h1>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-gold-500/50 px-5 py-2.5 text-sm text-gold-200 transition hover:bg-gold-500/10"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  if (etat === "ferme") {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-100">
          Cette page n&apos;existe pas
        </h1>
        <p className="mt-3 text-sm text-ink-300">
          Et quand bien même elle existerait, il faudrait encore avoir trouvé le
          moyen d&apos;y entrer.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-gold-500/50 px-5 py-2.5 text-sm text-gold-200 transition hover:bg-gold-500/10"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  if (etat === "teaser") {
    return (
      <article className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
          {oeuf.annee}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-50">
          {oeuf.titre}
        </h1>
        <p className="mt-3 text-ink-300">{oeuf.teaser}</p>
        <p className="mt-6 text-sm text-ink-400">
          Il reste une serrure sur cette page, et elle ne se trouve pas ici.
        </p>
        <Compteur trouves={trouvees.length} />
      </article>
    );
  }

  return (
    <>
      <MobileNav />
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-gold-500/20 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            {oeuf.annee}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-50 sm:text-4xl">
            {oeuf.titre}
          </h1>
          <p className="mt-3 text-ink-300">{oeuf.teaser}</p>
        </header>

        <div className="mt-6 space-y-4">
          {oeuf.contenu.map((paragraphe) => (
            <p key={paragraphe.slice(0, 24)} className="text-ink-200">
              {paragraphe}
            </p>
          ))}
        </div>

        <footer className="mt-10 border-t border-gold-500/20 pt-6">
          <Compteur trouves={trouvees.length} />
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/la-loba"
              className="rounded-md border border-gold-500/50 px-4 py-2 text-sm text-gold-200 transition hover:bg-gold-500/10"
            >
              Revenir à la cache
            </Link>
            <Link
              href="/"
              className="rounded-md border border-night-500 px-4 py-2 text-sm text-ink-200 transition hover:border-gold-500/40"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </footer>
      </article>
    </>
  );
}

/** Le décompte. Il ne dit jamais quelles pages restent à trouver. */
function Compteur({ trouves }: { trouves: number }) {
  return (
    <p className="mt-8 text-xs text-ink-300">
      {trouves} sur {NOMBRE_OEUFS} découvertes
    </p>
  );
}
