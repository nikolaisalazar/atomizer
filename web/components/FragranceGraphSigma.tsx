"use client";

import { useRef, useEffect, useState } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import type { NodeDisplayData, EdgeDisplayData } from "sigma/types";
import type { GraphData } from "@/lib/types";
import { nodeColor } from "@/lib/accordColors";

// ── Types ──────────────────────────────────────────────────────────────────────

interface NodeAttrs {
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  fragranceId: number;
}

interface EdgeAttrs {
  size: number;
  color: string;
  hidden: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** Normal node radius (graph-space units, scaled by camera). */
const NODE_SIZE = 5;
/** Radius for the focused/selected node. */
const FOCUSED_SIZE = 10;
/**
 * Color applied to nodes that are neither focused nor a direct neighbor.
 * Matches the app background closely so they recede visually.
 */
const DIM_COLOR = "#1c1c28";

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  data: GraphData;
  selectedId: number | null;
  bookmarkedIds: Set<number>;
  onNodeClick: (fragrance_id: number) => void;
  width: number;
  height: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function FragranceGraphSigma({
  data,
  selectedId,
  bookmarkedIds,
  onNodeClick,
  width,
  height,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma<NodeAttrs, EdgeAttrs> | null>(null);
  const graphRef = useRef<Graph<NodeAttrs, EdgeAttrs> | null>(null);

  // Stable callback ref — avoids re-running the Sigma init effect when the
  // parent re-renders and passes a new function reference.
  const onNodeClickRef = useRef(onNodeClick);
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  // Which node is currently under the cursor (sigma node key = string id).
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // ── 1. Build graphology graph from GraphData ─────────────────────────────────
  // Runs once after the full dataset arrives (data.nodes.length > 0).
  // If Sigma is already mounted it swaps the graph in-place via setGraph().
  useEffect(() => {
    if (!data.nodes.length) return;

    const g = new Graph<NodeAttrs, EdgeAttrs>({ multi: false, type: "undirected" });

    for (const node of data.nodes) {
      const f = node.fragrance;
      g.addNode(node.id, {
        label: f.name ?? "Unknown",
        x: f.umap_x ?? 0,
        // Sigma's y-axis points upward; UMAP y typically points downward — flip.
        y: -(f.umap_y ?? 0),
        size: NODE_SIZE,
        color: nodeColor(f.accords),
        fragranceId: f.id,
      });
    }

    for (const link of data.links) {
      const src = typeof link.source === "string" ? link.source : link.source.id;
      const tgt = typeof link.target === "string" ? link.target : link.target.id;
      try {
        g.addEdge(src, tgt, {
          size: Math.max(0.5, link.similarity * 2),
          color: "#ffffff40",
          hidden: true,
        });
      } catch {
        // Duplicate edge — AppShell deduplicates but be defensive.
      }
    }

    graphRef.current = g;

    // If Sigma is already running, hot-swap the graph.
    if (sigmaRef.current) {
      sigmaRef.current.setGraph(g);
    }
  }, [data]);

  // ── 2. Initialise Sigma (once on mount) ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    // Use whatever graph is ready; if data hasn't loaded yet we start with an
    // empty one — effect #1 will call setGraph() once data arrives.
    const initialGraph =
      graphRef.current ??
      new Graph<NodeAttrs, EdgeAttrs>({ multi: false, type: "undirected" });

    const sigma = new Sigma<NodeAttrs, EdgeAttrs>(
      initialGraph,
      containerRef.current,
      {
        // Performance
        hideEdgesOnMove: true,
        hideLabelsOnMove: true,
        renderEdgeLabels: false,

        // Labels — sparse; only visible when zoomed in enough
        labelDensity: 0.07,
        labelGridCellSize: 80,
        labelRenderedSizeThreshold: 8,
        labelColor: { color: "#ffffffaa" },

        // Defaults
        defaultNodeColor: "#6366f1",
        defaultEdgeColor: "#ffffff18",

        // Camera limits
        minCameraRatio: 0.02,
        maxCameraRatio: 5,

        // Node sizes are in graph-space so they scale naturally with zoom.
        itemSizesReference: "positions",
      }
    );

    sigmaRef.current = sigma;

    sigma.on("clickNode", ({ node }) => {
      const fragranceId = sigma.getGraph().getNodeAttribute(node, "fragranceId");
      if (fragranceId != null) onNodeClickRef.current(fragranceId);
    });

    sigma.on("enterNode", ({ node }) => setHoveredNode(node));
    sigma.on("leaveNode", () => setHoveredNode(null));

    return () => {
      sigma.kill();
      sigmaRef.current = null;
    };
  }, []); // intentionally empty — Sigma lives for the lifetime of this component

