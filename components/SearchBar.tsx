"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_PROVIDERS } from "@/lib/providers";

const RECENT_KEY = "sharepool_recent_searches";
const MAX_RECENTS = 5;

// Flatten every provider across every category into one searchable list.
const ALL_PROVIDERS = Array.from(
  new Set(Object.values(CATEGORY_PROVIDERS).flat())
).sort((a, b) => a.localeCompare(b));

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(0);

  // Load recent searches
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecents(JSON.parse(raw).slice(0, MAX_RECENTS));
    } catch {
      // ignore
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const trimmed = query.trim().toLowerCase();

  const suggestions =
    trimmed.length >= 1
      ? ALL_PROVIDERS.filter((p) => p.toLowerCase().includes(trimmed)).slice(
          0,
          6
        )
      : [];

  function saveRecent(term: string) {
    const clean = term.trim();
    if (!clean) return;
    const next = [
      clean,
      ...recents.filter((r) => r.toLowerCase() !== clean.toLowerCase()),
    ].slice(0, MAX_RECENTS);
    setRecents(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function submit(term: string) {
    const clean = term.trim();
    if (!clean) return;
    saveRecent(clean);
    setOpen(false);
    router.push(`/memberships?q=${encodeURIComponent(clean)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions.length > 0 && highlighted < suggestions.length) {
        const chosen = suggestions[highlighted];
        setQuery(chosen);
        submit(chosen);
      } else {
        submit(query);
      }
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function clearRecents() {
    setRecents([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
  }

  const showRecents = open && trimmed.length === 0 && recents.length > 0;
  const showSuggestions = open && trimmed.length > 0 && suggestions.length > 0;
  const showEmpty = open && trimmed.length > 0 && suggestions.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-1.5 shadow-md transition-colors focus-within:border-gold/50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-muted"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search Netflix, Spotify, gym, pharmacy…"
          className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear"
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-[10px] text-muted transition-colors hover:bg-white/10 hover:text-ink"
          >
            ✕
          </button>
        )}

        <button
          type="button"
          onClick={() => submit(query)}
          className="shrink-0 rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-[#1A1300] transition-colors hover:bg-gold-dark"
        >
          Search
        </button>
      </div>

      {/* Dropdown */}
      {open && (showRecents || showSuggestions || showEmpty) && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {showRecents && (
            <>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  Recent
                </span>
                <button
                  type="button"
                  onClick={clearRecents}
                  className="text-[10px] font-bold text-muted transition-colors hover:text-ink"
                >
                  Clear
                </button>
              </div>
              {recents.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setQuery(r);
                    submit(r);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                >
                  <span className="shrink-0 text-muted">🕐</span>
                  <span className="truncate">{r}</span>
                </button>
              ))}
            </>
          )}

          {showSuggestions && (
            <>
              <div className="px-4 py-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  Providers
                </span>
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuery(s);
                    submit(s);
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    i === highlighted ? "bg-white/5" : "hover:bg-white/5"
                  }`}
                >
                  <span className="shrink-0 text-muted">🔍</span>
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </>
          )}

          {showEmpty && (
            <div className="px-4 py-6 text-center text-xs text-muted">
              No matches for &ldquo;{query}&rdquo;. Try a different name.
            </div>
          )}
        </div>
      )}
    </div>
  );
}