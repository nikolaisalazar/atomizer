"""
Smoke test for the UMAP coordinate scaling logic used in precompute.py.
Run from the /scripts directory:  python test_umap_scaling.py
"""
import numpy as np


def scale_to_canvas(umap_2d: np.ndarray, canvas_range: float = 10000) -> np.ndarray:
    """Scale UMAP output to [-canvas_range/2, canvas_range/2] per axis."""
    result = umap_2d.copy().astype(float)
    for axis in range(result.shape[1]):
        col = result[:, axis]
        mn, mx = col.min(), col.max()
        result[:, axis] = ((col - mn) / (mx - mn) - 0.5) * canvas_range
    return result


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_min_maps_to_negative_half_range():
    raw = np.array([[0.0, 0.0], [1.0, 0.0], [0.5, 1.0]])
    scaled = scale_to_canvas(raw)
    assert scaled[0, 0] == -5000.0, f"min should be -5000, got {scaled[0, 0]}"
    print("PASS: min maps to -5000")


def test_max_maps_to_positive_half_range():
    raw = np.array([[0.0, 0.0], [1.0, 0.0], [0.5, 1.0]])
    scaled = scale_to_canvas(raw)
    assert scaled[1, 0] == 5000.0, f"max should be 5000, got {scaled[1, 0]}"
    print("PASS: max maps to +5000")


def test_midpoint_maps_to_zero():
    raw = np.array([[0.0, 0.0], [1.0, 0.0], [0.5, 1.0]])
    scaled = scale_to_canvas(raw)
    assert scaled[2, 0] == 0.0, f"midpoint should be 0, got {scaled[2, 0]}"
    print("PASS: midpoint maps to 0")


def test_y_axis_scaled_independently():
    raw = np.array([[0.0, 0.0], [1.0, 0.0], [0.5, 1.0]])
    scaled = scale_to_canvas(raw)
    assert scaled[0, 1] == -5000.0, f"y-min should be -5000, got {scaled[0, 1]}"
    assert scaled[2, 1] == 5000.0, f"y-max should be 5000, got {scaled[2, 1]}"
    print("PASS: y-axis scaled independently")


def test_output_shape_preserved():
    raw = np.random.rand(100, 2)
    scaled = scale_to_canvas(raw)
    assert scaled.shape == (100, 2), f"shape should be (100, 2), got {scaled.shape}"
    print("PASS: output shape preserved")


def test_custom_canvas_range():
    raw = np.array([[0.0], [1.0]])
    scaled = scale_to_canvas(raw, canvas_range=200)
    assert scaled[0, 0] == -100.0
    assert scaled[1, 0] == 100.0
    print("PASS: custom canvas range")


if __name__ == "__main__":
    test_min_maps_to_negative_half_range()
    test_max_maps_to_positive_half_range()
    test_midpoint_maps_to_zero()
    test_y_axis_scaled_independently()
    test_output_shape_preserved()
    test_custom_canvas_range()
    print("\nAll scaling tests passed!")
