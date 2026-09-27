import Link from "next/link";
import type { Metadata } from "next";
import { getDiscordSnapshot, findMemberByName, memberRoles } from "@/lib/discord";
import { getPublishedArticles } from "@/lib/articles-store";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { characterBySlug } from "@/lib/roster";
import DiscordRoleBadge from "@/components/DiscordRoleBadge";
import { formatDate } from "@/lib/constants";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Personnalités",
  description:
    "Personnalités importantes du IIIe Delphinat — profils synchronisés avec le serveur Discord officiel.",
};

export const dynamic = "force-dynamic";

export default async function PersonalitiesPage() {
  const [articles, snapshot] = await Promise.all([
    getPublishedArticles(),
    getDiscordSnapshot(),
  ]);
  const personalities = articles.filter((article) => article.category === "personnalites");

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
          <span aria-hidden>👑</span> Figures du Delphinat
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Personnalités importantes
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Ces profils sont alimentés par les <strong className="text-slate-300">données
          réelles du serveur Discord officiel</strong> (avatar, rôles, ancienneté) via
          l&apos;API Discord. Rien n&apos;est inventé : la biographie se complète
          progressivement par la rédaction du wiki.
        </p>
        {snapshot && (
          <p className="mt-2 text-xs text-slate-400">
            Dernière synchronisation : {formatDate(snapshot.fetchedAt)} · source : API Discord
            ({snapshot.source})
            {snapshot.guild?.memberCount != null && <> · {snapshot.guild.memberCount} membres</>}
          </p>
        )}
      </header>

      {personalities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          Aucune personnalité enregistrée pour le moment.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {personalities.map((article) => {
            // Fiche de la configuration partagée : c'est elle qui fait le lien
            // entre la page et le rôle Discord (voir `shared/roster.json`).
            const character = characterBySlug(article.slug);
            const discordUserId = article.discordUserId ?? character?.discordUserId;
            const member =
              (discordUserId
                ? snapshot?.members.find((item) => item.id === discordUserId)
                : null) ?? findMemberByName(snapshot, article.title);
            const roles = memberRoles(snapshot, member ?? null);
            // Photo en direct si l'API répond, portrait en cache local sinon.
            const avatar = resolveAvatarUrl(discordUserId, snapshot);

            return (
              <Link
                key={article.slug}
                href={`/wiki/${article.slug}`}
                className="group flex gap-4 rounded-xl border border-night-600 bg-night-800/70 p-5 transition hover:border-gold-500/50 hover:bg-night-800"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt={`Photo de profil Discord de ${article.title}`}
                    width={56}
                    height={56}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 shrink-0 rounded-full border-2 border-gold-500/50 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-night-500 bg-night-700 text-lg">
                    👤
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold text-slate-100 transition group-hover:text-gold-200">
                    {article.title}
                  </h2>
                  {character?.charge && (
                    <p className="mt-0.5 text-xs font-medium text-gold-300">
                      {character.charge}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {member
                      ? `@${member.username}${member.joinedAt ? ` · depuis le ${formatDate(member.joinedAt)}` : ""}`
                      : "Profil Discord non encore synchronisé"}
                  </p>
                  {roles.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {roles.slice(0, 3).map((role) => (
                        <DiscordRoleBadge key={role.id} name={role.name} color={role.color} />
                      ))}
                      {roles.length > 3 && (
                        <span className="text-xs text-slate-400">
                          +{roles.length - 3}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
