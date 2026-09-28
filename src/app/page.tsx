import Link from "next/link";
import type { Metadata } from "next";
import { SITE, CATEGORY_LIST, formatDate, formatDateTime } from "@/lib/constants";
import { getPublishedArticles, getRecentRevisions } from "@/lib/articles-store";
import { getDiscordSnapshot } from "@/lib/discord";
import ArticleCard from "@/components/ArticleCard";
import FramedImage from "@/components/FramedImage";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Accueil",
  description: SITE.description,
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [articles, discordSnapshot, recentRevisions] = await Promise.all([
    getPublishedArticles(),
    getDiscordSnapshot(),
    getRecentRevisions(8),
  ]);
  const latest = articles.slice(0, 3);
  const count = articles.length;

  return (
    <div className="space-y-12">
      <MobileNav />

      {/* Héros — drapeau officiel */}
      <section className="relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-br from-night-800 via-night-900 to-night-950 px-6 py-12 text-center shadow-card sm:px-12 sm:py-16">
        {/* Le cadre suit le ratio réel du drapeau : pas de rognage, pas de
            bande vide autour de l'image. */}
        <FramedImage
          src="/flag.webp"
          alt="Drapeau du IIIe Delphinat de Gratianopolis"
          widthClass="w-36 sm:w-48"
          loading="eager"
          fetchPriority="high"
          width={640}
          height={400}
          className="border-gold-500/60"
        />
        <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-bronze-400">
          Encyclopédie officielle
        </p>
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-tight text-gold-200 sm:text-5xl">
          {SITE.name}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
          Le wiki du IIIe Delphinat de Gratianopolis : la Constitution, la hiérarchie des
          institutions et les personnalités de la micronation. Les données des profils et du
          serveur proviennent de l&apos;API Discord.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/constitution"
            className="rounded-md bg-gold-500 px-6 py-3 text-sm font-semibold text-night-950 shadow-glow-gold transition hover:bg-gold-400"
          >
            📜 Constitution officielle
          </Link>
          <Link
            href="/personnalites"
            className="rounded-md border border-gold-500/50 px-6 py-3 text-sm font-medium text-gold-200 transition hover:bg-gold-500/10"
          >
            👑 Personnalités
          </Link>
          <a
            href={SITE.discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-night-500 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-gold-500/50"
          >
            Rejoindre le Discord
          </a>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          {count} article{count > 1 ? "s" : ""} consultable{count > 1 ? "s" : ""} librement —
          l&apos;édition est réservée aux charges de la Constitution (Dauphin, Régent,
          Conseil Delphinal, Baillit).
        </p>
      </section>

      {/* Hébergement temporaire — à retirer quand le site aura une adresse définitive.

          Ce bandeau n'est pas décoratif : le site tourne aujourd'hui sur un
          ordinateur personnel, branché chez l'un des membres, et non chez un
          hébergeur. Toute coupure d'électricité, de connexion ou de
          redémarrage le met hors service. Le dire aux visiteurs évite qu'ils
          n'y voient une panne du wiki. */}
      <section
        aria-labelledby="hebergement-temporaire"
        className="rounded-2xl border border-bronze-500/30 bg-night-800/60 px-5 py-5 sm:px-6"
      >
        <h2
          id="hebergement-temporaire"
          className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-bronze-400"
        >
          <span aria-hidden>⚙️</span>
          Hébergement temporaire
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
          <p>
            Ce wiki est hébergé, pour l&apos;instant, sur un <strong>ordinateur
            personnel</strong> — et non dans un datacenter. Il fonctionne
            tant que cet ordinateur est allumé, branché et connecté à
            Internet&nbsp;; une coupure d&apos;électricité, un reboot ou une
            perte de connexion le met momentanément hors service.
          </p>
          <p>
            L&apos;adresse <code className="text-gold-300">{SITE.name}</code> et son
            certificat HTTPS sont fournis par DuckDNS et Let&apos;s Encrypt, ce
            qui est provisoire. Un hébergement définitif remplacera
            progressivement cette installation.
          </p>
        </div>
      </section>

      {/* Programme du parti — résumé, la page complète fait foi.

          L'accueil n'a pas vocation à être un tract : trois lignes, deux
          paliers chiffrés, et un lien. Les chiffres y sont volontairement
          vérifiables, parce qu'un engagement que l'on peut contrôler vaut
          davantage qu'un discours. */}
      <section
        aria-labelledby="programme"
        className="rounded-2xl border border-gold-500/30 bg-gradient-to-br from-night-800/80 to-night-900/80 p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-400">
              Parti Révolutionnaire Socialiste Gratiennois
            </p>
            <h2
              id="programme"
              className="mt-2 font-display text-2xl font-semibold text-gold-200"
            >
              Stabiliser le serveur, et le prouver
            </h2>
          </div>
          <Link
            href="/programme"
            className="rounded-md border border-gold-500/50 px-4 py-2 text-sm font-medium text-gold-200 transition hover:bg-gold-500/10"
          >
            Le programme complet →
          </Link>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          <li className="rounded-xl border border-night-600 bg-night-800/70 p-4">
            <span className="font-display text-lg font-semibold text-gold-200">
              14 boosts
            </span>
            <span className="ml-2 rounded-full border border-gold-500/40 px-2 py-0.5 text-xs text-gold-300">
              Niveau 3
            </span>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Stabiliser et préserver le serveur à ce palier, pour qu&apos;il
              accueille une institution qui dure.
            </p>
          </li>
          <li className="rounded-xl border border-night-600 bg-night-800/70 p-4">
            <span className="font-display text-lg font-semibold text-gold-200">
              28 boosts
            </span>
            <span className="ml-2 rounded-full border border-gold-500/40 px-2 py-0.5 text-xs text-gold-300">
              Palier supérieur
            </span>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Si le serveur évolue, trois mois d&apos;abonnement pris en charge,
              sans contrepartie politique.
            </p>
          </li>
        </ul>

        <p className="mt-5 text-sm leading-relaxed text-slate-300">
          Ces engagements sont adossés à du travail déjà livré :{" "}
          <strong className="text-ink-100">ce wiki</strong> et{" "}
          <strong className="text-ink-100">le bot Discord</strong> qui le
          synchronise avec le serveur, tous deux en service. Voir la{" "}
          <Link
            href="/credits"
            className="text-gold-300 underline-offset-4 hover:underline"
          >
            page crédits
          </Link>
          .
        </p>
      </section>

      {/* Accès rapides */}
      <section aria-labelledby="acces-rapides">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="acces-rapides" className="font-display text-2xl font-semibold text-gold-200">
            Accès rapides
          </h2>
          <Link href="/wiki" className="inline-block py-2.5 text-sm text-gold-300 transition hover:text-gold-200">
            Tout l&apos;index →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_LIST.map((category) => (
            <Link
              key={category.id}
              href={`/wiki/categorie/${category.id}`}
              className="group rounded-xl border border-night-600 bg-night-800/70 p-5 transition hover:border-gold-500/50 hover:bg-night-800"
            >
              <span className="text-2xl" aria-hidden>
                {category.icon}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold text-slate-100 transition group-hover:text-gold-200">
                {category.label}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                {category.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Dernières publications */}
      {latest.length > 0 && (
        <section aria-labelledby="actualites">
          <div className="mb-5 flex items-end justify-between">
            <h2 id="actualites" className="font-display text-2xl font-semibold text-gold-200">
              Dernières publications
            </h2>
            <p className="text-xs text-slate-400">
              mise à jour : {latest[0] ? formatDate(latest[0].updatedAt) : "—"}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {latest.map((article) => (
              <ArticleCard
                key={article.slug}
                article={{
                  slug: article.slug,
                  title: article.title,
                  category: article.category,
                  summary: article.summary,
                  tags: article.tags,
                  author: article.author,
                  createdAt: article.createdAt,
                  updatedAt: article.updatedAt,
                  discordUserId: article.discordUserId,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Dernières modifications — la « liste des modifications » d'une
          encyclopédie : ce qui a bougé, par qui et quand. Les révisions
          supprimées sont exclues (leur article n'existe plus). */}
      {recentRevisions.some((revision) => revision.action !== "delete") && (
        <section aria-labelledby="dernieres-modifications">
          <h2
            id="dernieres-modifications"
            className="mb-5 font-display text-2xl font-semibold text-gold-200"
          >
            Dernières modifications
          </h2>
          <ol className="divide-y divide-night-700 overflow-hidden rounded-xl border border-night-600 bg-night-800/40">
            {recentRevisions
              .filter((revision) => revision.action !== "delete")
              .map((revision) => (
                <li
                  key={revision.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm"
                >
                  <span className="tabular-nums text-xs text-slate-400">
                    {formatDateTime(revision.createdAt)}
                  </span>
                  <Link
                    href={`/wiki/${revision.articleSlug}`}
                    className="font-medium text-slate-100 underline decoration-gold-500/40 underline-offset-4 transition hover:text-gold-200"
                  >
                    {revision.snapshot.title}
                  </Link>
                  <span className="text-xs text-slate-400">
                    par {revision.author}
                  </span>
                  <Link
                    href={`/wiki/${revision.articleSlug}/versions`}
                    className="ml-auto flex min-h-[2.5rem] shrink-0 items-center py-2.5 text-xs text-gold-300 transition hover:text-gold-200"
                  >
                    historique →
                  </Link>
                </li>
              ))}
          </ol>
        </section>
      )}

      {/* État du serveur Discord — données réelles uniquement */}
      <section className="rounded-2xl border border-night-600 bg-night-800/50 px-6 py-8 text-center sm:px-10">
        {discordSnapshot?.guild ? (
          <>
            <h2 className="font-display text-xl font-semibold text-gold-300">
              {discordSnapshot.guild.name} — données du serveur Discord
            </h2>
            <p className="mx-auto mt-2 text-sm text-slate-300">
              {discordSnapshot.guild.memberCount != null && (
                <>
                  <span className="font-semibold text-gold-200">
                    {discordSnapshot.guild.memberCount}
                  </span>{" "}
                  membres
                </>
              )}
              {discordSnapshot.guild.onlineCount != null && (
                <>
                  {" · "}
                  <span className="font-semibold text-emerald-400">
                    {discordSnapshot.guild.onlineCount}
                  </span>{" "}
                  en ligne
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Récupérées via l&apos;API Discord le {formatDateTime(discordSnapshot.fetchedAt)}
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-semibold text-gold-300">
              Synchronisation Discord
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              La synchronisation avec l&apos;API Discord n&apos;est pas encore configurée
              (<code className="rounded bg-night-700 px-1.5 py-0.5 text-xs text-bronze-300">
                DISCORD_BOT_TOKEN
              </code>{" "}
              et{" "}
              <code className="rounded bg-night-700 px-1.5 py-0.5 text-xs text-bronze-300">
                DISCORD_GUILD_ID
              </code>
              ). Tant qu&apos;elle ne l&apos;est pas, aucune donnée n&apos;est affichée à sa
              place.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
