import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import { gallery } from "@/lib/analysis";
import { categoryLabel } from "@/lib/constants";
import PageHeader, { PageShell } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Galerie",
  description: "Toutes les illustrations du wiki, avec leur crédit et leur page d'origine.",
};

export const dynamic = "force-dynamic";

export default async function GaleriePage() {
  const articles = await getPublishedArticles();
  const images = gallery(articles);

  return (
    <PageShell>
      <PageHeader eyebrow="Illustrations" icon="🖼️" title="Galerie">
        <p>
          Chaque image affichée dans une infobox apparaît ici, avec sa page
          d&apos;origine et son crédit. Une illustration sans provenance n&apos;est
          pas publiée : c&apos;est la même règle que pour les sources écrites.
        </p>
      </PageHeader>

      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          Aucune illustration pour le moment. Les images se déclarent dans
          l&apos;infobox d&apos;un article, champ « illustration ».
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <li
              key={`${image.slug}-${image.url}`}
              className="overflow-hidden rounded-xl border border-night-600 bg-night-800/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt}
                loading="lazy"
                className="h-44 w-full bg-night-900 object-contain"
              />
              <div className="space-y-1 p-3">
                <Link
                  href={`/wiki/${image.slug}`}
                  className="text-sm font-medium text-slate-200 hover:text-gold-200"
                >
                  {image.title}
                </Link>
                <p className="text-[11px] uppercase tracking-wide text-bronze-400">
                  {categoryLabel(image.category)}
                </p>
                {image.caption && <p className="text-xs text-slate-400">{image.caption}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
