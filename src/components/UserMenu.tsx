import Link from "next/link";
import { getServerSession, canWrite } from "@/lib/auth";
import { ROLE_INFO, sessionLabel } from "@/lib/types";
import LogoutButton from "@/components/admin/LogoutButton";

/**
 * Menu du compte dans l'en-tête.
 *
 * Il s'ouvre avec `<details>` : pas de JavaScript, pas d'état à synchroniser, et
 * le clavier fonctionne nativement (Entrée ouvre, Échap ferme dans la plupart
 * des navigateurs). Sur un wiki dont la promesse est de rester lisible sans
 * script, un menu qui exige un bundle pour afficher deux liens serait incohérent.
 *
 * Le composant est un composant serveur : la session est lue sur le serveur, et
 * le navigateur ne reçoit que le HTML déjà décidé. Aucun jeton ne transite par
 * du JavaScript côté client.
 */
export default async function UserMenu() {
  const session = await getServerSession();

  if (!session) {
    return (
      <Link
        href="/connexion"
        className="hidden shrink-0 rounded-md border border-gold-500/40 px-3 py-2 text-sm font-medium text-gold-200 transition hover:bg-gold-500/10 sm:block"
      >
        Connexion
      </Link>
    );
  }

  const label = sessionLabel(session);
  const role = ROLE_INFO[session.role];
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <details className="group relative shrink-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-gold-500/40 px-2 py-1.5 text-sm text-gold-200 transition hover:bg-gold-500/10 [&::-webkit-details-marker]:hidden">
        {session.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar distant, jamais optimisé par Next
          <img
            src={session.avatarUrl}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-full border border-gold-500/40 object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500/20 text-xs font-semibold text-gold-200"
          >
            {initial}
          </span>
        )}
        <span className="hidden max-w-[9rem] truncate sm:block">{label}</span>
        <span aria-hidden className="text-[10px] text-bronze-400">
          ▾
        </span>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-gold-500/30 bg-night-900/98 p-2 shadow-card backdrop-blur">
        <p className="px-2 pb-1 pt-1 text-[11px] uppercase tracking-[0.16em] text-bronze-400">
          {role.label}
        </p>
        <p className="truncate px-2 pb-2 text-xs text-slate-400">
          {session.provider === "discord" ? "Compte Discord" : "Compte du wiki"} ·{" "}
          {session.username}
        </p>

        <div className="my-1 h-px bg-night-500" />

        {canWrite(session) ? (
          <>
            <Link
              href="/admin"
              className="block rounded px-2 py-2 text-sm text-slate-200 transition hover:bg-gold-500/10 hover:text-gold-100"
            >
              Tableau de bord
            </Link>
            <Link
              href="/admin/nouveau"
              className="block rounded px-2 py-2 text-sm text-slate-200 transition hover:bg-gold-500/10 hover:text-gold-100"
            >
              Écrire un article
            </Link>
          </>
        ) : (
          <p className="px-2 py-2 text-xs leading-relaxed text-slate-500">
            Votre charge donne accès à la lecture et aux commentaires.
          </p>
        )}

        <div className="mt-1 border-t border-night-500 pt-2">
          <LogoutButton />
        </div>
      </div>
    </details>
  );
}
