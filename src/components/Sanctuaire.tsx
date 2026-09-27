"use client";

/**
 * La cache.
 *
 * Elle ne s'ouvre qu'à qui a trouvé le mot, vérifié dans le navigateur du
 * visiteur. Tant que la porte est fermée, la page ne montre rien : ni la
 * réponse, ni un compte à rebours, ni l'ombre d'un indice. C'est ce qui la rend
 * cachée — non pas un secret affiché en petit, mais une porte qui n'existe pas
 * tant qu'on ne l'a pas ouverte.
 *
 * Le contenu s'adresse à un fan : l'histoire complète, ce que personne ne
 * raconte dans les dictionnaires. Rien n'y est cité, les titres d'albums et de
 * morceaux sont nommés jamais les paroles.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MOT_DU_SECOND_NIVEAU, aDejaOuvertLaPorte, normaliserSaisie } from "@/lib/oeuf";

export default function Sanctuaire() {
  const [ouverte, setOuverte] = useState<boolean | null>(null);
  const [secret, setSecret] = useState(false);
  const tampon = useRef("");

  useEffect(() => {
    setOuverte(aDejaOuvertLaPorte());
  }, []);

  useEffect(() => {
    if (!ouverte) return;
    const surFrappe = (evenement: KeyboardEvent) => {
      if (evenement.key.length !== 1) return;
      tampon.current = normaliserSaisie(tampon.current + evenement.key).slice(-32);
      if (tampon.current.endsWith(MOT_DU_SECOND_NIVEAU)) {
        setSecret(true);
        tampon.current = "";
      }
    };
    document.addEventListener("keydown", surFrappe);
    return () => document.removeEventListener("keydown", surFrappe);
  }, [ouverte]);

  // Tant que le navigateur n'a pas répondu, ne rien afficher : le contenu
  // apparaîtrait une fraction de seconde avant de disparaître pour qui n'a pas
  // le droit de le voir.
  if (ouverte === null) return null;

  if (!ouverte) {
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

  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-gold-500/20 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
          Fichier confidentiel
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-50 sm:text-4xl">
          La Loba
        </h1>
        <p className="mt-3 text-ink-300">
          Vous avez trouvé la porte. Elle n&apos;est indiquée nulle part ailleurs,
          et ce fichier ne sera pas indexé par un moteur de recherche.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-gold-200">
          D&apos;où vient le nom
        </h2>
        <p className="mt-3 text-ink-300">
          La loba est la louve en espagnol. C&apos;est le titre donné à l&apos;album
          de 2009, et à son morceau le plus_emblematique : une femme seule la
          nuit, qui ne demande ni pardon ni explication à personne.
        </p>
        <p className="mt-3 text-ink-300">
          Le mot anglais <em>She Wolf</em> en est la traduction littérale, ce
          qui explique pourquoi le mot que vous avez tapé pour entrer n&apos;est
          pas exactement le titre du morceau. Vous avez tapé sa version
          hollandaise. Les fans connaissent les deux, et savent que la seconde
          est la bonne.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-gold-200">
          Ce que personne ne raconte dans les dictionnaires
        </h2>
        <dl className="mt-4 space-y-5">
          <div className="border-l-2 border-gold-500/40 pl-4">
            <dt className="font-semibold text-ink-100">Le procès des Simpsons</dt>
            <dd className="mt-2 text-sm text-ink-300">
              En 2010, une parodie du morceau réalisée sous un pseudonyme recycle
              à la fois sa chanson et les images de son clip. Elle poursuit,
              gagne, et obtient le retrait. C&apos;est un précédent rare, où une
              artiste pop fait valoir son visage et sa chanson contre
              l&apos;appropriation de son propre travail.
            </dd>
          </div>
          <div className="border-l-2 border-gold-500/40 pl-4">
            <dt className="font-semibold text-ink-100">Le discours de 2006</dt>
            <dd className="mt-2 text-sm text-ink-300">
              Lors d&apos;une cérémonie américaine, elle refuse son prix et
             partage son temps de parole pour nommer ce que l&apos;industrie
              a ignoré de la musique latino-américaine. Cette prise de parole est
              devenue un cas d&apos;étude dans les cours de musique.
            </dd>
          </div>
          <div className="border-l-2 border-gold-500/40 pl-4">
            <dt className="font-semibold text-ink-100">Les pieds nus</dt>
            <dd className="mt-2 text-sm text-ink-300">
              Sa fondation porte le nom de pieds nus. Elle finance l&apos;accès à
              l&apos;éducation des enfants déplacés en Colombie depuis plus de
              vingt ans. C&apos;est la partie de sa carrière dont elle parle le
              moins, et la plus longue.
            </dd>
          </div>
          <div className="border-l-2 border-gold-500/40 pl-4">
            <dt className="font-semibold text-ink-100">La faute d&apos;accord</dt>
            <dd className="mt-2 text-sm text-ink-300">
              Son nom se prononce à l&apos;espagnole, mais presque tout le monde
              l&apos;écrit « Shakira », avec un k. Un k se prononce « ka » en
              espagnol, ce qui n&apos;est pas le cas. Le nom anglais n&apos;est
              qu&apos;une approximation, et personne ne s&apos;en est jamais
              remis.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-gold-200">
          Il reste une porte
        </h2>
        <p className="mt-3 text-ink-300">
          Celle-ci se trouve dans cette page, et vous connaissez déjà la méthode :
          le même mot qu&apos;au début, sans la traduction.
        </p>
        <p className="mt-4 text-sm text-ink-400">
          Indice : quatre lettres, et c&apos;est un animal.
        </p>
      </section>

      {secret ? (
        <>
        <section className="mt-6 rounded-xl border border-gold-500/30 bg-night-900/60 p-6">
          <h2 className="font-display text-xl font-semibold text-gold-200">
            Vous avez tout trouvé
          </h2>
          <p className="mt-3 text-ink-200">
            Ce wiki est écrit par un seul auteur, relu à la main, et hébergé sans
            publicité ni traceur. S&apos;il vous a fait sourire, il existe une
            manière très simple de le dire.
          </p>
          <Link
            href="/credits"
            className="mt-5 inline-block rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
          >
            Aller la soutenir
          </Link>
        </section>

        {/* Le seul indice qui reste : il ne dit ni combien, ni quoi, ni où. */}
        <p className="mt-8 text-center text-sm text-ink-400">
          Ce n&apos;est pas le seul. Il y en a d&apos;autres, et chacun a sa
          propre serrure.
        </p>
        </>
      ) : (
        <p className="mt-6 text-sm text-ink-300">
          Écrivez le mot n&apos;importe où sur cette page, comme vous l&apos;aviez
          fait pour entrer.
        </p>
      )}
    </article>
  );
}
