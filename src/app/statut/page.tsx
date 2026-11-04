import type { Metadata } from "next";
import { getPublishedArticles, getRecentRevisions, storageName } from "@/lib/articles-store";
import { getSettings } from "@/lib/features";
import { formatDateTime } from "@/lib/constants";
import PageHeader, { PageShell } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "État du service",
  description: "Disponibilité, stockage et dernière activité du wiki.",
};

export const dynamic = "force-dynamic";

export default async function StatutPage() {
  const debut = Date.now();
  const [articles, revisions, settings] = await Promise.all([
    getPublishedArticles(),
    getRecentRevisions(1),
    getSettings(),
  ]);
  const latence = Date.now() - debut;
  const dernier = revisions[0]?.createdAt ?? null;

  const indicateurs = [
    {
      label: "Disponibilité",
      valeur: "En ligne",
      detail: `Réponse du stockage en ${latence} ms`,
      ok: true,
    },
    {
      label: "Stockage",
      valeur: storageName() === "json" ? "JSON local" : "PostgreSQL",
      detail: `${articles.length} articles lisibles`,
      ok: true,
    },
    {
      label: "Écriture",
      valeur: settings.readOnly ? "Lecture seule" : "Ouverte",
      detail: settings.readOnly
        ? settings.readOnlyReason || "Interrupteur d'urgence activé"
        : "Les charges habilitées peuvent publier",
      ok: !settings.readOnly,
    },
    {
      label: "Dernière activité",
      valeur: dernier ? formatDateTime(dernier) : "—",
      detail: dernier ? "Dernière révision enregistrée" : "Aucune révision",
      ok: true,
    },
  ];

  return (
    <PageShell>
      <PageHeader eyebrow="Transparence" icon="📡" title="État du service">
        <p>
          Cette page est publique : elle indique ce que le site peut vérifier de
          lui-même. Elle ne remplace pas une supervision externe — une panne
          complète la rendrait inaccessible, ce qui est précisément le cas
          qu&apos;une sonde surveille.
        </p>
      </PageHeader>

      <ul className="grid gap-3 sm:grid-cols-2">
        {indicateurs.map((indicateur) => (
          <li
            key={indicateur.label}
            className="rounded-xl border border-night-600 bg-night-800/40 p-4"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${indicateur.ok ? "bg-emerald-400" : "bg-amber-400"}`}
              />
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                {indicateur.label}
              </span>
            </div>
            <p className="mt-1 text-lg font-medium text-slate-200">{indicateur.valeur}</p>
            <p className="text-xs text-slate-500">{indicateur.detail}</p>
          </li>
        ))}
      </ul>

      <section className="rounded-xl border border-night-600 bg-night-800/30 p-4 text-sm text-slate-400">
        <h2 className="font-display text-lg text-gold-200">Ce qui est surveillé</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>réponse HTTP du wiki toutes les cinq minutes, avec alerte en message privé Discord ;</li>
          <li>création quotidienne d&apos;une sauvegarde chiffrée, relue avant d&apos;être conservée ;</li>
          <li>rotation des archives sur quatorze jours, copie hors de la tablette.</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Détail technique : <code className="text-slate-300">deploy/termux/sonde-wiki</code> et{" "}
          <code className="text-slate-300">deploy/termux/sauvegarde</code>.
        </p>
      </section>
    </PageShell>
  );
}
