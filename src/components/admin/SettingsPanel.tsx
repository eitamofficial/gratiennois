"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Réglages généraux : lecture seule d'urgence et bandeau d'annonce.
 *
 * Le mode lecture seule est un interrupteur d'urgence, pas une préférence : il
 * coupe toute écriture, quel que soit le rôle, sans redéploiement.
 */
export default function SettingsPanel({
  readOnly,
  readOnlyReason,
  banner,
}: {
  readOnly: boolean;
  readOnlyReason: string;
  banner: string;
}) {
  const router = useRouter();
  const [lectureSeule, setLectureSeule] = useState(readOnly);
  const [raison, setRaison] = useState(readOnlyReason);
  const [annonce, setAnnonce] = useState(banner);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer(patch: Record<string, unknown>) {
    setMessage(null);
    const response = await fetch("/api/features/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Refusé.");
      return;
    }
    setMessage("Enregistré.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-night-500 p-3">
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={lectureSeule}
            onChange={(event) => setLectureSeule(event.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          Mode lecture seule
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Aucune écriture n&apos;est acceptée, y compris du Dauphin. À utiliser en
          cas d&apos;attaque ou de migration.
        </p>
        <input
          value={raison}
          onChange={(event) => setRaison(event.target.value)}
          placeholder="Raison affichée publiquement"
          className="mt-2 w-full rounded-md border border-night-500 bg-night-900 px-2 py-1.5 text-xs text-slate-200"
        />
        <button
          type="button"
          onClick={() => enregistrer({ readOnly: lectureSeule, readOnlyReason: raison })}
          className="mt-2 rounded-md border border-gold-500 px-3 py-1 text-xs text-gold-200"
        >
          Appliquer
        </button>
      </div>

      <div className="rounded-lg border border-night-500 p-3">
        <label className="text-sm text-slate-200">Bandeau d&apos;annonce</label>
        <input
          value={annonce}
          onChange={(event) => setAnnonce(event.target.value)}
          placeholder="Vide = aucun bandeau"
          className="mt-2 w-full rounded-md border border-night-500 bg-night-900 px-2 py-1.5 text-xs text-slate-200"
        />
        <button
          type="button"
          onClick={() => enregistrer({ banner: annonce })}
          className="mt-2 rounded-md border border-gold-500 px-3 py-1 text-xs text-gold-200"
        >
          Publier
        </button>
      </div>

      {message && <p className="text-xs text-slate-400">{message}</p>}
    </div>
  );
}
