"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import SearchBar from "./SearchBar";
import FragrancePanel from "./FragrancePanel";
import BookmarkPanel from "./BookmarkPanel";
import {
  loadData,
  getFragrance,
  getNeighbors,
  getAllFragrances,
} from "@/lib/data";
import {
  getBookmarks,
  toggleBookmark,
  isBookmarked,
} from "@/lib/bookmarks";
import type { Fragrance, GraphData, GraphNode, GraphLink } from "@/lib/types";

// Dynamic import to skip SSR for the canvas-based graph
const FragranceGraph = dynamic(() => import("./FragranceGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
      Loading graph…
    </div>
  ),
});

// Top-N neighbors rendered as edges per node. Adjust after visual inspection.
const RENDERED_EDGES_PER_NODE = 3;

function linkKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export default function AppShell() {
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [bookmarkIds, setBookmarkIds] = useState<number[]>([]);
  const [leftTab, setLeftTab] = useState<"search" | "bookmarks">("search");
  const [panelOpen, setPanelOpen] = useState(false);

  // Container size for the graph canvas
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ w: 800, h: 600 });

  // ── Load JSON data and build full graph ────────────────────────────────────
  useEffect(() => {
    loadData()
      .then(() => {
        setDataReady(true);
        setBookmarkIds(getBookmarks());

        // Build the full UMAP graph in one pass
        const allFragrances = getAllFragrances();
        const seenEdges = new Set<string>();

        const nodes: GraphNode[] = allFragrances.map((f) => ({
          id: String(f.id),
          fragrance: f,
          isRoot: false,
          fx: f.umap_x,
          fy: f.umap_y,
        }));

        const links: GraphLink[] = [];
        for (const f of allFragrances) {
          const topNeighbors = getNeighbors(f.id).slice(0, RENDERED_EDGES_PER_NODE);
          for (const [neighborId, score] of topNeighbors) {
            const key = linkKey(f.id, neighborId);
            if (!seenEdges.has(key)) {
              seenEdges.add(key);
              links.push({
                source: String(f.id),
                target: String(neighborId),
                similarity: score,
              });
            }
          }
        }

        setGraphData({ nodes, links });
      })
      .catch((err) => {
        setDataError(String(err));
      });
  }, []);

  // ── Observe container size ─────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setGraphSize({ w: el.clientWidth, h: el.clientHeight });
    });
    obs.observe(el);
    setGraphSize({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  // ── User actions ───────────────────────────────────────────────────────────
  /** Search result selected → select + open panel. Graph does not change. */
  const handleSearchSelect = useCallback((f: Fragrance) => {
    setSelectedId(f.id);
    setPanelOpen(true);
  }, []);

  /** Node clicked → select + open panel. */
  const handleNodeClick = useCallback((fragranceId: number) => {
    setSelectedId(fragranceId);
    setPanelOpen(true);
  }, []);

  /** Bookmark toggle. */
  const handleToggleBookmark = useCallback(() => {
    if (selectedId == null) return;
    toggleBookmark(selectedId);
    setBookmarkIds(getBookmarks());
  }, [selectedId]);

  /** Bookmark list → select + focus in graph. */
  const handleBookmarkSelect = useCallback((id: number) => {
    setSelectedId(id);
    setPanelOpen(true);
    setLeftTab("search");
  }, []);

  // Bookmarked ids as Set for fast lookup in graph renderer
  const bookmarkedSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);

  const selectedFragrance = selectedId != null ? getFragrance(selectedId) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#0c0c10] text-white overflow-hidden">
      {/* ── Left sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-white/8 bg-[#0f0f14]">
        {/* Logo */}
        <div className="px-4 pt-4 pb-3 border-b border-white/8">
          <h1 className="text-sm font-bold tracking-widest text-white/80 uppercase">
            Atomizer
          </h1>
          <p className="text-xs text-white/30 mt-0.5">Fragrance discovery</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8">
          {(["search", "bookmarks"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setLeftTab(tab)}
              className={`flex-1 text-xs py-2 transition capitalize ${
                leftTab === tab
                  ? "text-white border-b border-white/50 -mb-px"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {tab}
              {tab === "bookmarks" && bookmarkIds.length > 0 && (
                <span className="ml-1 text-white/30">({bookmarkIds.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {leftTab === "search" ? (
            <div className="p-3">
              <SearchBar
                onSelect={handleSearchSelect}
                disabled={!dataReady}
              />
              {!dataReady && !dataError && (
                <p className="text-xs text-white/25 mt-3 text-center animate-pulse">
                  Loading 32K fragrances…
                </p>
              )}
              {dataError && (
                <p className="text-xs text-red-400 mt-3">
                  Error: {dataError}
                </p>
              )}
            </div>
          ) : (
            <BookmarkPanel
              bookmarkIds={bookmarkIds}
              getFragrance={getFragrance}
              onSelect={handleBookmarkSelect}
              onRemove={(id) => {
                if (isBookmarked(id)) toggleBookmark(id);
                setBookmarkIds(getBookmarks());
              }}
            />
          )}
        </div>

        {/* Footer stats */}
        {dataReady && (
          <div className="px-4 py-3 border-t border-white/8 text-xs text-white/20 flex justify-between">
            <span>{graphData.nodes.length.toLocaleString()} nodes</span>
            <span>{graphData.links.length.toLocaleString()} links</span>
          </div>
        )}
      </aside>

      {/* ── Graph canvas ───────────────────────────────────────────────────── */}
      <main className="flex-1 relative overflow-hidden" ref={containerRef}>
        {!dataReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none">
            <p className="text-white/10 text-4xl">✦</p>
            <p className="text-white/20 text-sm animate-pulse">
              Loading fragrance map…
            </p>
          </div>
        ) : (
          <FragranceGraph
            data={graphData}
            selectedId={selectedId}
            bookmarkedIds={bookmarkedSet}
            onNodeClick={handleNodeClick}
            width={graphSize.w}
            height={graphSize.h}
          />
        )}
      </main>

      {/* ── Right panel (fragrance details) ────────────────────────────────── */}
      <aside
        className={`flex-shrink-0 border-l border-white/8 bg-[#0f0f14] transition-all duration-200 overflow-hidden ${
          panelOpen && selectedFragrance ? "w-72" : "w-0"
        }`}
      >
        {selectedFragrance && (
          <FragrancePanel
            fragrance={selectedFragrance}
            isBookmarked={bookmarkedSet.has(selectedFragrance.id)}
            onToggleBookmark={handleToggleBookmark}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </aside>
    </div>
  );
}
