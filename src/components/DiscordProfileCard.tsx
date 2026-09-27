import type { DiscordMember, DiscordRole, DiscordSnapshot } from "@/lib/types";
import { formatDate } from "@/lib/constants";
import { memberRoles } from "@/lib/discord";
import DiscordRoleBadge from "./DiscordRoleBadge";

interface Props {
  snapshot: DiscordSnapshot | null;
  discordUserId?: string;
  /** Nom à résoudre si l'ID n'est pas encore synchronisé. */
  fallbackName: string;
}

/**
 * Profil 100 % données réelles du serveur Discord (API v10).
 * Aucune donnée n'est inventée : si le membre est introuvable, on l'indique.
 */
export default function DiscordProfileCard({ snapshot, discordUserId, fallbackName }: Props) {
  const member =
    (discordUserId
      ? snapshot?.members.find((item) => item.id === discordUserId) ?? null
      : null) ?? null;
  const roles = memberRoles(snapshot, member);

  if (!snapshot || snapshot.source === "none") {
    return (
      <aside className="mb-8 rounded-xl border border-night-600 bg-night-800/60 p-5 text-sm text-slate-400">
        <p className="font-medium text-gold-300">Profil Discord non synchronisé</p>
        <p className="mt-1 leading-relaxed">
          La synchronisation Discord n&apos;est pas encore configurée ou n&apos;a pas
          encore été exécutée. Les données affichées ici (avatar, rôles, ancienneté)
          proviendront des données réelles du serveur une fois
          <code className="mx-1 rounded bg-night-700 px-1.5 py-0.5 text-xs text-bronze-300">
            POST /api/sync/discord
          </code>
          lancé depuis l&apos;espace d&apos;édition.
        </p>
      </aside>
    );
  }

  if (!member) {
    return (
      <aside className="mb-8 rounded-xl border border-night-600 bg-night-800/60 p-5 text-sm text-slate-400">
        <p className="font-medium text-gold-300">Profil Discord introuvable</p>
        <p className="mt-1 leading-relaxed">
          {discordUserId
            ? "Le membre associé à ce profil n'a pas été trouvé sur le serveur lors de la dernière synchronisation."
            : `Aucun membre nommé « ${fallbackName} » n'a été trouvé lors de la dernière synchronisation (${formatDate(snapshot.fetchedAt)}). Vérifiez le nom ou renseignez l'ID Discord depuis l'espace d'édition.`}
        </p>
      </aside>
    );
  }

  return (
    <aside className="mb-8 overflow-hidden rounded-xl border border-night-600 bg-night-800/60">
      <div className="flex flex-wrap items-center gap-4 border-b border-night-600 bg-night-900/60 px-5 py-4">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatarUrl}
            alt={`Avatar Discord de ${member.displayName}`}
            className="h-16 w-16 shrink-0 rounded-full border-2 border-gold-500/50 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold-500/50 bg-night-700 text-xl">
            👤
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-snug text-slate-100">
            {member.displayName}
          </p>
          <p className="text-xs leading-relaxed text-slate-400 [overflow-wrap:anywhere]">
            @{member.username}
            {member.joinedAt && (
              <> · membre depuis le {formatDate(member.joinedAt)}</>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Données réelles du serveur · source : API Discord ({snapshot.source}) ·
            synchronisé le {formatDate(snapshot.fetchedAt)}
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
          Rôles sur le serveur
        </p>
        {roles.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun rôle attribué.</p>
        ) : (
          <p className="flex flex-wrap gap-1.5">
            {roles.map((role) => (
              <DiscordRoleBadge key={role.id} name={role.name} color={role.color} />
            ))}
          </p>
        )}
      </div>
    </aside>
  );
}
