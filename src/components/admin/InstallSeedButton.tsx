"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Report {
  created: string[];
  refreshed: string[];
  enriched: string[];
  protected: string[];
  unchanged: string[];
  version: number;
}

/**
 * Installation du jeu de données initial (réservée au Dauphin).
 *
 * Deux temps :
 *   - « Installer » publie les articles manquants et pose les infoboxes absentes ;
 *   - « Mettre à jour les textes » ne remplace le contenu que des articles que
 *     **personne n'a retouchés** depuis leur publication. Ceux que la rédaction a
 *     modifiés sont laissés intacts et listés comme protégés — la rédaction décide
 *     ensuite de les corriger à la main, dans l'historique de l'article.
 */
export default function InstallSeedButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleInstall(refresh: boolean) {
    setPending(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Installation impossible.");
      } else {
        setReport(data.report as Report);
        router.refresh();
      }
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-night-600 bg-night-800/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-100">
            Contenu officiel (version {report?.version ?? "—"})
          </p>
          <p className="mt-0.5 max-w-xl text-xs text-slate-400">
            Publie les articles de lancement manquants et pose les infoboxes absentes.
            La mise à jour des textes ne remplace que les articles que personne
            n&apos;a retouchés ; les autres restent protégés et sont listés ci-dessous.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleInstall(false)}
            disabled={pending || disabled}
            className="rounded-md border border-gold-500/50 px-4 py-2.5 text-sm font-medium text-gold-200 transition hover:bg-gold-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Traitement…" : "Installer"}
          </button>
          <button
            type="button"
            onClick={() => handleInstall(true)}
            disabled={pending || disabled}
            className="rounded-md border border-night-500 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mettre à jour les textes
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      {report && (
        <div className="mt-3 space-y-1.5 rounded-md border border-night-500 bg-night-900/70 p-3 text-xs text-slate-400">
          <p>
            <span className="text-emerald-300">✓</span> {report.created.length} créé(s),{" "}
            {report.refreshed.length} mis à jour, {report.enriched.length} infobox(es)
            posée(s), {report.unchanged.length} inchangé(s)
            {report.protected.length > 0 && (
              <>
                , <span className="text-amber-300">{report.protected.length} protégé(s)</span>
              </>
            )}
            .
          </p>
          {report.created.length > 0 && <p>Nouveaux : {report.created.join(", ")}</p>}
          {report.refreshed.length > 0 && (
            <p>Textes mis à jour : {report.refreshed.join(", ")}</p>
          )}
          {report.enriched.length > 0 && <p>Enrichis : {report.enriched.join(", ")}</p>}
          {report.protected.length > 0 && (
            <p className="text-amber-300">
              Protégés (modifiés par la rédaction, à mettre à jour à la main) :{" "}
              {report.protected.join(", ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
