import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession, canWrite } from "@/lib/auth";
import { getProposals } from "@/lib/articles-store";
import { getGeminiConfig, isGeminiConfigured } from "@/lib/gemini";
import { WATCHED_CHANNELS } from "@/lib/ai/corpus";
import MobileNav from "@/components/MobileNav";
import ProposalPanel from "@/components/admin/ProposalPanel";
import RoleBadge from "@/components/RoleBadge";

export const metadata: Metadata = {
  title: "Analyse automatique",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/**
 * File de relecture des propositions rédigées par l'analyse automatique.
 *
 * Cette page explique en clair le partage des rôles : l'intelligence
 * automatique **produit** une rédaction, un rédacteur **décide**. Rien de ce
 * qui figure ici n'est public tant qu'il n'a pas été validé.
 */
export default async function IaReviewPage() {
  const session = await getServerSession();
  if (!session) redirect("/connexion?next=/admin/ia");
  if (!canWrite(session)) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <RoleBadge role={session.role} />
        <h1 className="mt-4 font-display text-2xl font-semibold text-gold-200">
          Consultation seule
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          La relecture des propositions automatiques est réservée aux charges
          qui publient des articles.
        </p>
      </div>
    );
  }

  const propositions = (await getProposals()).map((article) => ({
    slug: article.slug,
    cible: article.slug.replace(/-proposition$/, ""),
    title: article.title,
    resume: article.summary,
    tags: article.tags,
    updatedAt: article.updatedAt,
    auteur: article.author,
  }));
  const gemini = getGeminiConfig();

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-sm text-slate-400">
          <Link href="/admin" className="transition hover:text-gold-200">
            Administration
          </Link>{" "}
          / Analyse automatique
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200">
          Proposals de l&apos;analyse automatique
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Le moteur lit les salons de parti et rédige des mises à jour. Il ne
          publie <strong className="text-slate-200">jamais</strong> seul : chaque
          proposition attend une décision humaine, et reste invisible du site
          tant qu&apos;elle n&apos;est pas validée.
        </p>
      </header>

      <section
        aria-labelledby="etat-moteur"
        className="rounded-lg border border-night-600 bg-night-900/60 p-5"
      >
        <h2
          id="etat-moteur"
          className="font-display text-lg font-semibold text-slate-100"
        >
          État du moteur
        </h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-400">
              Clé Gemini
            </dt>
            <dd
              className={
                isGeminiConfigured()
                  ? "mt-1 text-sm text-emerald-300"
                  : "mt-1 text-sm text-amber-300"
              }
            >
              {isGeminiConfigured()
                ? `Configurée — modèle ${gemini.model}`
                : "Absente (GEMINI_API_KEY). L'analyse est désactivée."}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-400">
              Proposition en attente
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {propositions.length}
            </dd>
          </div>
        </dl>

        <h3 className="mt-6 text-xs uppercase tracking-wider text-slate-400">
          Salons surveillés
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {WATCHED_CHANNELS.map((salon) => (
            <li key={salon.id} className="flex flex-wrap items-baseline gap-2">
              <span className="text-slate-200">{salon.libelle}</span>
              <span className="text-xs text-slate-400">
                → {salon.articleSlug}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ProposalPanel propositions={propositions} />
    </div>
  );
}
