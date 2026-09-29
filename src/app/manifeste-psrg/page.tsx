import Link from "next/link";
import type { Metadata } from "next";
import PdfPreview from "@/components/PdfPreview";
import MobileNav from "@/components/MobileNav";
import {
  MANIFESTE,
  NB_INTERDITS,
  NB_MESURES,
  SOMMAIRE,
  SOMMAIRE_ANNEXES,
  ancre,
  type Mesure,
} from "@/lib/manifeste-psrg";

export const metadata: Metadata = {
  title: "Manifeste du PSRG",
  description: MANIFESTE.meta.resume,
  alternates: { canonical: "/manifeste-psrg" },
};

export const dynamic = "force-static";

/**
 * Une décision du parti, avec ses quatre colonnes : ce qui est décidé, ce qui
 * le met en œuvre, qui l'actionne, et l'outil qui l'exécute.
 *
 * L'outil est la seule partie qui ne se discute pas : c'est la commande ou le
 * réglage réel, et `npm run check:manifeste` échoue si elle cesse d'exister
 * dans le bot. C'est ce qui distingue cette page d'un programme de parti
 * ordinaire.
 */
function CarteMesure({ mesure }: { mesure: Mesure }) {
  return (
    <li className="rounded-xl border border-night-600 bg-night-800/50 p-5">
      <h4 className="font-display text-base font-semibold text-gold-200">
        {mesure.intitule}
      </h4>

      <dl className="mt-3 space-y-3 text-sm leading-relaxed">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
            Décision
          </dt>
          <dd className="mt-1 text-slate-300">{mesure.decision}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
            Mécanisme
          </dt>
          <dd className="mt-1 text-slate-400">{mesure.mecanisme}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-night-600 pt-3 text-xs">
        <span className="rounded-md border border-night-500 px-2 py-1 text-slate-400">
          Opérateur&nbsp;: {mesure.operateur}
        </span>
        <span className="rounded-md bg-night-900/80 px-2 py-1 font-mono text-gold-300">
          {mesure.outil}
        </span>
      </div>
    </li>
  );
}

