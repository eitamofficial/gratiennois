"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PollForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [message, setMessage] = useState<string | null>(null);

  async function envoyer(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch("/api/features/polls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, options: options.filter(Boolean) }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Refusé.");
      return;
    }
    setQuestion("");
    setOptions(["", ""]);
    setMessage("Sondage ouvert.");
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="space-y-3 rounded-xl border border-night-600 bg-night-800/40 p-4">
      <h2 className="font-display text-lg text-gold-200">Ouvrir un sondage</h2>
      <input
        required
        minLength={5}
        maxLength={300}
        placeholder="Question posée"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="w-full rounded-lg border border-night-500 bg-night-900 px-3 py-2 text-sm text-slate-200"
      />
      {options.map((option, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={option}
            maxLength={120}
            placeholder={`Option ${index + 1}`}
            onChange={(event) => {
              const copie = [...options];
              copie[index] = event.target.value;
              setOptions(copie);
            }}
            className="flex-1 rounded-lg border border-night-500 bg-night-900 px-3 py-2 text-sm text-slate-200"
          />
          {options.length > 2 && (
            <button
              type="button"
              onClick={() => setOptions(options.filter((_, i) => i !== index))}
              className="rounded-lg border border-night-500 px-3 text-xs text-slate-400"
            >
              Retirer
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {options.length < 8 && (
          <button
            type="button"
            onClick={() => setOptions([...options, ""])}
            className="rounded-lg border border-night-500 px-3 py-1.5 text-xs text-slate-300"
          >
            + option
          </button>
        )}
        <button
          type="submit"
          className="rounded-lg border border-gold-500 bg-gold-500/10 px-4 py-2 text-sm font-medium text-gold-200"
        >
          Ouvrir
        </button>
        {message && <span className="text-xs text-slate-400">{message}</span>}
      </div>
    </form>
  );
}
