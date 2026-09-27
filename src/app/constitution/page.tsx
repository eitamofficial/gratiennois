import Link from "next/link";
import type { Metadata } from "next";
import PdfPreview from "@/components/PdfPreview";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Constitution officielle",
  description:
    "Aperçu du document officiel Constitution et Hiérarchie du IIIe Delphinat Gratiennois, créé par Esto le 26/09/26.",
};

export const dynamic = "force-static";

export default function ConstitutionPage() {
  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="border-b border-night-600 pb-6">
        <p className="text-sm text-slate-400">
          <Link href="/wiki" className="transition hover:text-gold-200">
            Wiki
          </Link>{" "}
          / Textes officiels
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-gold-200 sm:text-4xl">
          Constitution et Hiérarchie du IIIe Delphinat Gratiennois
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Document officiel du IIIe Delphinat, créé par <strong className="text-slate-300">Esto</strong>{" "}
          le 26/09/26 — version finale éditée le 26/09/26. Le PDF ci-dessous fait foi ;
          sa transcription intégrale est reprise dans le wiki pour permettre la recherche
          et le suivi des versions.
        </p>
      </header>

      <PdfPreview
        src="/Constitution.pdf"
        title="Constitution et Hiérarchie du IIIe Delphinat Gratiennois"
        downloadName="Constitution-IIIe-Delphinat.pdf"
      />

      <section className="rounded-xl border border-gold-500/30 bg-night-800/60 p-5">
        <h2 className="font-display text-lg font-semibold text-gold-300">
          Version consultable et comparable
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          L&apos;article du wiki reprend le texte intégral (hiérarchie de l&apos;article
          P-1, articles P-2 à P-17) et conserve chaque version publiée : vous pouvez
          comparer deux versions pour voir exactement ce qui a changé.
        </p>
        <p className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/wiki/la-constitution"
            className="rounded-md bg-gold-500 px-4 py-3 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
          >
            Lire la transcription
          </Link>
          <Link
            href="/wiki/la-constitution/versions"
            className="rounded-md border border-gold-500/50 px-4 py-3 text-sm text-gold-200 transition hover:bg-gold-500/10"
          >
            Comparer les versions
          </Link>
        </p>
      </section>
    </div>
  );
}