export default function ManifestePsrgPage() {
  const { meta, identite, avertissement, sections, annexes, cloture } = MANIFESTE;

  return (
    <div className="space-y-10">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-sm text-slate-400">
          <Link href="/wiki" className="transition hover:text-gold-200">
            Wiki
          </Link>{" "}
          / Textes de parti
        </p>
        <p className="mt-4 inline-block rounded-md border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
          {meta.sigle}
        </p>
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          {meta.titre}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
          {meta.sousTitre}. {meta.edition}.
        </p>
      </header>

      {/* Fiche d'identité : les faits, avant la doctrine. */}
      <section aria-labelledby="identite" className="space-y-4">
        <h2
          id="identite"
          className="font-display text-xl font-semibold text-gold-300"
        >
          Fiche d&apos;identité
        </h2>
        <dl className="grid gap-px overflow-hidden rounded-xl border border-night-600 bg-night-600 sm:grid-cols-2">
          {identite.map((entree) => (
            <div key={entree.label} className="bg-night-800/60 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
                {entree.label}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-200">
                {entree.valeur}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* La règle éditoriale du manifeste, énoncée avant d'appliquer quoi que
          ce soit : c'est elle qui interdit les mesures non outillées. */}
      <section className="rounded-xl border border-gold-500/30 bg-night-800/60 p-5">
        <h2 className="font-display text-lg font-semibold text-gold-300">
          Ce que ce manifeste s&apos;interdit
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {avertissement}
        </p>
      </section>

      {/* Sommaire : un manifeste se consulte, il ne se lit pas d'un trait. */}
      <nav
        aria-label="Sommaire du manifeste"
        className="rounded-xl border border-night-600 bg-night-800/40 p-5"
      >
        <h2 className="font-display text-base font-semibold text-gold-300">
          Sommaire
        </h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {SOMMAIRE.map((entree) => (
            <li key={entree.ancre}>
              <a
                href={`#${entree.ancre}`}
                className="block rounded-md px-3 py-2.5 text-sm text-slate-300 transition hover:bg-night-800 hover:text-gold-200"
              >
                <span className="mr-2 text-bronze-400">{entree.numero}</span>
                {entree.titre}
              </a>
            </li>
          ))}
        </ol>
        <ul className="mt-4 flex flex-wrap gap-2 border-t border-night-600 pt-4 text-sm">
          {SOMMAIRE_ANNEXES.map((entree) => (
            <li key={entree.ancre}>
              <a
                href={`#${entree.ancre}`}
                className="inline-block rounded-md border border-night-500 px-3 py-2.5 text-xs text-slate-400 transition hover:border-gold-500/50 hover:text-gold-200"
              >
                {entree.numero}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          {NB_MESURES} mesures outillées, {NB_INTERDITS} dispositions
          prohibitive. Le document est téléchargeable en PDF en bas de page.
        </p>
      </nav>

      {sections.map((section) => (
        <section
          key={section.numero}
          id={ancre(section.titre)}
          aria-labelledby={`${ancre(section.titre)}-titre`}
          className="scroll-mt-8 space-y-5 border-t border-night-600 pt-8"
        >
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
              {section.numero}
            </p>
            <h2
              id={`${ancre(section.titre)}-titre`}
              className="mt-2 text-balance font-display text-2xl font-semibold text-gold-200"
            >
              {section.titre}
            </h2>
            <p className="mt-3 text-balance text-base leading-relaxed text-slate-300">
              {section.chapeau}
            </p>
          </header>

          {section.paragraphes.map((paragraphe) => (
            <p
              key={paragraphe}
              className="max-w-3xl text-sm leading-relaxed text-slate-400"
            >
              {paragraphe}
            </p>
          ))}

          <ul className="grid gap-4 lg:grid-cols-2">
            {section.mesures.map((mesure) => (
              <CarteMesure key={mesure.intitule} mesure={mesure} />
            ))}
          </ul>

          {section.interdits.length > 0 && (
            <div className="rounded-xl border-l-2 border-red-500/50 bg-night-800/40 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                Interdits
              </h3>
              <ul className="mt-3 space-y-2">
                {section.interdits.map((interdit) => (
                  <li
                    key={interdit}
                    className="flex gap-2 text-sm leading-relaxed text-slate-400"
                  >
                    <span aria-hidden className="text-red-400">
                      ✕
                    </span>
                    {interdit}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      {annexes.map((annexe) => (
        <section
          key={annexe.numero}
          id={ancre(annexe.titre)}
          aria-labelledby={`${ancre(annexe.titre)}-titre`}
          className="scroll-mt-8 space-y-4 border-t border-night-600 pt-8"
        >
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
              {annexe.numero}
            </p>
            <h2
              id={`${ancre(annexe.titre)}-titre`}
              className="mt-2 text-balance font-display text-2xl font-semibold text-gold-200"
            >
              {annexe.titre}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
              {annexe.intro}
            </p>
          </header>

          {annexe.groupes ? (
            <div className="space-y-6">
              {annexe.groupes.map((groupe) => (
                <div key={groupe.module} className="space-y-2">
                  <h3 className="text-sm font-semibold text-gold-300">
                    {groupe.module}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-night-600 text-xs uppercase tracking-[0.14em] text-bronze-400">
                          <th scope="col" className="py-2 pr-3 font-semibold">
                            Commande
                          </th>
                          <th scope="col" className="py-2 pr-3 font-semibold">
                            Module
                          </th>
                          <th scope="col" className="py-2 pr-3 font-semibold">
                            Niveau
                          </th>
                          <th scope="col" className="py-2 font-semibold">
                            Usage
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupe.lignes.map((ligne) => (
                          <tr
                            key={ligne[0]}
                            className="border-b border-night-700/60 align-top"
                          >
                            <td className="py-2 pr-3 font-mono text-xs text-gold-300">
                              {ligne[0]}
                            </td>
                            <td className="py-2 pr-3 text-xs text-slate-400">
                              {ligne[1]}
                            </td>
                            <td className="py-2 pr-3 text-xs text-slate-400">
                              {ligne[2]}
                            </td>
                            <td className="py-2 font-mono text-xs text-slate-300">
                              {ligne[3]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-night-600 text-xs uppercase tracking-[0.14em] text-bronze-400">
                    {annexe.colonnes.map((colonne) => (
                      <th key={colonne} scope="col" className="py-2 pr-3 font-semibold">
                        {colonne}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(annexe.lignes ?? []).map((ligne) => (
                    <tr
                      key={ligne[0]}
                      className="border-b border-night-700/60 align-top"
                    >
                      {ligne.map((cellule, index) => (
                        <td
                          key={`${ligne[0]}-${index}`}
                          className="py-2 pr-3 text-xs leading-relaxed text-slate-300"
                        >
                          {cellule}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <section className="rounded-xl border border-gold-500/30 bg-night-800/60 p-6">
        <p className="text-balance font-display text-lg leading-relaxed text-gold-200">
          {cloture}
        </p>
      </section>

      {/* Le document imprimable. Il est produit à partir du même fichier que
          cette page, donc il ne peut pas en diverger. */}
      <section className="space-y-4">
        <header>
          <h2 className="font-display text-xl font-semibold text-gold-300">
            Document imprimable
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Le manifeste complet, en {annexes.length} annexes et{" "}
            {NB_MESURES} mesures outillées, au format PDF. Ce document est
            généré depuis la même source que cette page : il ne peut donc pas
            diverger d&apos;elle.
          </p>
        </header>
        <PdfPreview
          src={`/${meta.reference}`}
          title={meta.titre}
          downloadName="Manifeste-PSRG.pdf"
        />
      </section>
    </div>
  );
}
