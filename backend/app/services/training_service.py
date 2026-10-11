"""
Training service: orchestrates K-Means / DBSCAN training, persists
trained models + risk classifiers, and runs model comparison.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.clustering import comparator
from app.clustering.dbscan_model import train_dbscan
from app.clustering.kmeans_model import train_kmeans
from app.config import DatasetProfile
from app.recommendations.risk_engine import RiskClassifier
from app.services.state import app_state
from app.utils.exceptions import ModelNotTrainedError, NoDatasetAvailableError
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _get_feature_matrix() -> tuple[pd.DataFrame, np.ndarray, DatasetProfile]:
    if app_state.processed_df is None:
        raise NoDatasetAvailableError(
            message="No processed dataset found. Please upload and preprocess data first."
        )
    df = app_state.processed_df
    profile = app_state.dataset_profile
    scaled_cols = [f"{c}_scaled" for c in profile.clustering_features]
    missing = [c for c in scaled_cols if c not in df.columns]
    if missing:
        raise NoDatasetAvailableError(
            message=f"Processed dataset is missing scaled feature columns {missing}. Re-run /preprocess."
        )
    X = df[scaled_cols].to_numpy()
    return df, X, profile


def _sync_results_column(df: pd.DataFrame, col_name: str, values: np.ndarray) -> pd.DataFrame:
    """Merge a new label/risk column into the persisted results dataframe."""
    base = app_state.results_df if app_state.results_df is not None else df.copy()
    if len(base) != len(df):
        base = df.copy()
    base[col_name] = values
    return base


def train_kmeans_model(min_k: int | None, max_k: int | None, forced_k: int | None) -> dict[str, Any]:
    df, X, profile = _get_feature_matrix()

    result = train_kmeans(X, min_k=min_k, max_k=max_k, forced_k=forced_k)

    working = df.copy()
    working["kmeans_cluster"] = result.labels

    risk_classifier = RiskClassifier.fit(
        working,
        cluster_col="kmeans_cluster",
        temperature_col=profile.temperature_col,
        electricity_col=profile.consumption_col,
    )
    working["kmeans_risk_level"] = risk_classifier.classify_series(
        working["kmeans_cluster"], working[profile.temperature_col], working[profile.consumption_col]
    )

    app_state.save_kmeans(result.model)
    app_state.update_metrics("kmeans_risk_classifier", risk_classifier.to_dict())

    results_df = _sync_results_column(working, "kmeans_cluster", result.labels)
    results_df["kmeans_risk_level"] = working["kmeans_risk_level"].values
    app_state.save_results(results_df)

    cluster_counts = working["kmeans_cluster"].value_counts().to_dict()
    cluster_counts = {str(k): int(v) for k, v in cluster_counts.items()}

    metrics_payload = {
        "optimal_k": result.optimal_k,
        "silhouette_score": result.silhouette,
        "inertia": result.inertia,
        "cluster_counts": cluster_counts,
    }
    app_state.update_metrics("kmeans", metrics_payload)

    return {
        "optimal_k": result.optimal_k,
        "silhouette_score": result.silhouette,
        "inertia": result.inertia,
        "cluster_counts": cluster_counts,
        "elbow_scores": result.elbow_scores,
        "dataset_profile": profile.name,
        "clustering_features": list(profile.clustering_features),
    }


def train_dbscan_model(eps: float | None, min_samples: int | None) -> dict[str, Any]:
    df, X, profile = _get_feature_matrix()

    result = train_dbscan(X, eps=eps, min_samples=min_samples)

    working = df.copy()
    working["dbscan_cluster"] = result.labels

    risk_classifier = RiskClassifier.fit(
        working,
        cluster_col="dbscan_cluster",
        temperature_col=profile.temperature_col,
        electricity_col=profile.consumption_col,
    )
    working["dbscan_risk_level"] = risk_classifier.classify_series(
        working["dbscan_cluster"], working[profile.temperature_col], working[profile.consumption_col]
    )

    app_state.save_dbscan(result.model)
    app_state.update_metrics("dbscan_risk_classifier", risk_classifier.to_dict())
    # Store the training feature matrix alongside the model so we can do
    # nearest-neighbor based prediction later (DBSCAN has no .predict()).
    app_state.update_metrics("dbscan_train_X", X.tolist())

    results_df = _sync_results_column(working, "dbscan_cluster", result.labels)
    results_df["dbscan_risk_level"] = working["dbscan_risk_level"].values
    app_state.save_results(results_df)

    cluster_counts = working["dbscan_cluster"].value_counts().to_dict()
    cluster_counts = {str(k): int(v) for k, v in cluster_counts.items()}

    metrics_payload = {
        "eps": result.eps,
        "min_samples": result.min_samples,
        "n_clusters": result.n_clusters,
        "n_noise": result.n_noise,
        "silhouette_score": result.silhouette,
        "cluster_counts": cluster_counts,
    }
    app_state.update_metrics("dbscan", metrics_payload)

    return {
        "eps": result.eps,
        "min_samples": result.min_samples,
        "n_clusters": result.n_clusters,
        "n_noise": result.n_noise,
        "silhouette_score": result.silhouette,
        "cluster_counts": cluster_counts,
        "dataset_profile": profile.name,
        "clustering_features": list(profile.clustering_features),
    }


def compare_models() -> dict[str, Any]:
    if app_state.kmeans_model is None or app_state.dbscan_model is None:
        raise ModelNotTrainedError(
            message="Both K-Means and DBSCAN must be trained before comparison. "
            "Call /train/kmeans and /train/dbscan first."
        )

    df, X, profile = _get_feature_matrix()
    results = app_state.results_df

    if results is None or "kmeans_cluster" not in results.columns or "dbscan_cluster" not in results.columns:
        raise ModelNotTrainedError(message="Trained cluster labels not found. Please retrain both models.")

    kmeans_labels = results["kmeans_cluster"].to_numpy()
    dbscan_labels = results["dbscan_cluster"].to_numpy()

    kmeans_metrics = comparator.compute_metrics(X, kmeans_labels)
    dbscan_metrics = comparator.compute_metrics(X, dbscan_labels)

    recommended, reasoning = comparator.recommend_model(kmeans_metrics, dbscan_metrics)

    payload = {
        "kmeans": kmeans_metrics.__dict__,
        "dbscan": dbscan_metrics.__dict__,
        "recommended_model": recommended,
        "reasoning": reasoning,
    }
    app_state.update_metrics("comparison", payload)
    return payload
