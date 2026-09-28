import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Programme",
  description:
    "Parti Révolutionnaire Socialiste Gratiennois : stabilisation du serveur, paliers de boosts et outillage du wiki.",
  alternates: { canonical: "/programme" },
};

export const dynamic = "force-dynamic";

/**
 * Programme du PRSG.
 *
 * Deux inspirada de la configuration du serveur : ce que le parti entend
 * financer, et à quel palier. Les chiffres sont ceux de l'hébergement — ils se
 * vérifient sur la facture, ce qui est tout l'intérêt de les écrire.
 */
const PALIERS = [
  {
    boosts: "14 boosts",
    niveau: "Niveau 3",
    engagement:
      "Stabiliser et préserver le serveur à ce palier. C'est le seuil qui garantit au Delphinat un espace pérenne, avec les fonctionnalités de modération et de mémoire qu'exige une institution qui entend durer.",
  },
  {
    boosts: "28 boosts",
    niveau: "Palier supérieur",
    engagement:
      "Si le serveur évolue à ce palier, prendre en charge trois mois d'abonnement. L'engagement est pris dès le franchissement, et non conditionné à une campagne ou à une contrepartie politique.",
  },
];

const CONTRIBUTIONS = [
  {
    titre: "Ce wiki",
    corps:
      "Une encyclopédie complète du Delphinat : Constitution, hiérarchie des institutions, personnalités, tags et index. Elle est lue par l'API Discord en direct — les identités, les rôles et les portraits ne sont jamais saisis à la main, ils sont la source.",
  },
  {
    titre: "Le bot Discord",
    corps:
      "Écrit et développé pour synchroniser le wiki avec le serveur. C'est l'outillage qui tient l'encyclopédie à jour sans intervention permanente : sans lui, chaque changement sur le serveur devrait être recopié à la main.",
  },
  {
    titre: "Les boosts",
    corps:
      "Les paliers visés plus haut sont tenus par des boosts. C'est une charge réelle et récurrente, elle ne se déduit pas d'un discours.",
  },
];

export default function ProgrammePage() {
  return (
    <>
      <MobileNav />
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-gold-500/20 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            Parti Révolutionnaire Socialiste Gratiennois
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-50 sm:text-4xl">
            Un serveur stable, et de quoi l&apos;entretenir
          </h1>
          <p className="mt-3 text-ink-300">
            Le programme tient en une phrase : que le serveur du{" "}
            {SITE.name} reste en ligne, à un niveau où l&apos;on peut y
            constituer une véritable institution.
          </p>
        </header>

        {/* Les paliers */}
        <section aria-labelledby="paliers" className="mt-8">
          <h2 id="paliers" className="font-display text-xl font-semibold text-gold-200">
            Les paliers que nous visons
          </h2>
          <p className="mt-2 text-ink-300">
            Un serveur Discord se maintient par ses boosts. Ils se comptent, et
            chaque palier débloque des fonctions que la modération d&apos;un
            Delphinat exige. Le parti s&apos;engage sur deux seuils.
          </p>
          <ul className="mt-5 space-y-4">
            {PALIERS.map((palier) => (
              <li
                key={palier.boosts}
                className="rounded-xl border border-night-600 bg-night-800/70 p-5"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-lg font-semibold text-gold-200">
                    {palier.boosts}
                  </span>
                  <span className="rounded-full border border-gold-500/40 px-2.5 py-0.5 text-xs text-gold-300">
                    {palier.niveau}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {palier.engagement}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Ce que le parti a déjà fait */}
        <section aria-labelledby="contributions" className="mt-10">
          <h2 id="contributions" className="font-display text-xl font-semibold text-gold-200">
            Ce n&apos;est pas un programme sur le papier
          </h2>
          <p className="mt-2 text-ink-300">
            L&apos;engagement ci-dessus n&apos;est pas une intention. Il est déjà
            adossé à du travail livré et en service.
          </p>
          <div className="mt-5 space-y-4">
            {CONTRIBUTIONS.map((contribution) => (
              <div
                key={contribution.titre}
                className="rounded-xl border border-night-600 bg-night-800/70 p-5"
              >
                <h3 className="font-display text-base font-semibold text-ink-50">
                  {contribution.titre}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  {contribution.corps}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Argument central, formulé sans mettre personne en cause */}
        <section aria-labelledby="continuite" className="mt-10">
          <h2 id="continuite" className="font-display text-xl font-semibold text-gold-200">
            La continuité, l&apos;argument
          </h2>
          <p className="mt-2 text-ink-300">
            Une institution se juge moins à ses promesses qu&apos;à ce qu&apos;elle
            laisse en marche. L&apos;outillage est en service, l&apos;encyclopédie
            est publique, et le site répond en HTTPS sans intervention
            quotidienne.
          </p>
          <p className="mt-3 text-ink-300">
            C&apos;est sur cette base qu&apos;un gouvernement se construit : non
            pas en annonçant un projet, mais en héritant d&apos;une base qui
            tourne déjà.
          </p>
        </section>

        <footer className="mt-10 border-t border-night-600 pt-5 text-sm text-ink-400">
          <p>
            Le wiki et le bot sont décrits en détail sur la page{" "}
            <Link
              href="/credits"
              className="text-gold-300 underline-offset-4 hover:underline"
            >
              crédits
            </Link>
            . Le programme est la position du{" "}
            <strong className="text-ink-200">
              Parti Révolutionnaire Socialiste Gratiennois
            </strong>
            ; il n&apos;engage que ce parti.
          </p>
        </footer>
      </article>
    </>
  );
}
