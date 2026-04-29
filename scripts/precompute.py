"""
precompute.py
Reads parfumo_data_clean.csv, builds a weighted accord similarity graph,
and outputs:
  - fragrances.json  (array of fragrance objects)
  - neighbors.json   (object: fragrance_id → [[neighbor_id, score], ...])

Run from the /scripts directory:
    python precompute.py

Requirements:
    pip install pandas scikit-learn numpy
"""

import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

# ── Config ──────────────────────────────────────────────────────────────────
CSV_PATH    = Path(__file__).parent / "parfumo_data_clean.csv"
OUT_DIR     = Path(__file__).parent.parent / "web" / "public" / "data"
K           = 15          # neighbors per fragrance
BATCH_SIZE  = 2000        # rows per similarity batch (memory trade-off)
WEIGHTS     = [1.0, 0.8, 0.6, 0.4, 0.2]   # positional decay (up to 5 accords)

# ── Known accords (22 unique values from the dataset) ───────────────────────
KNOWN_ACCORDS = [
    "floral", "spicy", "sweet", "woody", "fresh",
    "fruity", "citrus", "green", "powdery", "synthetic",
    "oriental", "creamy", "gourmand", "resinous", "aquatic",
    "smoky", "leathery", "earthy", "animal", "chypre",
    "fougère", "vanilla",
]
ACCORD_INDEX = {a: i for i, a in enumerate(KNOWN_ACCORDS)}
N_ACCORDS    = len(KNOWN_ACCORDS)

# ── Helpers ──────────────────────────────────────────────────────────────────
def parse_accords(raw: str) -> list[str]:
    """Return list of normalised accord names from a raw CSV cell."""
    if not isinstance(raw, str) or raw.strip().lower() in ("na", "nan", ""):
        return []
    # Strip surrounding brackets/quotes if present
    raw = raw.strip().strip("[]'\"")
    parts = re.split(r",\s*|;\s*", raw)
    out = []
    for p in parts:
        cleaned = p.strip().strip("'\"").lower()
        if cleaned:
            out.append(cleaned)
    return out


def build_vector(accords: list[str]) -> np.ndarray:
    vec = np.zeros(N_ACCORDS, dtype=np.float32)
    for pos, acc in enumerate(accords[:len(WEIGHTS)]):
        idx = ACCORD_INDEX.get(acc)
        if idx is not None:
            vec[idx] += WEIGHTS[pos]
    return vec


# ── Load & filter ─────────────────────────────────────────────────────────────
print("Loading CSV…", flush=True)
df = pd.read_csv(CSV_PATH, dtype=str)
print(f"  Total rows: {len(df)}", flush=True)

# Keep only rows with accord data
df["_accords_parsed"] = df["Main_Accords"].apply(parse_accords)
df = df[df["_accords_parsed"].map(len) > 0].reset_index(drop=True)
print(f"  Rows with accord data: {len(df)}", flush=True)

# Assign a clean integer ID
df["id"] = df.index.astype(int)

# ── Build accord matrix ───────────────────────────────────────────────────────
print("Building accord matrix…", flush=True)
matrix = np.vstack(df["_accords_parsed"].apply(build_vector).values)  # (N, 22)

# L2-normalise so dot product == cosine similarity
matrix_norm = normalize(matrix, norm="l2")

# ── Compute top-K neighbours in batches ──────────────────────────────────────
print(f"Computing top-{K} neighbours in batches of {BATCH_SIZE}…", flush=True)
N = len(df)
neighbors: dict[int, list[list]] = {}  # id → [[neighbor_id, score], ...]

for start in range(0, N, BATCH_SIZE):
    end = min(start + BATCH_SIZE, N)
    batch = matrix_norm[start:end]          # (B, 22)
    sims  = batch @ matrix_norm.T           # (B, N)

    for local_i, global_i in enumerate(range(start, end)):
        row = sims[local_i]
        row[global_i] = -1.0                # exclude self
        top_k_idx = np.argpartition(row, -K)[-K:]
        top_k_idx = top_k_idx[np.argsort(row[top_k_idx])[::-1]]
        neighbors[int(global_i)] = [
            [int(j), round(float(row[j]), 4)] for j in top_k_idx
        ]

    pct = (end / N) * 100
    print(f"  {end}/{N} ({pct:.1f}%)", flush=True)

# ── Build fragrances list ─────────────────────────────────────────────────────
print("Building fragrances list…", flush=True)

def safe(val):
    return val if isinstance(val, str) and val.strip().lower() not in ("nan", "na", "") else None

fragrances = []
for _, row in df.iterrows():
    fragrances.append({
        "id":          int(row["id"]),
        "name":        safe(row.get("Name")),
        "brand":       safe(row.get("Brand")),
        "year":        safe(row.get("Release_Year")),
        "gender":      safe(row.get("Gender")),
        "rating":      safe(row.get("Rating_Value")),
        "votes":       safe(row.get("Rating_Count")),
        "url":         safe(row.get("URL")),
        "image":       safe(row.get("Image_URL")),
        "accords":     row["_accords_parsed"],
        "top_notes":   safe(row.get("Top_Notes")),
        "mid_notes":   safe(row.get("Middle_Notes")),
        "base_notes":  safe(row.get("Base_Notes")),
    })

# ── Write output ──────────────────────────────────────────────────────────────
OUT_DIR.mkdir(parents=True, exist_ok=True)

frag_path = OUT_DIR / "fragrances.json"
neigh_path = OUT_DIR / "neighbors.json"

print(f"Writing {frag_path}…", flush=True)
with open(frag_path, "w", encoding="utf-8") as f:
    json.dump(fragrances, f, ensure_ascii=False, separators=(",", ":"))

print(f"Writing {neigh_path}…", flush=True)
with open(neigh_path, "w", encoding="utf-8") as f:
    json.dump(neighbors, f, separators=(",", ":"))

frag_mb  = frag_path.stat().st_size  / 1e6
neigh_mb = neigh_path.stat().st_size / 1e6
print(f"\nDone!")
print(f"  fragrances.json  : {len(fragrances):,} records  ({frag_mb:.1f} MB)")
print(f"  neighbors.json   : {len(neighbors):,} entries  ({neigh_mb:.1f} MB)")