  // ── 3. Resize when container dimensions change ───────────────────────────────
  useEffect(() => {
    sigmaRef.current?.resize();
  }, [width, height]);

  // ── 4. Node / edge reducers — drive focus + dimming ──────────────────────────
  // Runs whenever hover state, selection, or bookmarks change.
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;

    const graph = sigma.getGraph() as Graph<NodeAttrs, EdgeAttrs>;

    // The "active" node is: hovered first, then selected (if any).
    const focusedNode =
      hoveredNode ?? (selectedId != null ? String(selectedId) : null);

    // Pre-build the neighbor set so reducers don't recompute it per-node.
    const focusedNeighbors: Set<string> =
      focusedNode && graph.hasNode(focusedNode)
        ? new Set(graph.neighbors(focusedNode))
        : new Set();

    // ── Node reducer ──────────────────────────────────────────────────────────
    sigma.setSetting(
      "nodeReducer",
      (node: string, data: NodeAttrs): Partial<NodeDisplayData> => {
        const isSelected =
          selectedId != null && node === String(selectedId);
        const isBookmarked = bookmarkedIds.has(data.fragranceId);

        // Base display values copied from raw graphology attributes.
        const base: Partial<NodeDisplayData> = {
          x: data.x,
          y: data.y,
          label: data.label,
          color: data.color,
          size: isBookmarked ? NODE_SIZE + 2 : data.size,
          highlighted: false,
          // Always show labels for bookmarked nodes.
          forceLabel: isBookmarked,
        };

        if (focusedNode) {
          const isFocused = node === focusedNode;
          const isNeighbor = focusedNeighbors.has(node);

          if (isFocused) {
            return { ...base, size: FOCUSED_SIZE, highlighted: true };
          }
          if (isNeighbor) {
            return base;
          }
          // Dim everything else and suppress labels.
          return { ...base, color: DIM_COLOR, label: "", forceLabel: false };
        }

        // No focus — just highlight the selected node if there is one.
        if (isSelected) {
          return { ...base, size: FOCUSED_SIZE, highlighted: true };
        }

        return base;
      }
    );

    // ── Edge reducer ─────────────────────────────────────────────────────────
    sigma.setSetting(
      "edgeReducer",
      (edge: string, data: EdgeAttrs): Partial<EdgeDisplayData> => {
        if (!focusedNode) {
          return { color: data.color, size: data.size, hidden: true };
        }
        if (graph.hasExtremity(edge, focusedNode)) {
          return { color: "#ffffff55", size: data.size, hidden: false };
        }
        return { color: data.color, size: data.size, hidden: true };
      }
    );

    sigma.refresh();
  }, [hoveredNode, selectedId, bookmarkedIds]);

  // ── 5. Animate camera to selected node ───────────────────────────────────────
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma || selectedId == null) return;

    const nodeKey = String(selectedId);
    if (!sigma.getGraph().hasNode(nodeKey)) return;

    // getNodeDisplayData returns coordinates in Sigma's normalised graph space,
    // which is exactly what camera.animate() expects.
    const display = sigma.getNodeDisplayData(nodeKey);
    if (display) {
      sigma.getCamera().animate(
        { x: display.x, y: display.y, ratio: 0.15 },
        { duration: 600 }
      );
    }
  }, [selectedId]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{ width, height, background: "#0c0c10" }}
    />
  );
}
