import Link from "next/link";
import type { Metadata } from "next";
import { CREDITS, SITE } from "@/lib/constants";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { getDiscordSnapshot } from "@/lib/discord";
import MobileNav from "@/components/MobileNav";
import FramedImage from "@/components/FramedImage";

export const metadata: Metadata = {
  title: "Crédits",
  description:
    "Crédits du wiki du IIIe Delphinat de Gratianopolis : auteur, sources, contributions et outillage technique.",
  alternates: { canonical: "/credits" },
};

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  // La photo de l'auteur vient de la même source que tous les autres portraits :
  // l'API Discord, avec repli sur le cache local. Rien n'est saisi à la main.
  const snapshot = await getDiscordSnapshot();
  const portrait = resolveAvatarUrl(CREDITS.author.discordUserId, snapshot);

  return (
    <>
      <MobileNav />
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-gold-500/20 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            Crédits
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-50 sm:text-4xl">
            À qui doit ce wiki
          </h1>
          <p className="mt-3 text-ink-300">
            Une encyclopédie doit nommer celles et ceux qui l&apos;écrivent et qui
            l&apos;entretiennent. Voici les noms, sans détour.
          </p>
        </header>

        <section aria-labelledby="auteur" className="mt-8">
          <h2 id="auteur" className="font-display text-xl font-semibold text-gold-200">
            Auteur
          </h2>

          <div className="mt-4 flex flex-col gap-5 rounded-xl border border-gold-500/25 bg-night-900/40 p-5 sm:flex-row sm:items-start">
            {portrait ? (
              <FramedImage
                src={portrait}
                alt={`Photo de profil Discord de ${CREDITS.author.name}`}
                widthClass="w-24 shrink-0"
                defaultRatio={1}
                loading="eager"
              />
            ) : null}

            <div className="min-w-0">
              <p className="font-display text-xl font-bold text-ink-50">
                {CREDITS.author.name}
              </p>
              <p className="mt-1 text-sm font-medium text-gold-300">
                {CREDITS.author.role}
              </p>
              <p className="mt-3 text-ink-300">{CREDITS.author.description}</p>
              <Link
                href={`/wiki/${CREDITS.author.articleSlug}`}
                className="mt-4 inline-block rounded-md border border-gold-500/40 px-4 py-2.5 text-sm font-medium text-gold-200 transition hover:bg-gold-500/10"
              >
                Lire sa fiche
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="contributions" className="mt-10">
          <h2 id="contributions" className="font-display text-xl font-semibold text-gold-200">
            Contributions
          </h2>
          <dl className="mt-4 space-y-5">
            {CREDITS.contributions.map((item) => (
              <div key={item.name} className="border-l-2 border-gold-500/40 pl-4">
                <dt className="font-semibold text-ink-100">{item.name}</dt>
                <dd className="text-sm text-gold-400">{item.role}</dd>
                <dd className="mt-2 text-ink-300">{item.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="sources" className="mt-10">
          <h2 id="sources" className="font-display text-xl font-semibold text-gold-200">
            Sources
          </h2>
          <div className="mt-4 space-y-3 text-ink-300">
            <p>
              Les articles sont établis par ordre de préséance. Les textes
              fondateurs — la{" "}
              <Link href="/constitution" className="text-gold-300 underline hover:text-gold-200">
                Constitution en vigueur
              </Link>{" "}
              et ceux des deux règnes précédentes — priment sur tout le reste.
              Les identités, rôles, ancienneté et photos de profil sont lus{" "}
              <strong className="text-ink-100">en direct</strong> sur l&apos;API du
              serveur Discord (
              <a
                href={SITE.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-300 underline hover:text-gold-200"
              >
                {SITE.discordInvite}
              </a>
              ). Le reste relève du récit de la rédaction, attribué comme tel dans
              chaque article.
            </p>
            <p>
              Lorsqu&apos;une information n&apos;est pas documentée, l&apos;article
              l&apos;indique (« non renseigné ») plutôt que de la combler : une
              encyclopédie qui invente se contredit elle-même.
            </p>
          </div>
        </section>

        <section aria-labelledby="soutenir" className="mt-10">
          <h2 id="soutenir" className="font-display text-xl font-semibold text-gold-200">
            Soutenir
          </h2>
          <p className="mt-2 text-ink-300">
            Ce wiki est gratuit, sans publicité et sans suivi. Si le temps
            qu&apos;il demande vous a été utile, le moyen le plus simple de le
            signaler reste de vous abonner et d&apos;écouter.
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {CREDITS.support.map((item) => (
              <li
                key={item.name}
                className="flex flex-col rounded-xl border border-gold-500/25 bg-night-900/40 p-5"
              >
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-lg font-semibold text-ink-50">
                    {item.name}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-gold-400">
                    {item.handle}
                  </p>
                </div>
                <p className="mt-2 text-sm text-ink-300">{item.description}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block self-start rounded-md bg-gold-500 px-4 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
                >
                  Ouvrir {item.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="outillage" className="mt-10">
          <h2 id="outillage" className="font-display text-xl font-semibold text-gold-200">
            Outillage
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {CREDITS.stack.map((item) => (
              <li
                key={item}
                className="rounded-full border border-night-500 bg-night-900/60 px-3 py-1.5 text-sm text-ink-200"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-12 border-t border-gold-500/20 pt-6 text-sm text-ink-400">
          <p>
            {SITE.wikiName} — conçu par {CREDITS.author.name}. Toute reprise du
            contenu doit mentionner cette page.
          </p>
        </footer>
      </article>
    </>
  );
}
