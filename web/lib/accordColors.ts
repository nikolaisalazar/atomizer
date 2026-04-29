/** Palette for each of the 22 known accords. */
export const ACCORD_COLORS: Record<string, string> = {
  floral:     "#f472b6",
  spicy:      "#f97316",
  sweet:      "#fbbf24",
  woody:      "#a16207",
  fresh:      "#67e8f9",
  fruity:     "#fb923c",
  citrus:     "#facc15",
  green:      "#4ade80",
  powdery:    "#c084fc",
  synthetic:  "#94a3b8",
  oriental:   "#d97706",
  creamy:     "#fde68a",
  gourmand:   "#b45309",
  resinous:   "#92400e",
  aquatic:    "#38bdf8",
  smoky:      "#64748b",
  leathery:   "#78350f",
  earthy:     "#a8a29e",
  animal:     "#7c3aed",
  chypre:     "#a21caf",
  "fougère":  "#16a34a",
  vanilla:    "#fef3c7",
};

export const DEFAULT_NODE_COLOR = "#6366f1";

export function accordColor(accord: string): string {
  return ACCORD_COLORS[accord.toLowerCase()] ?? DEFAULT_NODE_COLOR;
}

export function nodeColor(accords: string[]): string {
  if (!accords.length) return DEFAULT_NODE_COLOR;
  return accordColor(accords[0]);
}
