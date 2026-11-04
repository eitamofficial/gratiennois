"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportForm() {
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function envoyer(event: React.FormEvent) {
    event.preventDefault();
    setEnvoi(true);
    setMessage(null);
    try {
      const response = await fetch("/api/import/markdown", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown: texte }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Import refusé.");
        return;
      }
      router.push(`/wiki/${data.article.slug}`);
      router.refresh();
    } catch {
      setMessage("Réseau indisponible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={envoyer} className="space-y-3">
      <label htmlFor="markdown" className="block text-sm text-slate-300">
        Texte Markdown
      </label>
      <p className="text-xs text-slate-500">
        En-tête facultatif : <code className="text-bronze-300">---</code> puis{" "}
        <code className="text-bronze-300">title:</code>, <code className="text-bronze-300">category:</code>,{" "}
        <code className="text-bronze-300">tags:</code>, <code className="text-bronze-300">summary:</code>. Sans
        en-tête, le premier <code className="text-bronze-300"># Titre</code> sert de titre et le premier
        paragraphe de chapeau.
      </p>
      <textarea
        id="markdown"
        required
        rows={18}
        value={texte}
        onChange={(event) => setTexte(event.target.value)}
        placeholder={"---\ntitle: La guerre de 1998\ncategory: histoire\ntags: guerre, 1998\n---\n\n# La guerre de 1998\n\nLe récit commence…"}
        className="w-full rounded-lg border border-night-500 bg-night-800 px-3 py-2 font-mono text-sm leading-6 text-slate-100"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-md border border-gold-500 bg-gold-500/10 px-4 py-2 text-sm font-medium text-gold-200 disabled:opacity-50"
        >
          {envoi ? "Import…" : "Importer"}
        </button>
        <span className="text-xs text-slate-500">
          {texte.length.toLocaleString("fr-FR")} caractères
        </span>
        {message && <span className="text-xs text-rose-300">{message}</span>}
      </div>
    </form>
  );
}
