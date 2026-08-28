"""
Prediction service: handles single-record prediction against a trained
model, plus read-only accessors for cluster/metric/recommendation data.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.clustering.dbscan_model import predict_dbscan
from app.clustering.kmeans_model import predict_kmeans
from app.config import settings
from app.recommendations.recommender import get_all_recommendations, get_recommendations
from app.recommendations.risk_engine import RiskClassifier
from app.services.state import app_state
from app.utils.exceptions import ModelNotTrainedError, NoDatasetAvailableError, PredictionError
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _build_feature_vector(temperature: float, humidity: float, electricity_consumption: float) -> np.ndarray:
    if app_state.scaler is None:
        raise PredictionError(
            message="No fitted scaler available. Please run /preprocess before predicting."
        )
    raw = np.array([[temperature, humidity, electricity_consumption]])
    try:
        scaled = app_state.scaler.transform(raw)
    except Exception as exc:  # noqa: BLE001
        raise PredictionError(message=f"Failed to scale input features: {exc}") from exc
    return scaled


def predict(
    temperature: float,
    humidity: float,
    electricity_consumption: float,
    population_density: float | None,
    model_type: str,
) -> dict[str, Any]:
    """Predict cluster + risk level + recommendations for a single new record."""
    X_new = _build_feature_vector(temperature, humidity, electricity_consumption)

    if model_type == "kmeans":
        if app_state.kmeans_model is None:
            raise ModelNotTrainedError(message="K-Means model has not been trained yet. Call /train/kmeans first.")
        cluster = int(predict_kmeans(app_state.kmeans_model, X_new)[0])
        classifier_dict = app_state.get_metrics().get("kmeans_risk_classifier")
    elif model_type == "dbscan":
        if app_state.dbscan_model is None:
            raise ModelNotTrainedError(message="DBSCAN model has not been trained yet. Call /train/dbscan first.")
        train_X = app_state.get_metrics().get("dbscan_train_X")
        if not train_X:
            raise ModelNotTrainedError(message="DBSCAN training data unavailable. Please retrain the model.")
        X_train = np.array(train_X)
        cluster = int(predict_dbscan(app_state.dbscan_model, X_train, X_new)[0])
        classifier_dict = app_state.get_metrics().get("dbscan_risk_classifier")
    else:
        raise PredictionError(message=f"Unknown model_type '{model_type}'. Use 'kmeans' or 'dbscan'.")

    if not classifier_dict:
        raise ModelNotTrainedError(
            message=f"Risk classifier for '{model_type}' not found. Please retrain the model."
        )

    classifier = RiskClassifier.from_dict(classifier_dict)
    risk_level = classifier.classify(cluster, temperature, electricity_consumption)
    recommendations = get_recommendations(risk_level)

    logger.info(
        "Prediction (%s): cluster=%d risk=%s | T=%.2f H=%.2f E=%.2f",
        model_type,
        cluster,
        risk_level,
        temperature,
        humidity,
        electricity_consumption,
    )

    return {
        "cluster": cluster,
        "risk_level": risk_level,
        "cooling_demand_category": risk_level,
        "recommendations": recommendations,
        "model_used": model_type,
    }


def get_clusters(model_type: str = "kmeans") -> dict[str, Any]:
    """Return per-record cluster assignments and summary counts for a trained model."""
    if app_state.results_df is None:
        raise NoDatasetAvailableError(message="No trained results available yet.")

    cluster_col = f"{model_type}_cluster"
    risk_col = f"{model_type}_risk_level"
    df = app_state.results_df

    if cluster_col not in df.columns:
        raise ModelNotTrainedError(message=f"Model '{model_type}' has not been trained yet.")

    counts = df[cluster_col].value_counts().to_dict()
    risk_counts = df[risk_col].value_counts().to_dict() if risk_col in df.columns else {}

    return {
        "model_type": model_type,
        "total_records": len(df),
        "clusters": {
            "cluster_counts": {str(k): int(v) for k, v in counts.items()},
            "risk_level_counts": {str(k): int(v) for k, v in risk_counts.items()},
        },
    }


def get_cluster_records() -> dict[str, Any]:
    """
    Return per-record geographic + cluster data for the Geo View: one row
    per dataset record with its coordinates and (if trained) K-Means/DBSCAN
    cluster + risk level. Uses whichever of results_df (post-training,
    includes cluster columns) or processed_df (pre-training, base columns
    only) is available - never fabricates cluster assignments that don't
    exist yet.
    """
    df = app_state.results_df if app_state.results_df is not None else app_state.processed_df
    if df is None:
        raise NoDatasetAvailableError(
            message="No dataset available. Please upload and preprocess data first."
        )

    kmeans_trained = app_state.kmeans_model is not None and "kmeans_cluster" in df.columns
    dbscan_trained = app_state.dbscan_model is not None and "dbscan_cluster" in df.columns

    records: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        record: dict[str, Any] = {
            "date": row["Date"].strftime("%Y-%m-%d") if pd.notna(row["Date"]) else "",
            "city": str(row["City"]),
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
            "temperature": float(row["Temperature"]),
            "humidity": float(row["Humidity"]),
            "electricity_consumption": float(row["Electricity_Consumption"]),
        }

        if "Population_Density" in df.columns and pd.notna(row["Population_Density"]):
            record["population_density"] = float(row["Population_Density"])

        if kmeans_trained:
            record["kmeans_cluster"] = int(row["kmeans_cluster"])
            record["kmeans_risk_level"] = str(row["kmeans_risk_level"])

        if dbscan_trained:
            record["dbscan_cluster"] = int(row["dbscan_cluster"])
            record["dbscan_risk_level"] = str(row["dbscan_risk_level"])

        records.append(record)

    return {
        "total_records": len(records),
        "kmeans_trained": kmeans_trained,
        "dbscan_trained": dbscan_trained,
        "records": records,
    }


def get_metrics() -> dict[str, Any]:
    return app_state.get_metrics()


def get_recommendations_payload() -> dict[str, list[str]]:
    return get_all_recommendations()
