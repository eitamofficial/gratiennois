import Link from "next/link";
import type { Metadata } from "next";
import { CREDITS, DELPHINABOT, SITE } from "@/lib/constants";
import { siteUrl } from "@/lib/site-url";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "DelphinaBot",
  description: DELPHINABOT.resume,
  alternates: { canonical: "/bot" },
};

export const dynamic = "force-dynamic";

export default function BotPage() {
  // Les quatre adresses du portail développeur sont dérivées du domaine réel
  // au moment du rendu : même code juste en local, sur le domaine définitif et
  // sur un déploiement Vercel, sans jamais ressaisir une URL à la main.
  const base = siteUrl();

  return (
    <>
      <MobileNav />
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-gold-500/20 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            Bot Discord
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-50 sm:text-4xl">
            {DELPHINABOT.nom}
          </h1>
          <p className="mt-3 text-ink-300">{DELPHINABOT.resume}</p>
        </header>

        <section aria-labelledby="adresses" className="mt-8">
          <h2
            id="adresses"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Les quatre adresses du portail développeur
          </h2>
          <p className="mt-2 text-ink-300">
            Discord exige quatre champs renseignés lors de l&apos;activation des
            liens de rôles et des interactions. Les voici, écrits une seule fois
            pour que le portail et ce wiki ne puissent pas diverger.
          </p>

          <dl className="mt-5 space-y-4">
            {DELPHINABOT.adresses.map((entree) => (
              <div
                key={entree.cle}
                className="rounded-xl border border-gold-500/25 bg-night-900/40 p-5"
              >
                <dt className="text-xs font-semibold uppercase tracking-wider text-gold-400">
                  {entree.titre}
                </dt>
                <dd className="mt-2 break-all font-mono text-sm text-ink-50">
                  {base}
                  {entree.chemin}
                </dd>
                <dd className="mt-2 text-sm text-ink-300">{entree.explication}</dd>
                <dd className="mt-3">
                  <Link
                    href={entree.chemin}
                    className="inline-block rounded-md border border-gold-500/40 px-3 py-1.5 text-xs font-medium text-gold-200 transition hover:bg-gold-500/10"
                  >
                    Ouvrir cette page
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="modules" className="mt-10">
          <h2
            id="modules"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Ce que le bot sait faire
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {DELPHINABOT.modules.map((module) => (
              <li
                key={module.nom}
                className="rounded-xl border border-night-500 bg-night-900/30 p-4"
              >
                <p className="font-display text-lg font-semibold text-ink-50">
                  {module.nom}
                </p>
                <p className="mt-2 text-sm text-ink-300">{module.resume}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="principes" className="mt-10">
          <h2
            id="principes"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Quatre règles qu&apos;il ne franchit pas
          </h2>
          <ul className="mt-4 space-y-3 text-ink-300">
            {DELPHINABOT.principes.map((principe) => (
              <li key={principe} className="flex gap-3">
                <span aria-hidden="true" className="text-gold-400">
                  —
                </span>
                <span>{principe}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="invitation" className="mt-10">
          <h2
            id="invitation"
            className="font-display text-xl font-semibold text-gold-200"
          >
            Le rejoindre
          </h2>
          <p className="mt-2 text-ink-300">
            Le bot n&apos;est utile qu&apos;avec des commandes : il se trouve sur le
            serveur Discord officiel du Delphinat, où il répond en français.
          </p>
          <a
            href={SITE.discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-md bg-gold-500 px-4 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
          >
            Rejoindre le serveur ({SITE.discordInvite})
          </a>
        </section>

        <footer className="mt-12 border-t border-gold-500/20 pt-6 text-sm text-ink-400">
          <p>
            {DELPHINABOT.nom} est écrit par {CREDITS.author.name}, dont le
            travail est détaillé sur la page des{" "}
            <Link href="/credits" className="text-gold-300 underline hover:text-gold-200">
              crédits
            </Link>
            .
          </p>
        </footer>
      </article>
    </>
  );
}
