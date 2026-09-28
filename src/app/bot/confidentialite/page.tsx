import Link from "next/link";
import type { Metadata } from "next";
import { DELPHINABOT, SITE } from "@/lib/constants";
import { siteUrl } from "@/lib/site-url";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données DelphinaBot conserve, combien de temps, et ce qu'il ne fait pas : ni message privé lu, ni contenu enregistré, ni suivi publicitaire.",
  alternates: { canonical: "/bot/confidentialite" },
};

export const dynamic = "force-dynamic";

const DONNEES = [
  {
    quoi: "Identifiant du compte",
    duree: "Tant que le compte est membre du serveur",
    pourquoi:
      "Savoir qui est qui : niveaux, ducats, sanctions et autorisations sont rattachés à l'identifiant Discord, jamais à une personne réelle.",
  },
  {
    quoi: "Données de jeu",
    duree: "Tant que le compte est membre du serveur",
    pourquoi:
      "Niveaux, expérience, ducats, métier, épargne, market et historique des transferts. Rien n'est envoyé ailleurs, et rien n'est partagé avec un tiers.",
  },
  {
    quoi: "Journal de sanctions",
    duree: "Conservé, jamais effacé",
    pourquoi:
      "Un identifiant, un motif, un horodatage et l'identifiant du modérateur. Une sanction est levée quand elle expire ; son dossier reste, pour qu'une contestation puisse être instruite.",
  },
  {
    quoi: "Signalements",
    duree: "Jusqu'à leur traitement, puis archivés",
    pourquoi:
      "Identifiant du membre signalé, motif, et un extrait de quatre cents caractères au maximum. C'est la seule fois où un contenu de message est stocké, et seulement pour ce qu'un signalement rend nécessaire.",
  },
  {
    quoi: "Journal d'administration",
    duree: "Douze mois glissants",
    pourquoi:
      "Traçabilité des commandes de modération et des changements de réglages. Aucun contenu de message, aucune conversation privée.",
  },
  {
    quoi: "Réglages de salon",
    duree: "Tant que le salon existe",
    pourquoi:
      "Les seuils, les salons de journalisation et les rôles de configuration, lus et appliqués par salon. Aucune donnée personnelle.",
  },
] as const;

export default function ConfidentialitePage() {
  const base = siteUrl();
  const entree = DELPHINABOT.adresses.find((a) => a.cle === "confidentialite");

  return (
    <>
      <MobileNav />
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-gold-500/20 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            DelphinaBot
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-50 sm:text-4xl">
            Politique de confidentialité
          </h1>
          <p className="mt-3 text-ink-300">
            Le plus court résumé possible : {DELPHINABOT.nom} ne lit aucun message
            privé, n&apos;enregistre aucun contenu de message par son propre
            fonctionnement, et ne revend rien à personne. Le reste est détaillé
            ci-dessous.
          </p>
          <p className="mt-4 break-all rounded-md border border-gold-500/25 bg-night-900/40 px-4 py-3 font-mono text-sm text-ink-50">
            {base}
            {entree?.chemin ?? "/bot/confidentialite"}
          </p>
        </header>

        <section aria-labelledby="ce-que" className="mt-8">
          <h2
            id="ce-que"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Ce qui est conservé
          </h2>
          <div className="mt-4 space-y-4">
            {DONNEES.map((item) => (
              <div
                key={item.quoi}
                className="rounded-xl border border-gold-500/25 bg-night-900/40 p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-ink-50">
                    {item.quoi}
                  </h3>
                  <p className="text-xs uppercase tracking-wider text-gold-400">
                    {item.duree}
                  </p>
                </div>
                <p className="mt-2 text-ink-300">{item.pourquoi}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="jamais" className="mt-10">
          <h2
            id="jamais"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Ce qui n&apos;arrive jamais
          </h2>
          <ul className="mt-4 space-y-3 text-ink-300">
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold-400">
                —
              </span>
              <span>
                <strong className="text-ink-100">Aucune lecture de message
                privé.</strong> Le bot n&apos;observe pas les conversations
                directes, et n&apos;a aucun moyen de le faire.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold-400">
                —
              </span>
              <span>
                <strong className="text-ink-100">Aucun transfert vers un tiers.</strong>
                Aucune revente, aucun partage, aucune publicité, aucun traceur.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold-400">
                —
              </span>
              <span>
                <strong className="text-ink-100">Aucun profilage.</strong> Les
                sanctions suivent ce qu&apos;un modérateur a décidé, jamais une
                inférence automatique sur l&apos;opinion de quelqu&apos;un.
              </span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="hebergement" className="mt-10">
          <h2
            id="hebergement"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Où vivent ces données
          </h2>
          <p className="mt-2 text-ink-300">
            Le bot est hébergé sur le même serveur que ce wiki, et utilise la même
            base de données. Rien n&apos;est stocké sur un service tiers, à
            l&apos;exception des fichiers audio lus en streaming pour la musique,
            qui sont téléchargés puis supprimés en fin de lecture.
          </p>
        </section>

        <section aria-labelledby="vos-droits" className="mt-10">
          <h2
            id="vos-droits"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Vos demandes
          </h2>
          <p className="mt-2 text-ink-300">
            Consultation, rectification et suppression se font par simple message
            à la modération du serveur. Une suppression concerne les données de
            jeu ; les dossiers de sanction restent conservés, parce que le
            journal d&apos;administration est la seule mémoire fiable en cas de
            contestation.
          </p>
          <a
            href={SITE.discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-md bg-gold-500 px-4 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
          >
            Contacter la modération ({SITE.discordInvite})
          </a>
        </section>

        <footer className="mt-12 border-t border-gold-500/20 pt-6 text-sm text-ink-400">
          <p>
            Voir aussi les{" "}
            <Link
              href="/bot/conditions"
              className="text-gold-300 underline hover:text-gold-200"
            >
              conditions d&apos;utilisation
            </Link>{" "}
            et la page de{" "}
            <Link href="/bot" className="text-gold-300 underline hover:text-gold-200">
              DelphinaBot
            </Link>
            .
          </p>
        </footer>
      </article>
    </>
  );
}
