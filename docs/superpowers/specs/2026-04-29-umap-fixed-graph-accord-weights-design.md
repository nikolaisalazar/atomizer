# Design: UMAP Fixed Graph + Accord Weight Visualization

**Date:** 2026-04-29  
**Status:** Approved  
**Approach:** Option A — coords in `fragrances.json`, reuse `react-force-graph-2d`

---

## Overview

Two independent features:

1. **Accord weight bars** — Visual horizontal bars in the fragrance detail panel showing the relative weight of each accord, derived from positional decay already used in the similarity algorithm.
2. **Fixed UMAP map** — Replace the lazy-expanding force-directed graph with a full static landscape of all ~32K fragrances, positioned by UMAP dimensionality reduction so that spatial distance encodes accord similarity.

These can be implemented and deployed independently.

---

## Feature A: Accord Weight Bars

### Goal
Make the dominant accord(s) of a fragrance immediately readable in the detail panel. Currently, accords are shown as colored pills with decreasing opacity — the weight is implied but not explicit.

### Data
No pipeline changes. The `accords` field in `fragrances.json` is an ordered list; position encodes weight via the same decay used in the similarity algorithm:

```
WEIGHTS = [1.0, 0.8, 0.6, 0.4, 0.2]  // index 0 → 1.0, index 4 → 0.2
```

### UI Change (`FragrancePanel.tsx`)
- Add a horizontal bar beneath each accord pill
- Bar width is normalized: the first accord is always 100% wide; subsequent bars scale proportionally (e.g. index 1 = 80%, index 2 = 60%)
- Bar color matches the pill's `accordColor()` value, at reduced opacity to avoid competing with the pill text
- `WEIGHTS` constant defined at component top — easy to update if pipeline decay values change
- No other changes to `FragrancePanel`; notes, rating, actions all untouched

---

## Feature B: Fixed UMAP Map

### Goal
Replace the physics-simulated, lazily-expanding graph with a complete, fixed fragrance landscape where proximity encodes similarity. Users search for a fragrance, the map pans to it, and they can explore surrounding fragrances by panning and zooming.

### Architecture
**Approach 1:** UMAP coordinates stored in `fragrances.json` alongside existing fragrance data. No new data files. No new network requests.

---

### Python Pipeline (`precompute.py`)

**New dependency:** `umap-learn` (`pip install umap-learn`)

**New step** — inserted after `matrix_norm` is built, before writing output:

```python
import umap

reducer = umap.UMAP(
    n_components=2,
    n_neighbors=15,      # matches K; balances local vs global structure
    min_dist=0.1,        # allows visible clusters without over-compressing
    metric="cosine",     # consistent with cosine similarity used elsewhere
    random_state=42,     # reproducible layout across pipeline runs
)
umap_2d = reducer.fit_transform(matrix_norm)  # shape: (N, 2)

# Scale to canvas coordinate space [-5000, 5000]
for axis in range(2):
    col = umap_2d[:, axis]
    mn, mx = col.min(), col.max()
    umap_2d[:, axis] = ((col - mn) / (mx - mn) - 0.5) * 10000
```

Coordinates are written into each fragrance object as `umap_x` and `umap_y` (rounded to 2 decimal places).

**Parameters are tunable constants** at the top of the script — if the resulting map looks too spread out or too blobby after visual inspection, `min_dist` is the primary knob to adjust.

**Runtime:** ~30–90 seconds on a laptop for 32K × 22 vectors. One-time cost per dataset rebuild.

**`neighbors.json` is unchanged.**

---

### Types (`web/lib/types.ts`)

Add to `Fragrance` interface:
```ts
umap_x?: number;
umap_y?: number;
```

Optional so existing JSON without coords doesn't break the app.

Add to `GraphNode` interface:
```ts
fx?: number;  // react-force-graph-2d fixed-position fields
fy?: number;
```

---

### Data Layer (`web/lib/data.ts`)

No changes to existing functions (`loadData`, `getFragrance`, `getNeighbors`, `searchFragrances`).

**New export:**
```ts
export function getAllFragrances(): Fragrance[]
```

Returns the full loaded fragrance array. Used by `AppShell` to populate all nodes at startup.

---

### Graph Component (`web/components/FragranceGraph.tsx`)

**Fixed positions:**
- On receiving graph data, assign `node.fx = node.fragrance.umap_x` and `node.fy = node.fragrance.umap_y` for each node
- `fx`/`fy` are the react-force-graph-2d convention for pinned positions

**Physics disabled:**
```tsx
d3AlphaDecay={1}
d3VelocityDecay={1}
```
Simulation decays to zero on the first tick. Nodes render at their fixed positions immediately with no animation.

**Edges — top-3 only:**
```ts
const RENDERED_EDGES_PER_NODE = 3  // easy to adjust
```
Only the top-3 entries from `neighbors.json` are included in the graph's link list. ~96K total edges. The remaining K=15 neighbors are still available in `neighbors.json` for the detail panel's "similar fragrances" list (future feature).

**Node drag disabled:**
```tsx
enableNodeDrag={false}
```

**Node drawing (`drawNode`):** Unchanged — same colors, glow on selection, zoom-conditional labels.

---

### App Shell (`web/components/AppShell.tsx`)

**Initialization (replaces lazy expansion):**
- After `loadData()` resolves, call `getAllFragrances()` and build the full node + edge list once
- Nodes: all fragrances, positions from `umap_x`/`umap_y`
- Edges: top-3 neighbors per fragrance from `getNeighbors()`
- Set graph state once — never mutated again

**Interaction model:**
- Search result selected → `setSelectedId`, open panel, `fgRef.current.centerAt(x, y, 600)`
- Node clicked → same as above
- No graph mutation on any user action

**Removed:**
- `addNeighbors()` function
- `nodesMapRef` / `linksMapRef` expansion refs
- "Expand" button logic (button removed from `FragrancePanel` props and UI)

**Loading state:**
- While `fragrances.json` loads (~12MB), show existing "Loading 32K fragrances…" message
- After load, graph populates all nodes at once — no incremental expansion

---

## Constraints & Notes

- **`RENDERED_EDGES_PER_NODE = 3`** and **UMAP parameters** are named constants, not magic numbers — easy to tune after visual inspection of the resulting map
- UMAP output is non-deterministic without `random_state` — we set `random_state=42` to ensure the layout is reproducible across pipeline runs
- Both features are independent and can be shipped separately. Accord weight bars have zero pipeline dependency
- This design is intentionally barebones on the visual side to serve as a clean handoff to a future UI redesign (Claude Design session). The data contracts (`Fragrance` type, `data.ts` API) are the stable interface
