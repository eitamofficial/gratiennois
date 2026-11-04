import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import { categoryLabel } from "@/lib/constants";
import PageHeader, { PageShell } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Index alphabétique",
  description: "Toutes les pages du wiki, classées par ordre alphabétique.",
};

export const dynamic = "force-dynamic";

/** Lettre de classement : les accents ne doivent pas créer de sections fictives. */
function initiale(titre: string): string {
  const normalise = titre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const premiere = normalise.charAt(0);
  return /[A-Z]/.test(premiere) ? premiere : "#";
}

export default async function IndexPage() {
  const articles = await getPublishedArticles();
  const groupes = new Map<string, typeof articles>();

  for (const article of articles) {
    const lettre = initiale(article.title);
    const liste = groupes.get(lettre) ?? [];
    liste.push(article);
    groupes.set(lettre, liste);
  }

  const lettres = [...groupes.keys()].sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b, "fr");
  });

  for (const liste of groupes.values()) {
    liste.sort((a, b) => a.title.localeCompare(b.title, "fr"));
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Répertoire" icon="🔤" title="Index alphabétique">
        <p>
          Toutes les pages publiées, classées par leur première lettre. Les titres
          accentués sont rangés sous leur lettre non accentuée — « Élection » se
          trouve sous E, comme dans un dictionnaire.
        </p>
      </PageHeader>

      <nav aria-label="Sommaire alphabétique" className="flex flex-wrap gap-1.5">
        {lettres.map((lettre) => (
          <a
            key={lettre}
            href={`#lettre-${lettre === "#" ? "autre" : lettre}`}
            className="rounded-md border border-night-500 px-2.5 py-1 text-sm font-medium text-slate-300 hover:border-gold-500 hover:text-gold-200"
          >
            {lettre}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        {lettres.map((lettre) => (
          <section key={lettre} id={`lettre-${lettre === "#" ? "autre" : lettre}`} className="scroll-mt-24">
            <h2 className="mb-3 border-b border-night-600 pb-1 font-display text-2xl font-semibold text-gold-300">
              {lettre}
            </h2>
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {(groupes.get(lettre) ?? []).map((article) => (
                <li key={article.slug} className="text-sm">
                  <Link href={`/wiki/${article.slug}`} className="text-slate-200 hover:text-gold-200">
                    {article.title}
                  </Link>
                  <span className="ml-2 text-[11px] text-slate-500">
                    {categoryLabel(article.category)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-xs text-slate-500">{articles.length} pages publiées.</p>
    </PageShell>
  );
}
