"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CATEGORY_LIST } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import type { Article, ArticleInfobox, Category } from "@/lib/types";
import AnalysisPanel from "./AnalysisPanel";
import InfoboxEditor from "./InfoboxEditor";

interface Props {
  article?: Article;
}

/** Formulaire partagé par la création (/admin/nouveau) et l'édition (/admin/[slug]/modifier). */
export default function AdminArticleForm({ article }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [category, setCategory] = useState(article?.category ?? "histoire");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [tags, setTags] = useState(article?.tags.join(", ") ?? "");
  const [discordUserId, setDiscordUserId] = useState(article?.discordUserId ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [infobox, setInfobox] = useState<ArticleInfobox | undefined>(article?.infobox);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const previewSlug = useMemo(() => slugify(title) || "(slug automatique)", [title]);
  const tagList = useMemo(
    () => tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    [tags],
  );

  function addTag(tag: string) {
    if (tagList.includes(tag)) return;
    setTags([...tagList, tag].join(", "));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        article ? `/api/articles/${article.slug}` : "/api/articles",
        {
          method: article ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            category,
            summary,
            content,
            discordUserId,
            tags: tagList,
            // `undefined` n'est pas sérialisé : le serveur garde alors
            // l'infobox automatique de l'article.
            infobox,
          }),
        },
      );

      const data = await response.json().catch(() => null);
      if (response.ok) {
        router.push(`/wiki/${data.article?.slug ?? previewSlug}`);
        router.refresh();
        return;
      }
      setError(data?.error ?? "Enregistrement impossible.");
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-night-500 bg-night-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-gold-500/60 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-300">Titre *</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className={inputClass} />
          <p className="mt-1 text-xs text-slate-400">Slug généré : <code className="text-bronze-300">/wiki/{previewSlug}</code></p>
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-300">Catégorie *</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className={inputClass}>
            {CATEGORY_LIST.map((item) => (
              <option key={item.id} value={item.id}>{item.icon} {item.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tags" className="mb-1 block text-sm font-medium text-slate-300">Tags (séparés par des virgules)</label>
          <input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="histoire, charte" className={inputClass} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="discordUserId" className="mb-1 block text-sm font-medium text-slate-300">
            ID utilisateur Discord <span className="text-slate-400">(personnalités — optionnel)</span>
          </label>
          <input
            id="discordUserId"
            value={discordUserId}
            onChange={(e) => setDiscordUserId(e.target.value)}
            placeholder="Ex. 123456789012345678 — ou laissez vide pour résolution automatique par nom"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-400">
            Mode développeur Discord → clic droit sur le membre → « Copier l&apos;identifiant ».
            La synchronisation peut aussi résoudre automatiquement l&apos;ID à partir du nom.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="mb-1 block text-sm font-medium text-slate-300">Résumé *</label>
        <textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} required rows={2} maxLength={300} className={inputClass} />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="content" className="text-sm font-medium text-slate-300">Contenu (Markdown) *</label>
          <button
            type="button"
            onClick={() => setShowPreview((value) => !value)}
            className="rounded border border-night-500 px-3 py-3 text-xs text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
          >
            {showPreview ? "Masquer l'aperçu" : "Aperçu brut"}
          </button>
        </div>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={16}
          className={`${inputClass} font-mono leading-6`}
          placeholder={"# Titre\n\n## Section\n\nDu texte en **gras**…"}
        />
        {showPreview && (
          <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-night-500 bg-night-950 p-3 text-xs text-slate-400">{content}</pre>
        )}
      </div>

      <details className="rounded-lg border border-night-600 bg-night-900/50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200">
          📋 Boîte d&apos;informations (infobox)
          <span className="ml-2 text-xs font-normal text-slate-400">
            encadré de synthèse affiché à droite de l&apos;article
          </span>
        </summary>
        <div className="border-t border-night-600 px-4 py-4">
          <InfoboxEditor value={infobox} onChange={setInfobox} />
        </div>
      </details>

      <details className="rounded-lg border border-night-600 bg-night-900/50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200">
          🧭 Assistant de rédaction
          <span className="ml-2 text-xs font-normal text-slate-400">
            statistiques, contrôle qualité, suggestions
          </span>
        </summary>
        <div className="border-t border-night-600 px-4 py-4">
          <AnalysisPanel
            title={title}
            slug={article?.slug}
            summary={summary}
            content={content}
            tags={tagList}
            category={category as Category}
            onAddTag={addTag}
            onSetCategory={(value) => setCategory(value)}
          />
        </div>
      </details>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : article ? "Enregistrer les modifications" : "Publier l'article"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-night-500 px-4 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
