"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Bouton d'action générique.
 *
 * Il ne fait qu'une chose : envoyer une requête puis rafraîchir. Toutes les
 * décisions d'autorisation sont prises côté serveur — un bouton masqué n'a
 * jamais protégé quoi que ce soit.
 */
export default function ActionButton({
  url,
  method = "POST",
  body,
  label,
  confirmation,
  tone = "neutral",
}: {
  url: string;
  method?: "POST" | "DELETE";
  body?: unknown;
  label: string;
  confirmation?: string;
  tone?: "neutral" | "danger" | "primary";
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function agir() {
    if (confirmation && !window.confirm(confirmation)) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErreur(data.error ?? `Échec (${response.status})`);
        return;
      }
      router.refresh();
    } catch {
      setErreur("Réseau indisponible.");
    } finally {
      setEnvoi(false);
    }
  }

  const classes =
    tone === "danger"
      ? "border-rose-500/50 text-rose-200 hover:bg-rose-500/10"
      : tone === "primary"
        ? "border-gold-500 text-gold-200 hover:bg-gold-500/10"
        : "border-night-500 text-slate-300 hover:border-gold-500 hover:text-gold-200";

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={agir}
        disabled={envoi}
        className={`rounded-md border px-2.5 py-1 text-xs transition disabled:opacity-50 ${classes}`}
      >
        {envoi ? "…" : label}
      </button>
      {erreur && <span className="text-[11px] text-rose-300">{erreur}</span>}
    </span>
  );
}
