"use client";

import { useRef, useCallback, useEffect } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
} from "react-force-graph-2d";
import type { GraphData, GraphNode } from "@/lib/types";
import { nodeColor } from "@/lib/accordColors";

interface Props {
  data: GraphData;
  selectedId: number | null;
  bookmarkedIds: Set<number>;
  onNodeClick: (fragrance_id: number) => void;
  width: number;
  height: number;
}

const NODE_R = 7;
const ROOT_R = 10;

export default function FragranceGraph({
  data,
  selectedId,
  bookmarkedIds,
  onNodeClick,
  width,
  height,
}: Props) {
  const fgRef = useRef<ForceGraphMethods<GraphNode>>(undefined);

  // When selected node changes, gently re-center on it
  useEffect(() => {
    if (selectedId == null || !fgRef.current) return;
    const node = data.nodes.find((n) => n.fragrance.id === selectedId);
    if (node?.x != null && node?.y != null) {
      fgRef.current.centerAt(node.x, node.y, 600);
    }
  }, [selectedId, data.nodes]);

  const drawNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const fragrance = node.fragrance;
      const isSelected = fragrance.id === selectedId;
      const isBookmarked = bookmarkedIds.has(fragrance.id);
      const r = node.isRoot ? ROOT_R : NODE_R;
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      const color = nodeColor(fragrance.accords);

      // Glow for selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, 2 * Math.PI);
        const grd = ctx.createRadialGradient(x, y, r, x, y, r + 8);
        grd.addColorStop(0, color + "88");
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Ring for root
      if (node.isRoot) {
        ctx.beginPath();
        ctx.arc(x, y, r + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = "#ffffff55";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Bookmark star
      if (isBookmarked) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = `${Math.max(8, r)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", x, y - r - 5);
      }

      // Label (only at zoom ≥ 1.5)
      if (globalScale >= 1.5 || isSelected) {
        const label = fragrance.name ?? "Unknown";
        const fontSize = Math.max(4, 11 / globalScale);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isSelected ? "#ffffff" : "#ffffffaa";
        ctx.fillText(
          label.length > 20 ? label.slice(0, 18) + "…" : label,
          x,
          y + r + 2
        );
      }
    },
    [selectedId, bookmarkedIds]
  );

  const handleClick = useCallback(
    (node: GraphNode) => {
      onNodeClick(node.fragrance.id);
    },
    [onNodeClick]
  );

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      width={width}
      height={height}
      backgroundColor="#0c0c10"
      nodeId="id"
      nodeCanvasObject={drawNode}
      nodeCanvasObjectMode={() => "replace"}
      nodePointerAreaPaint={(node: GraphNode, color, ctx) => {
        const r = node.isRoot ? ROOT_R : NODE_R;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, r + 4, 0, 2 * Math.PI);
        ctx.fill();
      }}
      linkColor={() => "#ffffff18"}
      linkWidth={(link) => {
        const sim = (link as { similarity: number }).similarity ?? 0;
        return Math.max(0.5, sim * 3);
      }}
      onNodeClick={handleClick}
      cooldownTicks={80}
      nodeLabel={(node: GraphNode) =>
        `${node.fragrance.name ?? "Unknown"} — ${node.fragrance.brand ?? ""}`
      }
      enableNodeDrag={true}
      enableZoomInteraction={true}
      minZoom={0.2}
      maxZoom={8}
    />
  );
}
