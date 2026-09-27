"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RestoreRevisionButton({
  slug,
  revisionId,
  createdAt,
}: {
  slug: string;
  revisionId: string;
  createdAt: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRestore() {
    const confirmed = window.confirm(
      `Restaurer l'article tel qu'il était à la révision du ${new Date(createdAt).toLocaleString("fr-FR")} ?\n\nLa restauration sera enregistrée dans l'historique.`,
    );
    if (!confirmed) return;

    setPending(true);
    try {
      const response = await fetch(
        `/api/articles/${slug}/revisions/${revisionId}/restore`,
        { method: "POST" },
      );
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json().catch(() => null);
        window.alert(data?.error ?? "Restauration impossible.");
      }
    } catch {
      window.alert("Erreur réseau — réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRestore}
      disabled={pending}
      className="rounded-md border border-violet-500/40 px-3 py-3 text-xs font-medium text-violet-300 transition hover:bg-violet-500/10 disabled:opacity-60"
    >
      {pending ? "Restauration…" : "Restaurer"}
    </button>
  );
}
