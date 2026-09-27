import { getDiscordSnapshot, isDiscordConfigured, getDiscordConfig } from "@/lib/discord";
import { formatDateTime } from "@/lib/constants";
import SyncDiscordButton from "@/components/SyncDiscordButton";

/**
 * Panneau de configuration Discord côté serveur : affiche l'état réel
 * (configuré ? synchronisé ? erreurs) et la marche à suivre si ce n'est pas le cas.
 */
export default async function DiscordSyncPanel() {
  const configured = isDiscordConfigured();
  const snapshot = configured ? await getDiscordSnapshot() : null;
  const { guildId } = getDiscordConfig();

  return (
    <section className="rounded-xl border border-night-600 bg-night-800/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium text-slate-100">Synchronisation Discord</h2>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            configured
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-300"
          }`}
        >
          {configured ? "Configuré" : "Non configuré"}
        </span>
      </div>

      {configured ? (
        <>
          <p className="mt-1 text-xs text-slate-400">
            Serveur{" "}
            <span className="text-slate-300">
              {snapshot?.guild?.name ?? guildId ?? "inconnu"}
            </span>
            {snapshot?.fetchedAt && <> · dernière sync {formatDateTime(snapshot.fetchedAt)}</>}
          </p>
          {snapshot?.errors && snapshot.errors.length > 0 && (
            <ul className="mt-2 space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-300/90">
              {snapshot.errors.map((message) => (
                <li key={message}>⚠ {message}</li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <SyncDiscordButton />
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Renseignez les deux variables suivantes dans{" "}
            <code className="rounded bg-night-700 px-1.5 py-0.5 text-xs text-bronze-300">.env</code>{" "}
            pour que les profils affichent les données réelles du serveur (avatar, rôles,
            ancienneté).
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-400">
            <li>
              <code className="text-bronze-300">DISCORD_BOT_TOKEN</code> —/create New
              Application sur discord.com/developers/applications → onglet <em>Bot</em> →{" "}
              <em>Reset Token</em>.
            </li>
            <li>
              Onglet <em>Bot</em> → activez <strong>Server Members Intent</strong> (obligatoire
              pour lister les membres).
            </li>
            <li>
              Onglet <em>OAuth2</em> → <em>URL Generator</em> → scope{" "}
              <code className="text-bronze-300">bot</code> + permission{" "}
              <em>View Server Members</em> → invitez le bot sur le serveur.
            </li>
            <li>
              <code className="text-bronze-300">DISCORD_GUILD_ID</code> — Discord →
              Paramètres → Paramètres avancés → <em>Mode développeur</em>, puis clic droit
              sur le serveur → <em>Copier l&apos;identifiant du serveur</em>.
            </li>
            <li>
              Vérifiez avec{" "}
              <code className="rounded bg-night-700 px-1.5 py-0.5 text-bronze-300">
                node scripts/check-discord.mjs
              </code>
              , puis cliquez sur « Synchroniser maintenant ».
            </li>
          </ol>
        </>
      )}
    </section>
  );
}
