"use client";

import { useEffect, useRef } from "react";
import { THEME_COLORS, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/**
 * Bascule de thème, sans état React pour l'icône : la visibilité des deux
 * glyphes est décidée par CSS à partir de la classe `dark` de `<html>`. Le
 * premier rendu client est donc strictement identique au rendu serveur, et
 * l'oggling ne peut pas provoquer d'avertissement d'hydratation.
 */
export default function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // `aria-pressed` n'est positionné qu'après l'hydratation : il décrit l'état
  // réel du DOM, que seul le script de démarrage connaît.
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    buttonRef.current?.setAttribute("aria-pressed", String(isDark));
  }, []);

  function toggle() {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* stockage indisponible : le thème ne sera pas mémorisé */
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[next]);
    buttonRef.current?.setAttribute("aria-pressed", String(next === "dark"));
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label="Changer de thème clair ou sombre"
      title="Thème clair / sombre"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gold-500/40 bg-night-800/60 text-base leading-none transition hover:border-gold-500/70 hover:bg-night-700/60"
    >
      {/* Visible en thème clair : la cible est le thème sombre. */}
      <span aria-hidden="true" className="dark:hidden">
        🌙
      </span>
      {/* Visible en thème sombre : la cible est le thème clair. */}
      <span aria-hidden="true" className="hidden dark:inline">
        ☀️
      </span>
    </button>
  );
}
