"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Formulaire de commentaire.
 *
 * Il ne fait qu'une chose : envoyer le texte, puis demander au serveur de
 * redessiner le fil. Pas de liste locale à synchroniser, pas d'optimisme
 * d'affichage — le commentaire apparaît quand il est réellement enregistré.
 * Sur une tablette qui peut perdre le réseau une seconde, mieux vaut un léger
 * délai qu'un message affiché puis disparu.
 */
export default function CommentForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() || pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content }),
      });

      if (response.ok) {
        setContent("");
        router.refresh();
        return;
      }

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Le commentaire n'a pas pu être envoyé.");
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4">
      {error && (
        <p role="alert" className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <label htmlFor="commentaire" className="sr-only">
        Votre commentaire
      </label>
      <textarea
        id="commentaire"
        name="commentaire"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Partager une précision, une source, un désaccord argumenté…"
        className="w-full resize-y rounded-lg border border-night-500 bg-night-900/80 px-3 py-2.5 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-gold-500/60 focus:outline-none"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {content.length}/2000 caractères · visible publiquement
        </p>
        <button
          type="submit"
          disabled={pending || !content.trim()}
          className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-night-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Envoi…" : "Publier"}
        </button>
      </div>
    </form>
  );
}
