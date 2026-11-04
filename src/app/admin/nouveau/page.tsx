import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { redirectToLogin } from "@/lib/redirects";
import { getServerSession } from "@/lib/auth";
import AdminArticleForm from "@/components/admin/AdminArticleForm";
import TemplateGallery from "@/components/admin/TemplateGallery";
import MobileNav from "@/components/MobileNav";
import { templateById } from "@/content/templates";

export const metadata: Metadata = {
  title: "Nouvel article",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ modele?: string }>;
}

export default async function NewArticlePage({ searchParams }: Props) {
  const session = await getServerSession();
  if (!session) return redirectToLogin("/admin/nouveau");

  const { modele } = await searchParams;
  const template = templateById(modele);

  return (
    <div className="mx-auto max-w-5xl">
      <MobileNav />
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
          Espace d&apos;édition
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200">
          {template ? template.name : "Nouvel article"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          {template
            ? template.description
            : "Choisissez un modèle : il pré-remplit la catégorie, la structure des rubriques et l'infobox. Une page blanche vous obligerait à réinventer une structure que l'encyclopédie répète."}
        </p>
      </header>

      {template ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded border border-gold-500/40 bg-gold-500/10 px-2 py-1 text-gold-200">
              Modèle : {template.icon} {template.name}
            </span>
            <a
              href="/admin/nouveau"
              className="text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            >
              Changer de modèle
            </a>
          </div>
          <AdminArticleForm template={template} />
        </>
      ) : (
        <TemplateGallery />
      )}
    </div>
  );
}
