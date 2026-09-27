"use client";

import { useEffect, useState } from "react";

/** Barre de progression de lecture + bouton « retour en haut » (articles longs). */
export default function ReadingProgress({ targetId }: { targetId?: string }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const article = targetId ? document.getElementById(targetId) : null;

    function onScroll() {
      const start = article ? article.offsetTop - 120 : 0;
      const end = article
        ? article.offsetTop + article.offsetHeight - window.innerHeight
        : document.body.scrollHeight - window.innerHeight;
      const total = Math.max(1, end - start);
      const value = ((window.scrollY - start) / total) * 100;
      setProgress(Math.min(100, Math.max(0, value)));
      setVisible(window.scrollY > 500);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
        role="progressbar"
        aria-label="Progression de lecture"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-gradient-to-r from-gold-500 to-bronze-400 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {visible && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 rounded-full border border-gold-500/40 bg-night-900/90 px-4 py-2 text-sm text-gold-200 shadow-card backdrop-blur transition hover:bg-night-800"
        >
          ↑ Haut de page
        </button>
      )}
    </>
  );
}
