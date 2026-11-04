"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Bouton de suppression d'un commentaire (auteur ou Dauphin). */
export default function DeleteCommentButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="text-xs text-slate-500 transition hover:text-red-300 disabled:opacity-50"
      aria-label="Supprimer ce commentaire"
    >
      {pending ? "…" : "Supprimer"}
    </button>
  );
}
