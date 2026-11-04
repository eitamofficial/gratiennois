import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { canWrite, getServerSession } from "@/lib/auth";
import { redirectToLogin } from "@/lib/redirects";
import PageHeader, { PageShell } from "@/components/PageHeader";
import ImportForm from "@/components/admin/ImportForm";

export const metadata: Metadata = { title: "Importer un texte" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const session = await getServerSession();
  if (!session) return redirectToLogin("/admin/import");
  if (!canWrite(session)) redirect("/admin");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Reprise"
        icon="📥"
        title="Importer un texte"
        aside={
          <Link href="/admin" className="text-xs text-bronze-300 hover:text-gold-200">
            ← Tableau de bord
          </Link>
        }
      >
        <p>
          Collez un texte Markdown pour en faire un article. L&apos;import ne
          remplace jamais une page existante : si l&apos;adresse est déjà prise,
          il refuse et vous laisse décider.
        </p>
      </PageHeader>

      <ImportForm />
    </PageShell>
  );
}
