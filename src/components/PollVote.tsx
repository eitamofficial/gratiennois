"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PollVote({ pollId, options }: { pollId: string; options: string[] }) {
  const router = useRouter();
  const [choix, setChoix] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function voter(option: string) {
    setChoix(option);
    setEnvoi(true);
    await fetch("/api/features/polls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pollId, option }),
    }).catch(() => undefined);
    setEnvoi(false);
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={envoi}
          onClick={() => voter(option)}
          className={`rounded-full border px-3 py-1 text-xs ${
            choix === option
              ? "border-gold-500 text-gold-200"
              : "border-night-500 text-slate-300 hover:border-gold-500"
          } disabled:opacity-50`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
