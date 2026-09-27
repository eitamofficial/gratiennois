import { ROLE_INFO, type UserRole } from "@/lib/types";

/**
 * Badge de **charge constitutionnelle** (Dauphin, Régent, Conseil, Baillit,
 * Premier Ministre, Ministre, Représentant, Député).
 *
 * Ce composant ne connaît rien à Discord : il traduit une `UserRole` — donc
 * une identité d'édition déclarée dans `WIKI_USERS` — en pastille visuelle.
 * Pour les rôles *Discord*, voir `DiscordRoleBadge` : la couleur y vient de
 * l'API et sert uniquement de pastille décorative.
 *
 * La couleur distingue le pouvoir réel plutôt que la hiérarchie nominale :
 * l'or est réservé au Dauphin (pouvoir de véto), le bronze aux charges qui
 * écrivent, le gris ardoise aux charges représentatives (lecture seule).
 */
export default function RoleBadge({ role }: { role: UserRole }) {
  const info = ROLE_INFO[role];
  if (!info) return null;

  const tone = info.isDauphin
    ? {
        shell: "border-gold-500/45 bg-gold-500/10",
        dot: "bg-gold-400",
        text: "text-gold-200",
      }
    : info.canWrite
      ? {
          shell: "border-bronze-500/45 bg-bronze-500/10",
          dot: "bg-bronze-400",
          text: "text-bronze-200",
        }
      : {
          shell: "border-night-600 bg-night-800",
          dot: "bg-slate-500",
          text: "text-slate-300",
        };

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 " +
        "align-middle text-xs font-semibold uppercase tracking-[0.12em] " +
        tone.shell +
        " " +
        tone.text
      }
      title={info.basis}
    >
      <span aria-hidden className={"h-1.5 w-1.5 shrink-0 rounded-full " + tone.dot} />
      {info.label}
    </span>
  );
}
