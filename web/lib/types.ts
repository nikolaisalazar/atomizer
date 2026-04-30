export interface Fragrance {
  id: number;
  name: string | null;
  brand: string | null;
  year: string | null;
  gender: string | null;
  rating: string | null;
  votes: string | null;
  url: string | null;
  image: string | null;
  accords: string[];
  top_notes: string | null;
  mid_notes: string | null;
  base_notes: string | null;
  umap_x?: number;
  umap_y?: number;
}

export interface GraphNode {
  id: string;
  fragrance: Fragrance;
  isRoot: boolean;
  // injected by react-force-graph at runtime
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number; // react-force-graph-2d fixed-position fields
  fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  similarity: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
