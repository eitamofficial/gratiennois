"use client";

import { useEffect, useMemo, useState } from "react";
import { diffLines, diffStats, groupDiff } from "@/lib/diff";
import type { Revision } from "@/lib/types";
import { formatDateTime } from "@/lib/constants";
import RestoreRevisionButton from "./RestoreRevisionButton";

interface RevisionMeta {
  id: string;
  action: Revision["action"];
  author: string;
  createdAt: string;
}

const ACTION_LABELS: Record<Revision["action"], string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  restore: "Restauration",
};

function useRevisionContent(slug: string, revisionId: string | null) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!revisionId) {
      setContent(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/articles/${slug}/revisions/${revisionId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Révision introuvable.");
        const data = await response.json();
        setContent(data.revision?.snapshot?.content ?? "");
      })
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError") setError((caught as Error).message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [slug, revisionId]);

  return { content, loading, error };
}

/**
 * Comparateur de versions : diff ligne à ligne, avec surlignage mot à mot
 * à l'intérieur des zones modifiées, et restauration possible côté admin.
 */
export default function RevisionCompare({
  slug,
  revisions,
  canRestore,
}: {
  slug: string;
  revisions: RevisionMeta[];
  canRestore: boolean;
}) {
  const [baseId, setBaseId] = useState<string>(revisions[1]?.id ?? revisions[0].id);
  const [targetId, setTargetId] = useState<string>(revisions[0].id);

  const base = useRevisionContent(slug, baseId);
  const target = useRevisionContent(slug, targetId);

  const groups = useMemo(() => {
    if (base.content === null || target.content === null) return null;
    return groupDiff(diffLines(base.content, target.content));
  }, [base.content, target.content]);

  const stats = useMemo(() => {
    if (base.content === null || target.content === null) return null;
    return diffStats(diffLines(base.content, target.content));
  }, [base.content, target.content]);

  const loading = base.loading || target.loading;

  if (revisions.length < 2) {
    return (
      <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
        Une seule version enregistrée pour le moment. La comparaison apparaîtra dès la
        première modification.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <label className="block text-xs text-slate-400">
          Version de référence
          <select
            value={baseId}
            onChange={(event) => setBaseId(event.target.value)}
            className="mt-1 w-full rounded-md border border-night-500 bg-night-800 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/60 focus:outline-none"
          >
            {revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                {formatDateTime(revision.createdAt)} — {ACTION_LABELS[revision.action]} —{" "}
                {revision.author}
              </option>
            ))}
          </select>
        </label>

        <span aria-hidden className="hidden pb-2 text-slate-400 sm:block">
          →
        </span>

        <label className="block text-xs text-slate-400">
          Version comparée
          <select
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="mt-1 w-full rounded-md border border-night-500 bg-night-800 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/60 focus:outline-none"
          >
            {revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                {formatDateTime(revision.createdAt)} — {ACTION_LABELS[revision.action]} —{" "}
                {revision.author}
              </option>
            ))}
          </select>
        </label>
      </div>

      {baseId === targetId && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Les deux versions sélectionnées sont identiques : choisissez deux révisions
          différentes.
        </p>
      )}

      {stats && baseId !== targetId && (
        <p className="text-xs text-slate-400">
          <span className="text-emerald-400">+{stats.added}</span> ligne
          {stats.added > 1 ? "s" : ""} ajoutée{stats.added > 1 ? "s" : ""} ·{" "}
          <span className="text-red-400">−{stats.removed}</span> ligne
          {stats.removed > 1 ? "s" : ""} supprimée{stats.removed > 1 ? "s" : ""} ·{" "}
          {stats.unchanged} ligne{stats.unchanged > 1 ? "s" : ""} inchangée
          {stats.unchanged > 1 ? "s" : ""}
        </p>
      )}

      {(base.error || target.error) && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {base.error ?? target.error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-night-600 bg-night-950/60">
        {loading || !groups ? (
          <p className="px-4 py-6 text-sm text-slate-400">Comparaison en cours…</p>
        ) : (
          <pre className="whitespace-pre-wrap px-4 py-3 font-mono text-[13px] leading-6">
            {groups.map((group, index) =>
              group.kind === "equal" ? (
                <span key={index} className="block text-slate-400">
                  {group.chunks.map((chunk) => chunk.text).join("\n")}
                </span>
              ) : (
                <span key={index} className="my-1 block rounded bg-night-800/60 px-2 py-1">
                  {group.wordChunks.map((chunk, chunkIndex) => {
                    if (chunk.kind === "added") {
                      return (
                        <ins
                          key={chunkIndex}
                          className="bg-emerald-500/20 text-emerald-200 no-underline"
                        >
                          {chunk.text}
                        </ins>
                      );
                    }
                    if (chunk.kind === "removed") {
                      return (
                        <del key={chunkIndex} className="bg-red-500/20 text-red-300">
                          {chunk.text}
                        </del>
                      );
                    }
                    return (
                      <span key={chunkIndex} className="text-slate-400">
                        {chunk.text}
                      </span>
                    );
                  })}
                </span>
              ),
            )}
          </pre>
        )}
      </div>

      {canRestore && baseId !== targetId && (
        <div className="flex items-center justify-end">
          <RestoreRevisionButton
            slug={slug}
            revisionId={targetId}
            createdAt={revisions.find((revision) => revision.id === targetId)?.createdAt ?? ""}
          />
        </div>
      )}
    </div>
  );
}
