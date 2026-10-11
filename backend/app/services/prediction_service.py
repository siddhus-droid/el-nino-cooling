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
from app.recommendations.risk_engine import NOISE_LABEL, RiskClassifier
from app.services.state import app_state
from app.utils.enso import classify_oni
from app.utils.exceptions import ModelNotTrainedError, NoDatasetAvailableError, PredictionError
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _build_feature_values(
    profile_features: tuple, inputs: dict[str, float | None]
) -> dict[str, float | None]:
    """Map the request inputs onto the active profile's clustering feature names."""
    return {f: inputs.get(f) for f in profile_features}


def _build_feature_vector(values: dict[str, float | None]) -> np.ndarray:
    if app_state.scaler is None:
        raise PredictionError(
            message="No fitted scaler available. Please run /preprocess before predicting."
        )
    missing = [k for k, v in values.items() if v is None]
    if missing:
        raise PredictionError(
            message=f"Missing required input(s) for the current dataset: {missing}",
            details={"missing_fields": missing, "required": list(values.keys())},
        )
    raw = np.array([[float(v) for v in values.values()]])
    try:
        scaled = app_state.scaler.transform(raw)
    except Exception as exc:  # noqa: BLE001
        raise PredictionError(message=f"Failed to scale input features: {exc}") from exc
    return scaled


def predict(
    temperature: float,
    humidity: float | None,
    electricity_consumption: float | None,
    state_electricity_consumption: float | None,
    oni_index: float | None,
    population_density: float | None,
    model_type: str,
) -> dict[str, Any]:
    """Predict cluster + risk level + recommendations for a single new record."""
    profile = app_state.dataset_profile
    inputs: dict[str, float | None] = {
        "Temperature": temperature,
        "Humidity": humidity,
        "Electricity_Consumption": electricity_consumption,
        "State_Electricity_Consumption": state_electricity_consumption,
        "ONI_Index": oni_index,
    }
    values = _build_feature_values(profile.clustering_features, inputs)
    X_new = _build_feature_vector(values)
    consumption_value = inputs.get(profile.consumption_col)

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
    risk_level = classifier.classify(cluster, temperature, consumption_value)
    is_noise = risk_level == NOISE_LABEL

    if is_noise:
        recommendations: list[str] = []
        explanation = (
            "DBSCAN identified this input as a noise/outlier point rather than "
            "assigning it to a learned cluster. A cooling-demand risk level cannot "
            "be reliably inferred from the DBSCAN cluster assignment."
        )
    else:
        recommendations = get_recommendations(risk_level)
        explanation = None

    enso_phase = None
    if profile.name == "climacool_real" and oni_index is not None:
        enso_phase = classify_oni(float(oni_index))

    logger.info("Prediction (%s): cluster=%d risk=%s | %s", model_type, cluster, risk_level, values)

    return {
        "cluster": cluster,
        "is_noise": is_noise,
        "risk_level": risk_level,
        "cooling_demand_category": risk_level,
        "recommendations": recommendations,
        "explanation": explanation,
        "model_used": model_type,
        "dataset_profile": profile.name,
        "clustering_features": list(profile.clustering_features),
        "oni_index": oni_index if profile.name == "climacool_real" else None,
        "enso_phase": enso_phase,
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

    profile = app_state.dataset_profile
    # Optional output field -> source column; populated only if the column exists.
    optional_fields = {
        "humidity": ("Humidity", float),
        "electricity_consumption": ("Electricity_Consumption", float),
        "population_density": ("Population_Density", float),
        "state": ("State", str),
        "population": ("Population", float),
        "min_temperature": ("Min_Temperature", float),
        "max_temperature": ("Max_Temperature", float),
        "state_electricity_consumption": ("State_Electricity_Consumption", float),
        "oni_index": ("ONI_Index", float),
        "enso_phase": ("ENSO_Phase", str),
    }

    records: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        record: dict[str, Any] = {
            "date": row["Date"].strftime("%Y-%m-%d") if pd.notna(row["Date"]) else "",
            "city": str(row["City"]),
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
            "temperature": float(row["Temperature"]),
        }
        for out_key, (col, cast) in optional_fields.items():
            if col in df.columns and pd.notna(row[col]):
                record[out_key] = cast(row[col])

        if kmeans_trained:
            record["kmeans_cluster"] = int(row["kmeans_cluster"])
            record["kmeans_risk_level"] = str(row["kmeans_risk_level"])

        if dbscan_trained:
            record["dbscan_cluster"] = int(row["dbscan_cluster"])
            record["dbscan_risk_level"] = str(row["dbscan_risk_level"])

        records.append(record)

    return {
        "dataset_profile": profile.name,
        "total_records": len(records),
        "kmeans_trained": kmeans_trained,
        "dbscan_trained": dbscan_trained,
        "records": records,
    }


def get_metrics() -> dict[str, Any]:
    return app_state.get_metrics()


def get_recommendations_payload() -> dict[str, list[str]]:
    return get_all_recommendations()
