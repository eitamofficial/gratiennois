"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { categoryIcon, categoryLabel } from "@/lib/constants";
import type { SearchHit } from "@/lib/search";

interface SearchResult {
  results: SearchHit[];
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Debounce 200 ms sur la saisie.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
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
        setResults(data.results ?? []);
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

  // Fermeture au clic extérieur et raccourci Ctrl/Cmd + K.
  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
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
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && query.trim().length >= 2) {
              setOpen(false);
              router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
            }
          }}
          placeholder="Rechercher dans le wiki…"
          aria-label="Rechercher dans le wiki"
          className="w-full bg-transparent py-1 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />
        <kbd className="hidden shrink-0 rounded border border-night-500 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block">
          Ctrl K
        </kbd>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-night-500 bg-night-800 shadow-card">
          {loading && <p className="px-4 py-3 text-sm text-slate-400">Recherche…</p>}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">
              Aucun résultat pour « {query.trim()} ».
            </p>
          )}

          {results.length > 0 && (
            <ul className="max-h-96 overflow-y-auto">
              {results.map((hit) => (
                <li key={hit.slug}>
                  <button
                    type="button"
                    onClick={() => go(hit.slug)}
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
                  href={`/recherche?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setOpen(false)}
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
