"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchFragrances } from "@/lib/data";
import type { Fragrance } from "@/lib/types";
import { accordColor } from "@/lib/accordColors";

interface Props {
  onSelect: (fragrance: Fragrance) => void;
  disabled?: boolean;
}

export default function SearchBar({ onSelect, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Fragrance[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Run search whenever query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const hits = searchFragrances(query, 10);
    setResults(hits);
    setOpen(hits.length > 0);
    setActiveIdx(-1);
  }, [query]);

  const commit = useCallback(
    (f: Fragrance) => {
      onSelect(f);
      setQuery("");
      setResults([]);
      setOpen(false);
    },
    [onSelect]
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      commit(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-white/30 pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder={disabled ? "Loading data…" : "Search fragrances…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={disabled}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/8 transition disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute top-full mt-1 w-full z-50 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden text-sm"
        >
          {results.map((f, i) => (
            <li
              key={f.id}
              onMouseDown={() => commit(f)}
              className={`flex items-start gap-2 px-3 py-2 cursor-pointer transition ${
                i === activeIdx ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              {/* Accord dot */}
              <span
                className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: accordColor(f.accords[0] ?? "") }}
              />
              <span className="flex flex-col min-w-0">
                <span className="text-white font-medium truncate">
                  {f.name ?? "Unnamed"}
                </span>
                <span className="text-white/50 text-xs truncate">
                  {f.brand ?? "Unknown brand"}
                  {f.year ? ` · ${f.year}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
