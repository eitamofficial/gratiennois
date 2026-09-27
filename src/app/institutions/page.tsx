import Link from "next/link";
import type { Metadata } from "next";
import { getDiscordSnapshot, memberRoles } from "@/lib/discord";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Institutions",
  description:
    "Les huit charges définies par la Constitution du IIIe Delphinat et leurs détenteurs, lus dans les rôles du serveur Discord officiel.",
};

export const dynamic = "force-dynamic";

/**
 * Les charges et leurs définitions proviennent de l'article P-1 de la
 * Constitution (source : Constitution.pdf). Les détenteurs, eux, sont lus
 * dans les rôles réels du serveur Discord après synchronisation : rien n'est
 * supposé si la synchronisation n'a pas été faite.
 */
const CHARGES = [
  {
    name: "Dauphin",
    basis: "« Le Dauphin possède tous les pouvoirs et également le droit de véto. »",
    detail:
      "Il peut ajouter, réécrire ou supprimer des lois, sous réserve d'un accord à 50 % du Conseil Delphinal.",
    roleKeywords: ["dauphin", "delphe"],
  },
  {
    name: "Régent",
    basis: "« Ils possèdent le pouvoir de refuser une personne en staff. »",
    detail:
      "Sa participation est obligatoire dans la création, la modification et la suppression de lois au conseil.",
    roleKeywords: ["regent", "régent"],
  },
  {
    name: "Conseil Delphinal",
    basis: "« Ils sont les suppléants du Dauphin, ils disposent du droit d'administration du serveur. »",
    detail: "Les sangs delphinaux se composent des Géniteurs et des Agellids.",
    roleKeywords: ["conseil", "conseil delphinal"],
  },
  {
    name: "Baillit",
    basis: "« Ce sont les modérateurs, ils assurent une surveillance permanente du serveur. »",
    detail: "Choisis par le Dauphin, ils devraient être validés par le Régent.",
    roleKeywords: ["baillit", "modération", "moderation", "staff", "mod"],
  },
  {
    name: "Premier Ministre",
    basis: "« Le Premier Ministre est élu par un vote démocratique… »",
    detail: "Mandat de 4 mois ; il nomme le Gouvernement.",
    roleKeywords: ["premier ministre", "pm", "gouvernement"],
  },
  {
    name: "Ministre",
    basis: "« Le Ministère est nommé par le Premier Ministre à des postes précis et professionnels. »",
    detail: "Les ministres restent au Gouvernement jusqu'à sa fin.",
    roleKeywords: ["ministre", "ministère", "gouvernement"],
  },
  {
    name: "Représentant de l'Assemblée",
    basis: "« Le Représentant de l'Assemblée représente l'assemblée de Gratianopolis. »",
    detail: "Choisi par le Dauphin ou le Premier Ministre.",
    roleKeywords: ["représentant", "assemblée", "representant"],
  },
  {
    name: "Député",
    basis: "« Un nombre limité de députés est fixé à 10 Députés. »",
    detail: "Nommés par le Représentant de l'Assemblée, ils discutent des problèmes de Gratianopolis.",
    roleKeywords: ["député", "depute", "assemblée"],
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default async function InstitutionsPage() {
  const snapshot = await getDiscordSnapshot();

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
          Article P-1 de la Constitution
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Les institutions
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Les huit charges telles que la Constitution les définit. Les détenteurs
          ci-dessous sont lus dans les <strong className="text-slate-300">rôles réels du
          serveur Discord</strong> : s'ils n'apparaissent pas, c'est que la
          synchronisation n'a pas encore été effectuée — rien n'est supposé.
        </p>
        {snapshot && (
          <p className="mt-2 text-xs text-slate-400">
            Dernière synchronisation : {new Date(snapshot.fetchedAt).toLocaleDateString("fr-FR")}{" "}
            · {snapshot.members.length} membres analysés
          </p>
        )}
      </header>

      <ol className="space-y-4">
        {CHARGES.map((charge, index) => {
          const holders = snapshot
            ? snapshot.members.filter((member) => {
                const roles = memberRoles(snapshot, member).map((role) => normalize(role.name));
                return charge.roleKeywords.some((keyword) =>
                  roles.some((role) => role.includes(normalize(keyword))),
                );
              })
            : [];

          return (
            <li
              key={charge.name}
              className="rounded-xl border border-night-600 bg-night-800/60 p-5"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-sm text-slate-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="font-display text-xl font-semibold text-gold-200">{charge.name}</h2>
              </div>
              <blockquote className="mt-2 border-l-4 border-gold-500/50 bg-night-900/60 py-1.5 pl-3 pr-2 text-sm italic text-bronze-300">
                {charge.basis}
              </blockquote>
              <p className="mt-2 text-sm text-slate-400">{charge.detail}</p>

              <div className="mt-3 border-t border-night-700 pt-3">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Détenteur{holders.length > 1 ? "s" : ""} (rôle Discord)
                </p>
                {holders.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-400">
                    Non renseigné — la synchronisation Discord n&apos;a pas encore détecté de
                    membre portant ce rôle.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {holders.slice(0, 12).map((holder) => (
                      <li
                        key={holder.id}
                        className="flex items-center gap-2 rounded-full border border-night-600 bg-night-900/60 py-1 pl-1 pr-3 text-sm text-slate-200"
                      >
                        {holder.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={holder.avatarUrl}
                            alt=""
                            width={24}
                            height={24}
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                          />
                        ) : null}
                        {holder.displayName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="rounded-xl border border-gold-500/30 bg-night-800/50 p-5 text-sm text-slate-400">
        Texte de référence :{" "}
        <Link href="/wiki/la-constitution" className="text-gold-300 hover:underline">
          Constitution et Hiérarchie du IIIe Delphinat Gratiennois
        </Link>{" "}
        · document original{" "}
        <a href="/Constitution.pdf" className="text-gold-300 hover:underline">
          Constitution.pdf
        </a>
      </p>
    </div>
  );
}
