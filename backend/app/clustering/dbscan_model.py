"""
DBSCAN clustering with automatic (eps, min_samples) parameter tuning
and noise detection.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score
from sklearn.neighbors import NearestNeighbors

from app.config import settings
from app.utils.exceptions import ClusteringError
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class DBSCANResult:
    model: DBSCAN
    eps: float
    min_samples: int
    labels: np.ndarray
    n_clusters: int
    n_noise: int
    silhouette: float | None
    search_log: list = field(default_factory=list)


def suggest_eps(X: np.ndarray, min_samples: int) -> float:
    """
    Use the k-distance graph heuristic (Ester et al.) to suggest a
    reasonable eps: fit k-NN with k=min_samples, sort the distances to
    the k-th neighbor, and pick the point of maximum curvature.
    """
    k = max(min_samples, 2)
    k = min(k, len(X) - 1) if len(X) > 1 else 1
    nn = NearestNeighbors(n_neighbors=k)
    nn.fit(X)
    distances, _ = nn.kneighbors(X)
    k_distances = np.sort(distances[:, -1])

    # Elbow via max-distance-from-chord, same heuristic used for K-Means.
    y = k_distances
    x = np.arange(len(y))
    if len(x) < 3:
        return float(np.median(y)) if len(y) else 0.5

    x_norm = (x - x.min()) / (x.max() - x.min() + 1e-12)
    y_norm = (y - y.min()) / (y.max() - y.min() + 1e-12)
    p1, p2 = np.array([x_norm[0], y_norm[0]]), np.array([x_norm[-1], y_norm[-1]])
    line_vec = p2 - p1
    line_vec_norm = line_vec / (np.linalg.norm(line_vec) + 1e-12)

    distances_from_line = []
    for xi, yi in zip(x_norm, y_norm):
        point = np.array([xi, yi]) - p1
        proj = np.dot(point, line_vec_norm) * line_vec_norm
        distances_from_line.append(np.linalg.norm(point - proj))

    elbow_idx = int(np.argmax(distances_from_line))
    return float(k_distances[elbow_idx]) if k_distances[elbow_idx] > 0 else float(np.median(y))


def train_dbscan(
    X: np.ndarray,
    eps: float | None = None,
    min_samples: int | None = None,
) -> DBSCANResult:
    """
    Train DBSCAN. If eps/min_samples are not provided, perform an
    automatic grid search over candidate parameters (see config), scoring
    each combination by silhouette score (excluding noise points), and
    pick the best-scoring, non-degenerate result.
    """
    if len(X) < 5:
        raise ClusteringError(message=f"Not enough samples ({len(X)}) to perform DBSCAN clustering.")

    search_log = []

    if eps is not None and min_samples is not None:
        candidates = [(eps, min_samples)]
    else:
        min_samples_candidates = (
            [min_samples] if min_samples is not None else list(settings.DBSCAN_MIN_SAMPLES_CANDIDATES)
        )
        candidates = []
        for ms in min_samples_candidates:
            if eps is not None:
                candidates.append((eps, ms))
            else:
                suggested = suggest_eps(X, ms)
                # Search around the suggested eps as well as fixed candidates
                eps_pool = sorted(set(list(settings.DBSCAN_EPS_CANDIDATES) + [round(suggested, 3)]))
                for e in eps_pool:
                    candidates.append((e, ms))

    best = None
    for eps_c, ms_c in candidates:
        try:
            model = DBSCAN(eps=eps_c, min_samples=ms_c)
            labels = model.fit_predict(X)
        except Exception as exc:  # noqa: BLE001
            search_log.append({"eps": eps_c, "min_samples": ms_c, "error": str(exc)})
            continue

        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = int(np.sum(labels == -1))
        noise_ratio = n_noise / len(labels)

        sil = None
        if n_clusters > 1:
            mask = labels != -1
            if mask.sum() > n_clusters:
                try:
                    sil = float(silhouette_score(X[mask], labels[mask]))
                except Exception:  # noqa: BLE001
                    sil = None

        search_log.append(
            {
                "eps": eps_c,
                "min_samples": ms_c,
                "n_clusters": n_clusters,
                "n_noise": n_noise,
                "noise_ratio": round(noise_ratio, 4),
                "silhouette": sil,
            }
        )

        # Reject degenerate results: 0 or 1 cluster, or almost everything is noise
        if n_clusters < 2 or noise_ratio > 0.5:
            continue

        score = sil if sil is not None else -1.0
        if best is None or score > best["score"]:
            best = {
                "model": model,
                "labels": labels,
                "eps": eps_c,
                "min_samples": ms_c,
                "n_clusters": n_clusters,
                "n_noise": n_noise,
                "silhouette": sil,
                "score": score,
            }

    if best is None:
        # Fall back to the single best-scoring candidate even if degenerate,
        # rather than failing outright.
        fallback_eps = eps or settings.DBSCAN_EPS_CANDIDATES[len(settings.DBSCAN_EPS_CANDIDATES) // 2]
        fallback_ms = min_samples or settings.DBSCAN_MIN_SAMPLES_CANDIDATES[0]
        model = DBSCAN(eps=fallback_eps, min_samples=fallback_ms)
        labels = model.fit_predict(X)
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = int(np.sum(labels == -1))
        sil = None
        logger.warning(
            "DBSCAN auto-tuning found no good parameter combination; using fallback eps=%.3f, min_samples=%d",
            fallback_eps,
            fallback_ms,
        )
        best = {
            "model": model,
            "labels": labels,
            "eps": fallback_eps,
            "min_samples": fallback_ms,
            "n_clusters": n_clusters,
            "n_noise": n_noise,
            "silhouette": sil,
        }

    logger.info(
        "DBSCAN trained: eps=%.3f, min_samples=%d, clusters=%d, noise=%d",
        best["eps"],
        best["min_samples"],
        best["n_clusters"],
        best["n_noise"],
    )

    return DBSCANResult(
        model=best["model"],
        eps=best["eps"],
        min_samples=best["min_samples"],
        labels=best["labels"],
        n_clusters=best["n_clusters"],
        n_noise=best["n_noise"],
        silhouette=best["silhouette"],
        search_log=search_log,
    )


def predict_dbscan(model: DBSCAN, X_train: np.ndarray, X_new: np.ndarray) -> np.ndarray:
    """
    DBSCAN has no native `.predict`. We approximate prediction for new
    points by assigning each new point the label of its nearest core/
    training point (a standard, well-understood workaround).
    """
    nn = NearestNeighbors(n_neighbors=1)
    nn.fit(X_train)
    _, indices = nn.kneighbors(X_new)
    return model.labels_[indices.flatten()]
