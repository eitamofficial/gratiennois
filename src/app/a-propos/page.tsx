import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedArticles, getRecentRevisions, storageName } from "@/lib/articles-store";
import { wikiStats } from "@/lib/analysis";
import { formatDate, formatDateTime, SITE } from "@/lib/constants";
import PageHeader, { PageShell } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "À propos",
  description: "Ce que contient le wiki, comment il fonctionne, et comment en sortir les données.",
};

export const dynamic = "force-dynamic";

export default async function AProposPage() {
  const [articles, revisions] = await Promise.all([
    getPublishedArticles(),
    getRecentRevisions(1),
  ]);
  const stats = wikiStats(articles);

  const chiffres = [
    { label: "Articles publiés", value: stats.articles },
    { label: "Mots rédigés", value: stats.words.toLocaleString("fr-FR") },
    { label: "Sources citées", value: stats.sources },
    { label: "Articles sourcés", value: `${stats.withSources} / ${stats.articles}` },
    { label: "Complétude moyenne", value: `${stats.averageCompleteness} %` },
    { label: "Articles protégés", value: stats.protectedCount },
    { label: "Articles de qualité", value: stats.qualityCount },
  ];

  return (
    <PageShell>
      <PageHeader eyebrow="Documentation" icon="ℹ️" title="À propos du wiki">
        <p>
          {SITE.name} — encyclopédie officielle, écrite et relue par ses
          contributeurs. Aucun contenu n&apos;est généré automatiquement sans
          relecture : une proposition de l&apos;IA reste invisible tant qu&apos;un
          humain ne l&apos;a pas validée.
        </p>
      </PageHeader>

      <section>
        <h2 className="font-display text-xl font-semibold text-gold-200">Le wiki en chiffres</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {chiffres.map((chiffre) => (
            <div
              key={chiffre.label}
              className="rounded-xl border border-night-600 bg-night-800/40 p-3"
            >
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">{chiffre.label}</dt>
              <dd className="mt-1 font-display text-2xl text-gold-200">{chiffre.value}</dd>
            </div>
          ))}
        </dl>
        {stats.lastUpdate && (
          <p className="mt-2 text-xs text-slate-500">
            Dernière écriture : {formatDateTime(stats.lastUpdate)}
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-gold-200">Emporter les données</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Le contenu n&apos;est pas enfermé ici. Trois formats sont produits à la
          demande, sans passer par un compte.
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            {
              href: "/api/export/epub",
              titre: "EPUB",
              detail: "Le wiki entier en livre, lisible hors ligne sur une liseuse.",
            },
            {
              href: "/api/export/mediawiki",
              titre: "XML MediaWiki",
              detail: "Portabilité vers un MediaWiki : pages, historique, liens convertis.",
            },
            {
              href: "/api/v1/articles",
              titre: "API REST",
              detail: "JSON paginé, ETag, filtre par catégorie et par date.",
            },
          ].map((lien) => (
            <li key={lien.href}>
              <Link
                href={lien.href}
                className="block h-full rounded-xl border border-night-600 bg-night-800/40 p-3 hover:border-gold-500"
              >
                <span className="font-medium text-gold-200">{lien.titre}</span>
                <span className="mt-1 block text-xs text-slate-400">{lien.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Le dump JSON complet (articles et historique) demande une connexion avec
          accès complet.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-gold-200">Comment il fonctionne</h2>
        <dl className="mt-3 space-y-2 text-sm text-slate-400">
          <div className="flex gap-2">
            <dt className="w-40 shrink-0 text-slate-500">Stockage</dt>
            <dd>{storageName() === "json" ? "fichiers JSON locaux, écriture atomique" : "PostgreSQL"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 shrink-0 text-slate-500">Historique</dt>
            <dd>
              {revisions.length > 0
                ? `dernière révision le ${formatDate(revisions[0].createdAt)}`
                : "aucune révision enregistrée"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 shrink-0 text-slate-500">Écriture</dt>
            <dd>réservée aux charges prévues par la Constitution, en double authentification</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 shrink-0 text-slate-500">Flux</dt>
            <dd>
              <Link href="/atom.xml" className="text-bronze-300 hover:text-gold-200">
                Atom — modifications
              </Link>
            </dd>
          </div>
        </dl>
      </section>
    </PageShell>
  );
}
