"use client";

import { useEffect, useState } from "react";

/**
 * Outils de lecture et de contribution.
 *
 * Tous partagent une contrainte : ils doivent fonctionner sans JavaScript côté
 * serveur et ne rien casser si l'API est indisponible. Chaque action échoue
 * silencieusement à l'écran plutôt que de faire tomber la page.
 */

// ---------------------------------------------------------------------------
// Suivre une page
// ---------------------------------------------------------------------------

export function WatchButton({ slug, initial }: { slug: string; initial: boolean }) {
  const [suivi, setSuivi] = useState(initial);
  const [envoi, setEnvoi] = useState(false);

  async function basculer() {
    setEnvoi(true);
    try {
      const response = await fetch("/api/features/watch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, watch: !suivi }),
      });
      if (response.ok) {
        const data = await response.json();
        setSuivi(Boolean(data.watched));
      }
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <button
      type="button"
      onClick={basculer}
      disabled={envoi}
      aria-pressed={suivi}
      className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${
        suivi
          ? "border-gold-500 bg-gold-500/15 text-gold-200"
          : "border-night-500 text-slate-300 hover:border-gold-500 hover:text-gold-200"
      }`}
    >
      {suivi ? "★ Suivie" : "☆ Suivre"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Confort de lecture
// ---------------------------------------------------------------------------

type Ambiance = "nuit" | "sepia" | "contraste";
type Taille = "normal" | "grand" | "tres-grand";

const AMBIANCES: Array<{ id: Ambiance; label: string; classe: string }> = [
  { id: "nuit", label: "Nuit", classe: "" },
  { id: "sepia", label: "Sépia", classe: "lecture-sepia" },
  { id: "contraste", label: "Contraste", classe: "lecture-contraste" },
];

const TAILLES: Array<{ id: Taille; label: string; classe: string }> = [
  { id: "normal", label: "A", classe: "" },
  { id: "grand", label: "A+", classe: "lecture-texte-grand" },
  { id: "tres-grand", label: "A++", classe: "lecture-texte-tres-grand" },
];

export function ReadingControls() {
  const [ambiance, setAmbiance] = useState<Ambiance>("nuit");
  const [taille, setTaille] = useState<Taille>("normal");

  // Les préférences vivent dans le navigateur : elles suivent la personne, pas
  // le compte, et ne nécessitent donc aucune écriture serveur.
  useEffect(() => {
    try {
      const ambianceStockee = (localStorage.getItem("lecture-ambiance") as Ambiance) ?? "nuit";
      const tailleStockee = (localStorage.getItem("lecture-taille") as Taille) ?? "normal";
      setAmbiance(ambianceStockee);
      setTaille(tailleStockee);
    } catch {
      /* stockage indisponible : on garde les valeurs par défaut */
    }
  }, []);

  useEffect(() => {
    const racine = document.documentElement;
    // `classList.toggle("")` lève une SyntaxError : le jeton vide est refusé
    // par l'API DOM, même avec `force = false`. Les options « Nuit » et « A »
    // n'ont pas de classe — elles représentent l'absence de classe — il faut
    // donc les sauter, et non leur passer une chaîne vide.
    try {
      for (const option of AMBIANCES) {
        if (option.classe) racine.classList.toggle(option.classe, option.id === ambiance);
      }
      for (const option of TAILLES) {
        if (option.classe) racine.classList.toggle(option.classe, option.id === taille);
      }
      localStorage.setItem("lecture-ambiance", ambiance);
      localStorage.setItem("lecture-taille", taille);
    } catch {
      // Navigation privée, stockage refusé : la préférence ne survivra pas à la
      // page, mais elle ne doit pas faire tomber l'article.
    }
  }, [ambiance, taille]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div role="group" aria-label="Ambiance" className="flex overflow-hidden rounded-full border border-night-500">
        {AMBIANCES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setAmbiance(option.id)}
            aria-pressed={ambiance === option.id}
            className={`px-2.5 py-1 transition ${
              ambiance === option.id ? "bg-gold-500/20 text-gold-200" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Taille du texte" className="flex overflow-hidden rounded-full border border-night-500">
        {TAILLES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTaille(option.id)}
            aria-pressed={taille === option.id}
            className={`px-2.5 py-1 transition ${
              taille === option.id ? "bg-gold-500/20 text-gold-200" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lecture audio
// ---------------------------------------------------------------------------

export function AudioReader({ targetId, title }: { targetId: string; title: string }) {
  const [actif, setActif] = useState(false);
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    setDisponible(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  if (!disponible) return null;

  function basculer() {
    const synthese = window.speechSynthesis;
    if (actif) {
      synthese.cancel();
      setActif(false);
      return;
    }
    const cible = document.getElementById(targetId);
    if (!cible) return;
    // On lit le texte visible, pas le Markdown : les balises se prononceraient.
    const texte = cible.innerText.replace(/\s+/g, " ").slice(0, 30_000);
    const utterance = new SpeechSynthesisUtterance(`${title}. ${texte}`);
    utterance.lang = "fr-FR";
    utterance.rate = 1;
    utterance.onend = () => setActif(false);
    utterance.onerror = () => setActif(false);
    synthese.cancel();
    synthese.speak(utterance);
    setActif(true);
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-pressed={actif}
      className="rounded-full border border-night-500 px-3 py-1 text-xs text-slate-300 hover:border-gold-500 hover:text-gold-200"
    >
      {actif ? "⏹ Arrêter la lecture" : "🔊 Écouter"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Partage d'un passage
// ---------------------------------------------------------------------------

export function HighlightShare() {
  const [message, setMessage] = useState<string | null>(null);

  async function partager() {
    const selection = window.getSelection()?.toString().trim();
    if (!selection || selection.length < 12) {
      setMessage("Sélectionnez d'abord un passage.");
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    // Fragment de texte : le navigateur surligne le passage à l'arrivée, sans
    // que le wiki ait à stocker quoi que ce soit.
    const fragment = `#:~:text=${encodeURIComponent(selection.slice(0, 180))}`;
    const url = `${window.location.origin}${window.location.pathname}${fragment}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Lien copié.");
    } catch {
      setMessage(url);
    }
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={partager}
        className="rounded-full border border-night-500 px-3 py-1 text-xs text-slate-300 hover:border-gold-500 hover:text-gold-200"
      >
        🔗 Citer ce passage
      </button>
      {message && <span className="text-[11px] text-slate-400">{message}</span>}
    </span>
  );
}
