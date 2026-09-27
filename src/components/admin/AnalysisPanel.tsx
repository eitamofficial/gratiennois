"use client";

import { useEffect, useState } from "react";
import type { AnalysisResult } from "@/lib/text-analysis";
import { CATEGORY_INFO } from "@/lib/constants";
import type { Category } from "@/lib/types";

/**
 * Panneau d'analyse du brouillon : statistiques, contrôle qualité, suggestions
 * de catégorie et de tags, détection de doublons et de liens cassés.
 */
export default function AnalysisPanel({
  title,
  slug,
  summary,
  content,
  tags,
  category,
  onAddTag,
  onSetCategory,
}: {
  title: string;
  slug?: string;
  summary: string;
  content: string;
  tags: string[];
  category: Category;
  onAddTag: (tag: string) => void;
  onSetCategory: (category: Category) => void;
}) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (content.trim().length < 40 && title.trim().length < 3) {
      setAnalysis(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, slug, summary, content, tags, category }),
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data.analysis);
        }
      } catch {
        /* requête annulée */
      } finally {
        setLoading(false);
      }
    }, 900);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title, slug, summary, content, tags, category]);

  if (!analysis) {
    return (
      <p className="text-xs text-slate-400">
        {loading ? "Analyse en cours…" : "Commencez à rédiger : l'assistant analysera le texte."}
      </p>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-night-600 px-2.5 py-0.5">
          {analysis.words} mots
        </span>
        <span className="rounded-full border border-night-600 px-2.5 py-0.5">
          ~{analysis.readingMinutes} min de lecture
        </span>
        <span className="rounded-full border border-night-600 px-2.5 py-0.5">
          {analysis.headings} titres
        </span>
        {loading && <span className="text-slate-400">actualisation…</span>}
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-bronze-400">
          Contrôle qualité
        </h2>
        <ul className="space-y-1">
          {analysis.checklist.map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-xs">
              <span aria-hidden className={item.ok ? "text-emerald-400" : "text-amber-400"}>
                {item.ok ? "✓" : "•"}
              </span>
              <span className={item.ok ? "text-slate-400" : "text-amber-200"}>
                {item.label}
                <span className="ml-2 text-slate-400">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {analysis.suggestedCategory.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-bronze-400">
            Catégorie suggérée
          </h2>
          <p className="flex flex-wrap gap-2">
            {analysis.suggestedCategory.map((item) => (
              <button
                key={item.category}
                type="button"
                onClick={() => onSetCategory(item.category)}
                className="rounded-full border border-night-500 px-3 py-3 text-xs text-slate-200 transition hover:border-gold-500/50"
              >
                {CATEGORY_INFO[item.category].icon} {CATEGORY_INFO[item.category].label}
                <span className="ml-1 text-slate-400">{item.score}</span>
              </button>
            ))}
          </p>
        </section>
      )}

      {analysis.suggestedTags.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-bronze-400">
            Tags suggérés
          </h2>
          <p className="flex flex-wrap gap-2">
            {analysis.suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onAddTag(tag)}
                className="rounded-full border border-night-500 px-3 py-3 text-xs text-bronze-200 transition hover:border-gold-500/50"
              >
                + {tag}
              </button>
            ))}
          </p>
        </section>
      )}

      {analysis.duplicates.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-bronze-400">
            Articles proches
          </h2>
          <ul className="space-y-1 text-xs text-slate-400">
            {analysis.duplicates.map((duplicate) => (
              <li key={duplicate.slug}>
                <a href={`/wiki/${duplicate.slug}`} className="text-gold-300 hover:underline">
                  {duplicate.title}
                </a>{" "}
                — {Math.round(duplicate.similarity * 100)} % de texte commun
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.brokenLinks.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-bronze-400">
            Liens internes à corriger
          </h2>
          <p className="text-xs text-amber-300">
            {analysis.brokenLinks.join(", ")} — article inexistant référencé.
          </p>
        </section>
      )}

      {analysis.summary && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-bronze-400">
            Résumé extractif proposé
          </h2>
          <p className="rounded-md border border-night-600 bg-night-900/60 p-3 text-xs leading-relaxed text-slate-400">
            {analysis.summary}
          </p>
        </section>
      )}
    </div>
  );
}
