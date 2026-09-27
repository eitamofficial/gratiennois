import type { Revision, RevisionAction } from "@/lib/types";
import { formatDateTime } from "@/lib/constants";

const ACTION_LABELS: Record<RevisionAction, { label: string; className: string }> = {
  create: { label: "Création", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  update: { label: "Modification", className: "bg-sky-500/10 text-sky-300 border-sky-500/30" },
  delete: { label: "Suppression", className: "bg-red-500/10 text-red-300 border-red-500/30" },
  restore: { label: "Restauration", className: "bg-violet-500/10 text-violet-300 border-violet-500/30" },
};

/** Historique public : qui a modifié quoi et quand (métadonnées uniquement). */
export default function RevisionTimeline({ revisions }: { revisions: Revision[] }) {
  if (revisions.length === 0) return null;

  return (
    <section aria-labelledby="historique" className="mt-14 border-t border-night-600 pt-8">
      <h2 id="historique" className="mb-4 font-display text-xl font-semibold text-gold-300">
        Historique des révisions
      </h2>
      <ol className="space-y-3">
        {revisions.map((revision) => {
          const action = ACTION_LABELS[revision.action] ?? ACTION_LABELS.update;
          return (
            <li key={revision.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${action.className}`}
              >
                {action.label}
              </span>
              <span className="text-slate-300">{revision.author}</span>
              <span className="text-xs text-slate-400">{formatDateTime(revision.createdAt)}</span>
              {revision.action === "update" && revision.snapshot.title && (
                <span className="text-xs text-slate-400">« {revision.snapshot.title} »</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
