"""
K-Means clustering with automatic elbow-method k selection and
silhouette scoring.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

from app.config import settings
from app.utils.exceptions import ClusteringError
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class KMeansResult:
    model: KMeans
    optimal_k: int
    silhouette: float
    inertia: float
    labels: np.ndarray
    elbow_scores: dict = field(default_factory=dict)  # k -> inertia


def find_optimal_k(
    X: np.ndarray,
    min_k: int = settings.KMEANS_MIN_K,
    max_k: int = settings.KMEANS_MAX_K,
) -> tuple[int, dict]:
    """
    Automatic elbow method: fit KMeans for k in [min_k, max_k], compute
    inertia for each, and pick the k at the "elbow" using the
    maximum-distance-from-chord heuristic (a standard, deterministic way
    to automate elbow detection without eyeballing a plot).
    """
    max_k = min(max_k, len(X) - 1) if len(X) > min_k else min_k
    if max_k < min_k:
        max_k = min_k

    inertias = {}
    for k in range(min_k, max_k + 1):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        km.fit(X)
        inertias[k] = float(km.inertia_)

    ks = np.array(list(inertias.keys()), dtype=float)
    values = np.array(list(inertias.values()), dtype=float)

    if len(ks) <= 2:
        optimal_k = int(ks[0])
        return optimal_k, {str(k): v for k, v in inertias.items()}

    # Normalize to unit square, then find point of max distance from the
    # straight line connecting the first and last points (elbow heuristic).
    x_norm = (ks - ks.min()) / (ks.max() - ks.min() + 1e-12)
    y_norm = (values - values.min()) / (values.max() - values.min() + 1e-12)

    p1 = np.array([x_norm[0], y_norm[0]])
    p2 = np.array([x_norm[-1], y_norm[-1]])
    line_vec = p2 - p1
    line_vec_norm = line_vec / (np.linalg.norm(line_vec) + 1e-12)

    distances = []
    for x, y in zip(x_norm, y_norm):
        point = np.array([x, y]) - p1
        proj_len = np.dot(point, line_vec_norm)
        proj_point = proj_len * line_vec_norm
        distances.append(np.linalg.norm(point - proj_point))

    elbow_idx = int(np.argmax(distances))
    optimal_k = int(ks[elbow_idx])

    return optimal_k, {str(k): v for k, v in inertias.items()}


def train_kmeans(
    X: np.ndarray,
    min_k: int | None = None,
    max_k: int | None = None,
    forced_k: int | None = None,
) -> KMeansResult:
    """
    Train K-Means, either at a forced k or using automatic elbow-method
    k selection, and compute the silhouette score.
    """
    if len(X) < settings.KMEANS_MIN_K:
        raise ClusteringError(
            message=f"Not enough samples ({len(X)}) to perform K-Means clustering."
        )

    min_k = min_k or settings.KMEANS_MIN_K
    max_k = max_k or settings.KMEANS_MAX_K

    if forced_k is not None:
        optimal_k = forced_k
        elbow_scores = {}
    else:
        optimal_k, elbow_scores = find_optimal_k(X, min_k, max_k)

    try:
        model = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
        labels = model.fit_predict(X)
    except Exception as exc:  # noqa: BLE001
        raise ClusteringError(message=f"K-Means training failed: {exc}") from exc

    try:
        sil = float(silhouette_score(X, labels)) if optimal_k > 1 else -1.0
    except Exception:  # noqa: BLE001
        sil = -1.0

    logger.info("K-Means trained: k=%d, silhouette=%.4f", optimal_k, sil)

    return KMeansResult(
        model=model,
        optimal_k=optimal_k,
        silhouette=sil,
        inertia=float(model.inertia_),
        labels=labels,
        elbow_scores=elbow_scores,
    )


def predict_kmeans(model: KMeans, X: np.ndarray) -> np.ndarray:
    return model.predict(X)
