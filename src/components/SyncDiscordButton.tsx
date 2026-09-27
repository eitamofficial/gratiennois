"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SyncSummary {
  ok: boolean;
  source: string;
  fetchedAt: string;
  guild: { name: string; memberCount: number | null; onlineCount: number | null } | null;
  membersFetched: number;
  rolesFetched: number;
  errors: string[];
  resolved: Array<{ slug: string; name: string }>;
  unresolved: Array<{ slug: string; name: string; reason: string }>;
}

export default function SyncDiscordButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setPending(true);
    setError(null);
    setSummary(null);
    try {
      const response = await fetch("/api/sync/discord", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Synchronisation impossible.");
      } else {
        setSummary(data as SyncSummary);
        router.refresh();
      }
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-night-600 bg-night-800/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-100">Synchronisation Discord</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Récupère les données réelles du serveur (API Discord) et relie les profils des
            personnalités.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={pending || disabled}
          className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-night-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Synchronisation…" : "Synchroniser maintenant"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {summary && (
        <div className="mt-3 space-y-1.5 rounded-md border border-night-500 bg-night-900/70 p-3 text-xs text-slate-400">
          <p>
            <span className="text-emerald-300">✓</span> Serveur :{" "}
            <span className="text-slate-200">{summary.guild?.name ?? "inconnu"}</span>
            {summary.guild?.memberCount != null && <> — {summary.guild.memberCount} membres</>}
            {summary.guild?.onlineCount != null && <> ({summary.guild.onlineCount} en ligne)</>}
            {" — "}source : {summary.source}
          </p>
          <p>{summary.membersFetched} membres · {summary.rolesFetched} rôles récupérés.</p>
          {summary.resolved.length > 0 && (
            <p>
              Profils reliés :{" "}
              {summary.resolved.map((item) => item.name).join(", ")}
            </p>
          )}
          {summary.unresolved.map((item) => (
            <p key={item.slug} className="text-amber-300/90">
              ⚠ {item.name} : {item.reason}
            </p>
          ))}
          {summary.errors.map((message) => (
            <p key={message} className="text-amber-300/90">⚠ {message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
