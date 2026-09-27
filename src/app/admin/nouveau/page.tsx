import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import AdminArticleForm from "@/components/admin/AdminArticleForm";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Nouvel article",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const session = await getServerSession();
  if (!session) redirect("/connexion?next=/admin/nouveau");

  return (
    <div className="mx-auto max-w-3xl">
      <MobileNav />
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
          Espace d&apos;édition
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200">
          Nouvel article
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Rédigez un nouvel article du wiki. Le corps supporte la syntaxe Markdown.
        </p>
      </header>
      <AdminArticleForm />
    </div>
  );
}
