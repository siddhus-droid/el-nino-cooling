"""
Compares K-Means and DBSCAN clustering results using multiple internal
validation metrics and recommends the better-performing model.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.metrics import calinski_harabasz_score, davies_bouldin_score, silhouette_score

from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class ModelMetrics:
    silhouette_score: float | None
    davies_bouldin_index: float | None
    calinski_harabasz_score: float | None
    n_clusters: int


def compute_metrics(X: np.ndarray, labels: np.ndarray) -> ModelMetrics:
    """
    Compute silhouette, Davies-Bouldin, and Calinski-Harabasz scores.
    Noise points (label == -1, from DBSCAN) are excluded from scoring
    since these metrics are undefined for a "noise" pseudo-cluster.
    """
    mask = labels != -1
    X_valid, labels_valid = X[mask], labels[mask]
    n_clusters = len(set(labels_valid))

    if n_clusters < 2 or len(X_valid) <= n_clusters:
        return ModelMetrics(None, None, None, n_clusters)

    try:
        sil = float(silhouette_score(X_valid, labels_valid))
    except Exception:  # noqa: BLE001
        sil = None
    try:
        dbi = float(davies_bouldin_score(X_valid, labels_valid))
    except Exception:  # noqa: BLE001
        dbi = None
    try:
        chs = float(calinski_harabasz_score(X_valid, labels_valid))
    except Exception:  # noqa: BLE001
        chs = None

    return ModelMetrics(sil, dbi, chs, n_clusters)


def recommend_model(kmeans_metrics: ModelMetrics, dbscan_metrics: ModelMetrics) -> tuple[str, str]:
    """
    Recommend the better clustering approach using a simple weighted vote
    across the three metrics (higher silhouette = better, lower
    Davies-Bouldin = better, higher Calinski-Harabasz = better).

    Returns (recommended_model_name, human_readable_reasoning).
    """
    votes = {"kmeans": 0, "dbscan": 0}
    reasons = []

    if kmeans_metrics.silhouette_score is not None and dbscan_metrics.silhouette_score is not None:
        winner = "kmeans" if kmeans_metrics.silhouette_score >= dbscan_metrics.silhouette_score else "dbscan"
        votes[winner] += 1
        reasons.append(
            f"Silhouette Score favors {winner} "
            f"(KMeans={kmeans_metrics.silhouette_score:.3f} vs DBSCAN={dbscan_metrics.silhouette_score:.3f})."
        )
    elif kmeans_metrics.silhouette_score is not None:
        votes["kmeans"] += 1
        reasons.append("Only K-Means produced a valid Silhouette Score.")
    elif dbscan_metrics.silhouette_score is not None:
        votes["dbscan"] += 1
        reasons.append("Only DBSCAN produced a valid Silhouette Score.")

    if kmeans_metrics.davies_bouldin_index is not None and dbscan_metrics.davies_bouldin_index is not None:
        winner = "kmeans" if kmeans_metrics.davies_bouldin_index <= dbscan_metrics.davies_bouldin_index else "dbscan"
        votes[winner] += 1
        reasons.append(
            f"Davies-Bouldin Index favors {winner} (lower is better; "
            f"KMeans={kmeans_metrics.davies_bouldin_index:.3f} vs DBSCAN={dbscan_metrics.davies_bouldin_index:.3f})."
        )

    if kmeans_metrics.calinski_harabasz_score is not None and dbscan_metrics.calinski_harabasz_score is not None:
        winner = (
            "kmeans"
            if kmeans_metrics.calinski_harabasz_score >= dbscan_metrics.calinski_harabasz_score
            else "dbscan"
        )
        votes[winner] += 1
        reasons.append(
            f"Calinski-Harabasz Score favors {winner} "
            f"(KMeans={kmeans_metrics.calinski_harabasz_score:.1f} vs DBSCAN={dbscan_metrics.calinski_harabasz_score:.1f})."
        )

    if votes["kmeans"] == votes["dbscan"]:
        # Tie-break: prefer the model that doesn't discard points as noise,
        # since noise points aren't classified into a risk level.
        recommended = "kmeans"
        reasons.append("Metrics tied; K-Means preferred as it assigns every record to a cluster (no noise points).")
    else:
        recommended = "kmeans" if votes["kmeans"] > votes["dbscan"] else "dbscan"

    reasoning = " ".join(reasons)
    logger.info("Model comparison recommendation: %s", recommended)
    return recommended, reasoning
