import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canWrite, getServerSession } from "@/lib/auth";
import { ROLE_INFO } from "@/lib/types";
import RoleBadge from "@/components/RoleBadge";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/**
 * Cadre de l'espace d'édition. Les charges constitutionnelles sans pouvoir
 * d'écriture (ministre, député…) sont identifiées mais n'accèdent pas à
 * l'éditeur : la page d'accueil leur explique pourquoi.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/connexion?next=/admin");

  if (!canWrite(session)) {
    const info = ROLE_INFO[session.role];
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <RoleBadge role={session.role} />
        <h1 className="mt-4 font-display text-2xl font-semibold text-gold-200">
          Consultation seule
        </h1>
        <p className="mx-auto mt-3 text-sm leading-relaxed text-slate-400">
          Votre charge de <span className="text-slate-200">{info.label}</span>{" "}
          {session.username} ne figure pas parmi celles qui édite le wiki
          (Dauphin, Régent, Conseil Delphinal, Baillit).
        </p>
        <blockquote className="mx-auto mt-4 max-w-lg border-l-4 border-gold-500/60 bg-night-800/60 py-2 pl-4 pr-3 text-left text-sm italic text-bronze-300">
          {info.basis}
        </blockquote>
        <p className="mt-4 text-sm text-slate-400">
          <Link href="/" className="text-gold-300 hover:underline">
            ← Retour au wiki
          </Link>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
