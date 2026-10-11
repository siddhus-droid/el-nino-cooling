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
    dataset_profile: str = "legacy"
    dataset_profile_display: str = ""
    clustering_features: list[str] = Field(default_factory=list)
    message: str


class PreprocessResponse(BaseModel):
    status: str = "success"
    rows_before: int
    rows_after: int
    duplicates_removed: int
    missing_values_handled: int
    outliers_removed: int
    columns: list[str]
    dataset_profile: str = "legacy"
    clustering_features: list[str] = Field(default_factory=list)
    message: str


# ---------------------------------------------------------------------------
# EDA
# ---------------------------------------------------------------------------
class EDAResponse(BaseModel):
    status: str = "success"
    charts: dict[str, Any]
    dataset_profile: str = "legacy"


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
    dataset_profile: str = "legacy"
    clustering_features: list[str] = Field(default_factory=list)
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
    dataset_profile: str = "legacy"
    clustering_features: list[str] = Field(default_factory=list)
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
    # Legacy-schema inputs (required only when the legacy dataset is loaded)
    humidity: Optional[float] = Field(default=None, ge=0, le=100, description="Relative humidity percentage")
    electricity_consumption: Optional[float] = Field(default=None, ge=0, description="Electricity consumption (kWh)")
    # ClimaCool real-schema inputs (STATE-level electricity)
    state_electricity_consumption: Optional[float] = Field(default=None, ge=0, description="State electricity consumption")
    oni_index: Optional[float] = Field(default=None, description="NOAA ONI index")
    population_density: Optional[float] = Field(default=None, ge=0)
    # Informational only - never used as clustering features
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
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
    is_noise: bool = False
    risk_level: str
    cooling_demand_category: str
    recommendations: list[str]
    model_used: str
    dataset_profile: str = "legacy"
    clustering_features: list[str] = Field(default_factory=list)
    oni_index: Optional[float] = None
    enso_phase: Optional[str] = None
    explanation: Optional[str] = None


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
    humidity: Optional[float] = None
    electricity_consumption: Optional[float] = None
    population_density: Optional[float] = None
    state: Optional[str] = None
    population: Optional[float] = None
    min_temperature: Optional[float] = None
    max_temperature: Optional[float] = None
    state_electricity_consumption: Optional[float] = None
    oni_index: Optional[float] = None
    enso_phase: Optional[str] = None
    kmeans_cluster: Optional[int] = None
    kmeans_risk_level: Optional[str] = None
    dbscan_cluster: Optional[int] = None
    dbscan_risk_level: Optional[str] = None


class ClusterRecordsResponse(BaseModel):
    status: str = "success"
    dataset_profile: str = "legacy"
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
