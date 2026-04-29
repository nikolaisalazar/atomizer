"use client";

import type { Fragrance } from "@/lib/types";
import { accordColor } from "@/lib/accordColors";

interface Props {
  fragrance: Fragrance;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onExpandInGraph: () => void;
  onClose: () => void;
}

function NoteList({ label, raw }: { label: string; raw: string | null }) {
  if (!raw) return null;
  const notes = raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="mt-3">
      <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {notes.map((n) => (
          <span
            key={n}
            className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FragrancePanel({
  fragrance,
  isBookmarked,
  onToggleBookmark,
  onExpandInGraph,
  onClose,
}: Props) {
  const displayRating = fragrance.rating
    ? parseFloat(fragrance.rating).toFixed(2)
    : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white leading-tight">
            {fragrance.name ?? "Unknown Fragrance"}
          </h2>
          <p className="text-sm text-white/50 mt-0.5">
            {fragrance.brand ?? "Unknown Brand"}
            {fragrance.year ? ` · ${fragrance.year}` : ""}
            {fragrance.gender ? ` · ${fragrance.gender}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-white/30 hover:text-white/70 transition flex-shrink-0"
          title="Close panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Rating */}
      {displayRating && (
        <div className="mx-4 mt-3 flex items-center gap-2">
          <span className="text-amber-400 text-sm">★</span>
          <span className="text-white text-sm font-medium">{displayRating}</span>
          {fragrance.votes && (
            <span className="text-white/30 text-xs">
              ({parseInt(fragrance.votes).toLocaleString()} votes)
            </span>
          )}
        </div>
      )}

      {/* Accords */}
      {fragrance.accords.length > 0 && (
        <div className="mx-4 mt-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
            Accords
          </p>
          <div className="flex flex-wrap gap-2">
            {fragrance.accords.map((accord, i) => (
              <span
                key={accord}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: accordColor(accord) + "22",
                  borderColor: accordColor(accord) + "55",
                  color: accordColor(accord),
                  border: "1px solid",
                  opacity: 1 - i * 0.12,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: accordColor(accord) }}
                />
                {accord}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mx-4 mt-1">
        <NoteList label="Top notes" raw={fragrance.top_notes} />
        <NoteList label="Heart notes" raw={fragrance.mid_notes} />
        <NoteList label="Base notes" raw={fragrance.base_notes} />
      </div>

      {/* External link */}
      {fragrance.url && (
        <div className="mx-4 mt-4">
          <a
            href={fragrance.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-white/60 transition underline underline-offset-2"
          >
            View on Parfumo ↗
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="mx-4 mt-4 flex gap-2">
        <button
          onClick={onToggleBookmark}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition flex-1 justify-center ${
            isBookmarked
              ? "border-amber-400/50 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"
              : "border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10"
          }`}
        >
          <span>{isBookmarked ? "★" : "☆"}</span>
          <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
        </button>
        <button
          onClick={onExpandInGraph}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10 transition flex-1 justify-center"
          title="Load this fragrance's neighbors into the graph"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          <span>Expand</span>
        </button>
      </div>

      <div className="pb-4" />
    </div>
  );
}
