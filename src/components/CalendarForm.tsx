"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Ajout d'une date au calendrier.
 *
 * Le formulaire ne s'affiche qu'aux charges qui écrivent, mais la route vérifie
 * de son côté : un composant masqué n'est pas un contrôle d'accès.
 */
export default function CalendarForm() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("institution");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function envoyer(event: React.FormEvent) {
    event.preventDefault();
    setEnvoi(true);
    setMessage(null);
    try {
      const response = await fetch("/api/features/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, title, kind, description }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Enregistrement refusé.");
        return;
      }
      setTitle("");
      setDescription("");
      setMessage("Date ajoutée.");
      router.refresh();
    } catch {
      setMessage("Réseau indisponible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form
      onSubmit={envoyer}
      className="space-y-3 rounded-xl border border-night-600 bg-night-800/40 p-4"
    >
      <h2 className="font-display text-lg text-gold-200">Ajouter une date</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-400">
          Date
          <input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-night-500 bg-night-900 px-3 py-2 text-sm text-slate-200"
          />
        </label>
        <label className="text-xs text-slate-400 sm:col-span-2">
          Intitulé
          <input
            required
            minLength={2}
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-lg border border-night-500 bg-night-900 px-3 py-2 text-sm text-slate-200"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-400">
          Nature
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="mt-1 w-full rounded-lg border border-night-500 bg-night-900 px-3 py-2 text-sm text-slate-200"
          >
            <option value="institution">Institution</option>
            <option value="election">Élection</option>
            <option value="traite">Traité</option>
            <option value="culture">Culture</option>
            <option value="autre">Autre</option>
          </select>
        </label>
        <label className="text-xs text-slate-400 sm:col-span-2">
          Précision (facultatif)
          <input
            value={description}
            maxLength={800}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-lg border border-night-500 bg-night-900 px-3 py-2 text-sm text-slate-200"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-lg border border-gold-500 bg-gold-500/10 px-4 py-2 text-sm font-medium text-gold-200 disabled:opacity-50"
        >
          {envoi ? "Enregistrement…" : "Ajouter"}
        </button>
        {message && <span className="text-xs text-slate-400">{message}</span>}
      </div>
    </form>
  );
}
