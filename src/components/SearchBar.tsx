"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { categoryIcon, categoryLabel } from "@/lib/constants";
import type { SearchHit } from "@/lib/search";

interface SearchResult {
  results: SearchHit[];
}

interface Suggestion {
  slug: string;
  title: string;
  category: string;
}

const CLE_HISTORIQUE = "recherches-recentes";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [historique, setHistorique] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ecoute, setEcoute] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const go = useCallback(
    (slug: string) => {
      setOpen(false);
      setQuery("");
      router.push(`/wiki/${slug}`);
      inputRef.current?.blur();
    },
    [router],
  );

  useEffect(() => {
    try {
      setHistorique(JSON.parse(localStorage.getItem(CLE_HISTORIQUE) ?? "[]").slice(0, 5));
    } catch {
      setHistorique([]);
    }
  }, []);

  // Debounce 200 ms sur la saisie.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data: SearchResult = await response.json();
        const trouves = data.results ?? [];
        setResults(trouves);
        // Aucun résultat exact : on tente la tolérance aux fautes. Sur des noms
        // inventés, une lettre de travers est la règle plutôt que l'exception.
        if (trouves.length === 0) {
          const repli = await fetch(
            `/api/search/suggest?q=${encodeURIComponent(trimmed)}`,
            { signal: controller.signal },
          );
          const dataRepli = await repli.json();
          setSuggestions(dataRepli.suggestions ?? []);
        } else {
          setSuggestions([]);
        }
        setOpen(true);
      } catch {
        /* requête annulée ou erreur réseau : on ignore */
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Fermeture au clic extérieur, raccourcis clavier.
  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      const cible = event.target as HTMLElement | null;
      const dansUnChamp =
        cible?.tagName === "INPUT" ||
        cible?.tagName === "TEXTAREA" ||
        cible?.isContentEditable === true;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      // « / » ouvre la recherche, comme sur la plupart des sites de documentation.
      // Ignoré dans un champ : sinon impossible de taper une barre oblique.
      if (event.key === "/" && !dansUnChamp) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function memoriser(terme: string) {
    const suivant = [terme, ...historique.filter((item) => item !== terme)].slice(0, 5);
    setHistorique(suivant);
    try {
      localStorage.setItem(CLE_HISTORIQUE, JSON.stringify(suivant));
    } catch {
      /* stockage plein ou refusé : sans conséquence */
    }
  }

  function dicter() {
    type Reconnaissance = {
      lang: string;
      start: () => void;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    };
    const Ctor = (
      window as unknown as {
        SpeechRecognition?: new () => Reconnaissance;
        webkitSpeechRecognition?: new () => Reconnaissance;
      }
    ).SpeechRecognition ??
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => Reconnaissance;
        }
      ).webkitSpeechRecognition;

    if (!Ctor) return;
    const reconnaissance = new Ctor();
    reconnaissance.lang = "fr-FR";
    reconnaissance.onresult = (event) => {
      const texte = event.results?.[0]?.[0]?.transcript ?? "";
      if (texte) setQuery(texte);
    };
    reconnaissance.onend = () => setEcoute(false);
    reconnaissance.onerror = () => setEcoute(false);
    setEcoute(true);
    reconnaissance.start();
  }

  const terme = query.trim();
  const rienTrouve = !loading && terme.length >= 2 && results.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-night-500 bg-night-800 px-3 py-2 transition focus-within:border-gold-500/60 focus-within:shadow-glow-gold">
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 fill-none stroke-bronze-400"
          strokeWidth="2"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 4 4" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && terme.length >= 2) {
              memoriser(terme);
              setOpen(false);
              router.push(`/recherche?q=${encodeURIComponent(terme)}`);
            }
          }}
          placeholder="Rechercher dans le wiki…"
          aria-label="Rechercher dans le wiki"
          className="w-full bg-transparent py-1 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={dicter}
          aria-label="Recherche vocale"
          title="Recherche vocale"
          className={`shrink-0 rounded px-1 text-sm transition ${ecoute ? "text-rose-300" : "text-slate-400 hover:text-gold-200"}`}
        >
          🎙
        </button>
        <kbd className="hidden shrink-0 rounded border border-night-500 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block">
          Ctrl K
        </kbd>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-night-500 bg-night-800 shadow-card">
          {loading && <p className="px-4 py-3 text-sm text-slate-400">Recherche…</p>}

          {terme.length < 2 && historique.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Recherches récentes</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {historique.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setQuery(item)}
                      className="rounded-full border border-night-500 px-2 py-0.5 text-xs text-slate-300 hover:border-gold-500"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rienTrouve && suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">Aucun résultat pour « {terme} ».</p>
          )}

          {rienTrouve && suggestions.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-slate-400">Aucun résultat exact. Peut-être :</p>
              <ul className="mt-1">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.slug}>
                    <button
                      type="button"
                      onClick={() => go(suggestion.slug)}
                      className="block w-full py-1 text-left text-sm text-gold-200 hover:underline"
                    >
                      {suggestion.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.length > 0 && (
            <ul className="max-h-96 overflow-y-auto">
              {results.map((hit) => (
                <li key={hit.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      memoriser(terme);
                      go(hit.slug);
                    }}
                    className="block w-full border-b border-night-600/60 px-4 py-3 text-left transition last:border-0 hover:bg-night-700"
                  >
                    <span className="block text-sm font-medium text-gold-200">{hit.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {categoryIcon(hit.category)} {categoryLabel(hit.category)}
                      <span
                        className="excerpt ml-2 inline text-[0.8rem] leading-snug"
                        dangerouslySetInnerHTML={{ __html: hit.excerpt }}
                      />
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <Link
                  href={`/recherche?q=${encodeURIComponent(terme)}`}
                  onClick={() => {
                    memoriser(terme);
                    setOpen(false);
                  }}
                  className="block bg-night-700/60 px-4 py-2.5 text-center text-xs font-medium text-gold-300 transition hover:bg-night-700"
                >
                  Voir tous les résultats →
                </Link>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
