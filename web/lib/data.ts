"use client";

import type { Fragrance } from "./types";

// ── Module-level singletons (survive re-renders) ─────────────────────────────
let fragrances: Fragrance[] | null = null;
let neighbors: Record<string, [number, number][]> | null = null;
let index: Map<number, Fragrance> | null = null;
let loadPromise: Promise<void> | null = null;

export async function loadData(): Promise<void> {
  if (fragrances && neighbors) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const [fragsRes, neighRes] = await Promise.all([
      fetch(`${base}/data/fragrances.json`),
      fetch(`${base}/data/neighbors.json`),
    ]);

    if (!fragsRes.ok || !neighRes.ok) {
      throw new Error("Failed to load fragrance data.");
    }

    fragrances = await fragsRes.json();
    neighbors = await neighRes.json();
    index = new Map((fragrances as Fragrance[]).map((f) => [f.id, f]));
  })();

  return loadPromise;
}

export function getFragrance(id: number): Fragrance | undefined {
  return index?.get(id);
}

export function getNeighbors(id: number): [number, number][] {
  return neighbors?.[String(id)] ?? [];
}

/** Simple case-insensitive substring search over name + brand. */
export function searchFragrances(query: string, limit = 12): Fragrance[] {
  if (!fragrances || !query.trim()) return [];
  const q = query.toLowerCase();
  const results: Fragrance[] = [];
  for (const f of fragrances) {
    if (results.length >= limit) break;
    if (
      f.name?.toLowerCase().includes(q) ||
      f.brand?.toLowerCase().includes(q)
    ) {
      results.push(f);
    }
  }
  return results;
}

export function isDataLoaded(): boolean {
  return fragrances !== null && neighbors !== null;
}
