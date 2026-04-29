"use client";

import type { Fragrance } from "@/lib/types";
import { accordColor } from "@/lib/accordColors";

interface Props {
  bookmarkIds: number[];
  getFragrance: (id: number) => Fragrance | undefined;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
}

export default function BookmarkPanel({
  bookmarkIds,
  getFragrance,
  onSelect,
  onRemove,
}: Props) {
  if (bookmarkIds.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-white/25 text-xs leading-relaxed">
          Bookmarked fragrances appear here.
          <br />
          Click ☆ on any fragrance to save it.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {bookmarkIds.map((id) => {
        const f = getFragrance(id);
        if (!f) return null;
        return (
          <li
            key={id}
            className="flex items-center gap-2 px-3 py-2 group hover:bg-white/4 transition"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: accordColor(f.accords[0] ?? "") }}
            />
            <button
              onClick={() => onSelect(id)}
              className="flex flex-col min-w-0 text-left flex-1"
            >
              <span className="text-white/80 text-xs font-medium truncate">
                {f.name ?? "Unknown"}
              </span>
              <span className="text-white/35 text-xs truncate">
                {f.brand ?? "—"}
              </span>
            </button>
            <button
              onClick={() => onRemove(id)}
              className="p-1 text-white/20 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
              title="Remove bookmark"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-3 h-3"
              >
                <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
