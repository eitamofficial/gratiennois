import Link from "next/link";
import type { Metadata } from "next";
import { DELPHINABOT, SITE } from "@/lib/constants";
import { siteUrl } from "@/lib/site-url";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Vérification des liens de rôles",
  description:
    "Comment rattacher un compte Discord à une page du wiki du IIIe Delphinat de Gratianopolis, et ce que la vérification engage.",
  alternates: { canonical: "/bot/liens" },
};

export const dynamic = "force-dynamic";

const ETAPES = [
  {
    titre: "Le membre choisit sa page",
    texte:
      "Sur le serveur Discord, la commande de liaison propose la liste des articles du wiki correspondant aux rôle·es du membre. Il en choisit un, ou il ne choisit rien : rien n'est lié par défaut.",
  },
  {
    titre: "La demande est enregistrée",
    texte:
      "Le bot n'écrit rien dans le wiki. Il enregistre seulement la demande — identifiant du membre, article visé, rôle Discord correspondant — et la transmet à la modération.",
  },
  {
    titre: "La modération tranche",
    texte:
      "Un membre de la modération examine la demande dans le salon de validation. Il accepte ou refuse. Aucune validation automatique n'existe : c'est délibéré.",
  },
  {
    titre: "Le lien devient consultable",
    texte:
      "Une fois accepté, l'article du wiki peut afficher le compte Discord correspondant, et inversement. Les deux sens de lecture sont réversibles.",
  },
] as const;

export default function LiensPage() {
  const base = siteUrl();
  const entree = DELPHINABOT.adresses.find((a) => a.cle === "liens-de-roles");

  return (
    <>
      <MobileNav />
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-gold-500/20 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            DelphinaBot
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-50 sm:text-4xl">
            Vérification des liens de rôles
          </h1>
          <p className="mt-3 text-ink-300">
            C&apos;est l&apos;adresse que le portail développeur de Discord demande
            pour vérifier que les liens entre rôles et articles sont bien
            reconnus par ce wiki.
          </p>
          <p className="mt-4 break-all rounded-md border border-gold-500/25 bg-night-900/40 px-4 py-3 font-mono text-sm text-ink-50">
            {base}
            {entree?.chemin ?? "/bot/liens"}
          </p>
        </header>

        <section aria-labelledby="marche" className="mt-8">
          <h2
            id="marche"
            className="font-display text-xl font-semibold text-gold-200"
          >
            La marche à suivre
          </h2>
          <ol className="mt-4 space-y-4">
            {ETAPES.map((etape, index) => (
              <li key={etape.titre} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-500/40 font-display text-sm font-bold text-gold-300"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-ink-100">{etape.titre}</p>
                  <p className="mt-1 text-ink-300">{etape.texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="donnees" className="mt-10">
          <h2
            id="donnees"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Ce que la vérification prend, et ce qu&apos;elle ne prend pas
          </h2>
          <div className="mt-4 space-y-3 text-ink-300">
            <p>
              Elle prend l&apos;identifiant du compte, l&apos;article visé, le rôle
              Discord correspondant et la date de la demande. Rien d&apos;autre :
              ni adresse électronique, ni message, ni localisation, ni aucune
              donnée extérieure à Discord.
            </p>
            <p>
              Elle ne relie jamais un compte à une personne réelle sans que
              celle-ci l&apos;ait demandé. Le refus est le comportement par défaut,
              et l&apos;absence de demande ne produit aucun lien.
            </p>
            <p>
              Une demande refusée ou retirée reste traçable dans le journal
              d&apos;administration, comme toute action de modération, mais
              n&apos;apparaît nulle part sur le wiki.
            </p>
          </div>
        </section>

        <section aria-labelledby="annuler" className="mt-10">
          <h2
            id="annuler"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Revenir en arrière
          </h2>
          <p className="mt-2 text-ink-300">
            Un lien n&apos;est jamais définitif. Le membre peut demander sa
            suppression à tout moment, et la modération peut rompre un lien à
            tout moment ; dans les deux cas, l&apos;article cesse d&apos;afficher le
            compte sans aucune trace publique de l&apos;opération.
          </p>
        </section>

        <footer className="mt-12 border-t border-gold-500/20 pt-6 text-sm text-ink-400">
          <p>
            Pour le reste des adresses du portail, voir la page de{" "}
            <Link href="/bot" className="text-gold-300 underline hover:text-gold-200">
              DelphinaBot
            </Link>
            , ou rejoindre{" "}
            <a
              href={SITE.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-300 underline hover:text-gold-200"
            >
              {SITE.discordInvite}
            </a>
            .
          </p>
        </footer>
      </article>
    </>
  );
}
