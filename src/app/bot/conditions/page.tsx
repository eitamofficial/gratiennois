import Link from "next/link";
import type { Metadata } from "next";
import { DELPHINABOT, SITE } from "@/lib/constants";
import { siteUrl } from "@/lib/site-url";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Ce que DelphinaBot fait, ce qu'il ne fait pas, et ce à quoi un membre du IIIe Delphinat s'engage en l'utilisant.",
  alternates: { canonical: "/bot/conditions" },
};

export const dynamic = "force-dynamic";

const ENGAGEMENTS = [
  {
    titre: "Les règles du Delphinat s'appliquent",
    texte:
      "DelphinaBot est un outil : il ne remplace pas la Constitution ni les décrets. Un ordre donné dans un salon de discussion n'a pas plus de valeur qu'un ordre tapé dans un DM, et le bot ne fait jamais office de juge.",
  },
  {
    titre: "La modération reste humaine",
    texte:
      "Aucune sanction automatique n'est prise sur le seul motif d'un signalement. Le bot prépare, alerte et journalise ; il applique ce qu'un membre de la modération a décidé.",
  },
  {
    titre: "Rien n'est garanti",
    texte:
      "Le bot est hébergé sur une machine domestique, avec une connexion grand public. Une coupure réseau, un redémarrage ou une maintenance l'interrompt sans préavis : aucune interruption ne peut être exclue par contrat.",
  },
  {
    titre: "Les données existent pour l'administration",
    texte:
      "Niveaux, ducats, sanctions et journaux servent l'administration du Delphinat. Demander leur suppression est légitime et s'obtient auprès de la modération.",
  },
] as const;

export default function ConditionsPage() {
  const base = siteUrl();
  const entree = DELPHINABOT.adresses.find((a) => a.cle === "conditions");

  return (
    <>
      <MobileNav />
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-gold-500/20 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            DelphinaBot
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-50 sm:text-4xl">
            Conditions d&apos;utilisation
          </h1>
          <p className="mt-3 text-ink-300">
            Ce que {DELPHINABOT.nom} fait, ce qu&apos;il ne fait pas, et ce à quoi
            vous vous engagez en l&apos;utilisant.
          </p>
          <p className="mt-4 break-all rounded-md border border-gold-500/25 bg-night-900/40 px-4 py-3 font-mono text-sm text-ink-50">
            {base}
            {entree?.chemin ?? "/bot/conditions"}
          </p>
        </header>

        <section aria-labelledby="engagements" className="mt-8">
          <h2
            id="engagements"
            className="font-display text-xl font-semibold text-gold-200"
          >
            À quoi vous vous engagez
          </h2>
          <div className="mt-4 space-y-4">
            {ENGAGEMENTS.map((item) => (
              <div
                key={item.titre}
                className="rounded-xl border border-gold-500/25 bg-night-900/40 p-5"
              >
                <h3 className="font-display text-lg font-semibold text-ink-50">
                  {item.titre}
                </h3>
                <p className="mt-2 text-ink-300">{item.texte}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="limites" className="mt-10">
          <h2
            id="limites"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Les limites, dites franchement
          </h2>
          <ul className="mt-4 space-y-3 text-ink-300">
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold-400">
                —
              </span>
              <span>
                <strong className="text-ink-100">La musique dépend de la
                machine.</strong> yt-dlp et FFmpeg sont installés à la main sur le
                serveur d&apos;accueil : s&apos;il en manque un, la lecture
                s&apos;arrête. Ce n&apos;est pas le bot qui décide.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold-400">
                —
              </span>
              <span>
                <strong className="text-ink-100">Un compte suffit, pas
                l&apos;inverse.</strong> N&apos;importe qui peut utiliser le bot
                ailleurs ; rien de ce qu&apos;il y fait n&apos;a de valeur hors du
                serveur.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold-400">
                —
              </span>
              <span>
                <strong className="text-ink-100">Pas de garantie de
                disponibilité.</strong> Le service suit celui de la machine qui
                l&apos;héberge, pas celui d&apos;un service professionnel.
              </span>
            </li>
          </ul>
        </section>

        <footer className="mt-12 border-t border-gold-500/20 pt-6 text-sm text-ink-400">
          <p>
            Voir aussi la{" "}
            <Link
              href="/bot/confidentialite"
              className="text-gold-300 underline hover:text-gold-200"
            >
              politique de confidentialité
            </Link>
            , la page de{" "}
            <Link href="/bot" className="text-gold-300 underline hover:text-gold-200">
              DelphinaBot
            </Link>
            , ou le serveur{" "}
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
