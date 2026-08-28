"""
Pydantic models (schemas) used across the API for request validation
and response serialization.
"""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Generic / shared
# ---------------------------------------------------------------------------
class MessageResponse(BaseModel):
    status: str = "success"
    message: str


class ErrorResponse(BaseModel):
    status: str = "error"
    error_type: str
    message: str
    details: dict = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Upload / preprocess
# ---------------------------------------------------------------------------
class UploadResponse(BaseModel):
    status: str = "success"
    filename: str
    rows: int
    columns: list[str]
    message: str


class PreprocessResponse(BaseModel):
    status: str = "success"
    rows_before: int
    rows_after: int
    duplicates_removed: int
    missing_values_handled: int
    outliers_removed: int
    columns: list[str]
    message: str


# ---------------------------------------------------------------------------
# EDA
# ---------------------------------------------------------------------------
class EDAResponse(BaseModel):
    status: str = "success"
    charts: dict[str, Any]


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
class KMeansTrainRequest(BaseModel):
    min_k: Optional[int] = Field(default=None, ge=2, le=20)
    max_k: Optional[int] = Field(default=None, ge=2, le=20)
    k: Optional[int] = Field(
        default=None, ge=2, le=20, description="Force a specific k, skipping elbow search."
    )


class KMeansTrainResponse(BaseModel):
    status: str = "success"
    optimal_k: int
    silhouette_score: float
    inertia: float
    cluster_counts: dict[str, int]
    elbow_scores: dict[str, float]
    message: str


class DBSCANTrainRequest(BaseModel):
    eps: Optional[float] = Field(default=None, gt=0)
    min_samples: Optional[int] = Field(default=None, ge=1)


class DBSCANTrainResponse(BaseModel):
    status: str = "success"
    eps: float
    min_samples: int
    n_clusters: int
    n_noise: int
    silhouette_score: Optional[float]
    cluster_counts: dict[str, int]
    message: str


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------
class ClusterMetrics(BaseModel):
    silhouette_score: Optional[float]
    davies_bouldin_index: Optional[float]
    calinski_harabasz_score: Optional[float]
    n_clusters: int


class CompareResponse(BaseModel):
    status: str = "success"
    kmeans: ClusterMetrics
    dbscan: ClusterMetrics
    recommended_model: str
    reasoning: str


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------
class PredictionRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    temperature: float = Field(..., description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity percentage")
    electricity_consumption: float = Field(..., ge=0, description="Electricity consumption (kWh)")
    population_density: Optional[float] = Field(default=None, ge=0)
    model_type: str = Field(default="kmeans", description="'kmeans' or 'dbscan'")

    @field_validator("model_type")
    @classmethod
    def validate_model_type(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ("kmeans", "dbscan"):
            raise ValueError("model_type must be 'kmeans' or 'dbscan'")
        return v


class PredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    status: str = "success"
    cluster: int
    risk_level: str
    cooling_demand_category: str
    recommendations: list[str]
    model_used: str


# ---------------------------------------------------------------------------
# Clusters / metrics / recommendations
# ---------------------------------------------------------------------------
class ClustersResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    status: str = "success"
    model_type: str
    total_records: int
    clusters: dict[str, Any]


class ClusterRecordItem(BaseModel):
    """
    One row of the dataset with its coordinates and (if trained) cluster
    assignments. kmeans_cluster/dbscan_cluster and their risk levels are
    None when the corresponding model hasn't been trained yet - never
    fabricated.
    """

    model_config = ConfigDict(protected_namespaces=())
    date: str
    city: str
    latitude: float
    longitude: float
    temperature: float
    humidity: float
    electricity_consumption: float
    population_density: Optional[float] = None
    kmeans_cluster: Optional[int] = None
    kmeans_risk_level: Optional[str] = None
    dbscan_cluster: Optional[int] = None
    dbscan_risk_level: Optional[str] = None


class ClusterRecordsResponse(BaseModel):
    status: str = "success"
    total_records: int
    kmeans_trained: bool
    dbscan_trained: bool
    records: list[ClusterRecordItem]


class MetricsResponse(BaseModel):
    status: str = "success"
    metrics: dict[str, Any]


class RecommendationsResponse(BaseModel):
    status: str = "success"
    recommendations_by_risk_level: dict[str, list[str]]
