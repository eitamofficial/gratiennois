import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getArticleBySlug } from "@/lib/articles-store";
import AdminArticleForm from "@/components/admin/AdminArticleForm";
import MobileNav from "@/components/MobileNav";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Modifier l'article",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: Props) {
  const session = await getServerSession();
  const { slug } = await params;
  if (!session) redirect(`/connexion?next=/admin/${slug}/modifier`);

  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <MobileNav />
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
          Espace d&apos;édition
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200">
          Modifier : {article.title}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Le slug reste inchangé (<code className="text-bronze-300">/wiki/{article.slug}</code>)
          afin de préserver les liens existants.
        </p>
      </header>
      <AdminArticleForm article={article} />
    </div>
  );
}
