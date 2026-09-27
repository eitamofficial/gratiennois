import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSession } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) redirect("/admin");

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl border border-gold-500/30 bg-night-800/70 p-8 shadow-card">
        <p className="text-center text-3xl" aria-hidden>
          🛡️
        </p>
        <h1 className="mt-3 text-center font-display text-2xl font-semibold text-gold-200">
          Espace d&apos;édition
        </h1>
        <p className="mt-2 mb-6 text-center text-sm leading-relaxed text-slate-400">
          Réservé aux charges de la Constitution (article P-1) : Dauphin, Régent, Conseil
          Delphinal, Baillit. Identifiez-vous pour créer ou modifier les articles.
        </p>

        <Suspense fallback={<p className="text-center text-sm text-slate-400">Chargement…</p>}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        <Link href="/" className="transition hover:text-gold-200">
          ← Retour à l&apos;accueil
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-400">
        La consultation du wiki reste libre et publique.
      </p>
    </div>
  );
}
