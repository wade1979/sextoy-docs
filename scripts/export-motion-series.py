import json
import pickle
import sys

import numpy as np


PALM_KEYPOINTS = [0, 5, 9, 13, 17]


def hand_center(hand):
    keypoints = np.asarray(hand["pred_keypoints_2d"], dtype=np.float64)
    return np.nanmean(keypoints[PALM_KEYPOINTS], axis=0)


def extract_centers(results):
    frame_count = len(results)
    left = np.full((frame_count, 2), np.nan, dtype=np.float64)
    right = np.full((frame_count, 2), np.nan, dtype=np.float64)
    frame_idx = np.arange(frame_count, dtype=np.int64)
    timestamp = np.full(frame_count, np.nan, dtype=np.float64)

    for i, result in enumerate(results):
        frame_idx[i] = int(result.get("frame_idx", i))
        timestamp[i] = float(result.get("timestamp", np.nan))
        for hand in result.get("hands") or []:
            center = hand_center(hand)
            if bool(hand["right"]):
                right[i] = center
            else:
                left[i] = center

    return frame_idx, timestamp, {"left": left, "right": right}


def finite_coverage(xy):
    return float(np.mean(np.isfinite(xy[:, 0]) & np.isfinite(xy[:, 1])))


def interpolate_nans(values):
    values = values.astype(np.float64, copy=True)
    x = np.arange(len(values))
    for dim in range(values.shape[1]):
        y = values[:, dim]
        ok = np.isfinite(y)
        if ok.sum() < 2:
            raise ValueError("Not enough valid hand positions to interpolate.")
        y[~ok] = np.interp(x[~ok], x[ok], y[ok])
    return values


def moving_average(values, window):
    if window <= 1:
        return values
    window = int(window)
    if window % 2 == 0:
        window += 1
    pad = window // 2
    kernel = np.ones(window, dtype=np.float64) / window
    out = np.empty_like(values)
    for dim in range(values.shape[1]):
        padded = np.pad(values[:, dim], (pad, pad), mode="edge")
        out[:, dim] = np.convolve(padded, kernel, mode="valid")
    return out


def choose_hands(centers):
    left_cov = finite_coverage(centers["left"])
    right_cov = finite_coverage(centers["right"])
    if left_cov > 0.6 and right_cov > 0.6:
        return ["left", "right"], {"left": left_cov, "right": right_cov}
    return (["left"] if left_cov >= right_cov else ["right"]), {"left": left_cov, "right": right_cov}


def first_pca_signal(features):
    centered = features - np.mean(features, axis=0, keepdims=True)
    _, _, vt = np.linalg.svd(centered, full_matrices=False)
    signal = centered @ vt[0]
    std = np.std(signal)
    if std > 1e-9:
        signal = (signal - np.mean(signal)) / std
    return signal


def build_series(input_path, sample_step=2, smooth_sec=0.15):
    with open(input_path, "rb") as f:
        data = pickle.load(f)

    video = data["video"]
    fps = float(video["fps"])
    frame_idx, timestamp, centers = extract_centers(data["result"])
    selected_hands, coverage = choose_hands(centers)
    smooth_window = max(1, int(round(smooth_sec * fps)))

    hand_xy = {}
    feature_parts = []
    for hand_name in selected_hands:
        xy = interpolate_nans(centers[hand_name])
        xy = moving_average(xy, smooth_window)
        hand_xy[hand_name] = xy
        feature_parts.append(xy / np.array([video["width"], video["height"]], dtype=np.float64))

    # Keep non-selected hands available for display when possible.
    for hand_name in ["left", "right"]:
        if hand_name not in hand_xy and finite_coverage(centers[hand_name]) > 0:
            hand_xy[hand_name] = moving_average(interpolate_nans(centers[hand_name]), smooth_window)

    features = np.concatenate(feature_parts, axis=1)
    signal = first_pca_signal(features)

    step = max(1, int(sample_step))
    series = []
    for i in range(0, len(frame_idx), step):
        t = timestamp[i] if np.isfinite(timestamp[i]) else frame_idx[i] / fps
        row = {
            "frame": int(frame_idx[i]),
            "time": round(float(t), 4),
            "phaseSignal": round(float(signal[i]), 5),
        }
        for hand_name in ["left", "right"]:
            xy = hand_xy.get(hand_name)
            if xy is not None:
                row[hand_name] = {
                    "x": round(float(xy[i, 0]), 3),
                    "y": round(float(xy[i, 1]), 3),
                }
        series.append(row)

    return {
        "source": "processed.pkl palm center + PCA phase signal",
        "sampleStep": step,
        "selectedHands": selected_hands,
        "coverage": coverage,
        "series": series,
    }


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: export-motion-series.py input.processed.pkl output.json")
    payload = build_series(sys.argv[1])
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
