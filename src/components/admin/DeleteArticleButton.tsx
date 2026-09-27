"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteArticleButton({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${title} » ?\n\nCette action est irréversible.`,
    );
    if (!confirmed) return;

    setPending(true);
    try {
      const response = await fetch(`/api/articles/${slug}`, { method: "DELETE" });
      if (response.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await response.json().catch(() => null);
        window.alert(data?.error ?? "Suppression impossible.");
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
      onClick={handleDelete}
      disabled={pending}
      className="rounded-md border border-red-500/40 px-3 py-3 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-60"
    >
      {pending ? "Suppression…" : "Supprimer"}
    </button>
  );
}
