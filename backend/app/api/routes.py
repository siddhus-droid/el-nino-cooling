"""
REST API routes.

Routes contain no business logic - they parse/validate the HTTP-level
request, delegate to the service layer, and shape the HTTP response.
"""
from __future__ import annotations

from fastapi import APIRouter, File, Query, UploadFile, status
from fastapi.responses import JSONResponse

from app.models.schemas import (
    ClusterRecordsResponse,
    ClustersResponse,
    CompareResponse,
    DBSCANTrainRequest,
    DBSCANTrainResponse,
    EDAResponse,
    KMeansTrainRequest,
    KMeansTrainResponse,
    MetricsResponse,
    PredictionRequest,
    PredictionResponse,
    PreprocessResponse,
    RecommendationsResponse,
    UploadResponse,
)
from app.services import data_service, prediction_service, training_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Upload & Preprocessing
# ---------------------------------------------------------------------------
@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED, tags=["Data"])
async def upload_dataset(file: UploadFile = File(...)) -> UploadResponse:
    """Upload a raw CSV dataset. Validates required columns and stores it as the current raw dataset."""
    file_bytes = await file.read()
    result = data_service.handle_upload(file.filename, file_bytes)
    return UploadResponse(
        filename=result["filename"],
        rows=result["rows"],
        columns=result["columns"],
        dataset_profile=result["dataset_profile"],
        dataset_profile_display=result["dataset_profile_display"],
        clustering_features=result["clustering_features"],
        message="File uploaded and validated successfully.",
    )


@router.post("/preprocess", response_model=PreprocessResponse, tags=["Data"])
async def preprocess_dataset() -> PreprocessResponse:
    """Run the full preprocessing pipeline on the currently uploaded raw dataset."""
    report = data_service.handle_preprocess()
    return PreprocessResponse(
        rows_before=report["rows_before"],
        rows_after=report["rows_after"],
        duplicates_removed=report["duplicates_removed"],
        missing_values_handled=report["missing_values_handled"],
        outliers_removed=report["outliers_removed"],
        columns=report["columns"],
        dataset_profile=report["dataset_profile"],
        clustering_features=report["clustering_features"],
        message="Preprocessing completed successfully.",
    )


# ---------------------------------------------------------------------------
# EDA
# ---------------------------------------------------------------------------
@router.get("/eda", response_model=EDAResponse, tags=["EDA"])
async def get_eda() -> EDAResponse:
    """Generate exploratory data analysis charts (Plotly JSON) for the current dataset."""
    result = data_service.handle_eda()
    return EDAResponse(charts=result["charts"], dataset_profile=result["dataset_profile"])


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
@router.post("/train/kmeans", response_model=KMeansTrainResponse, tags=["Training"])
async def train_kmeans_endpoint(payload: KMeansTrainRequest = KMeansTrainRequest()) -> KMeansTrainResponse:
    """Train a K-Means model, automatically selecting k via the elbow method unless one is forced."""
    result = training_service.train_kmeans_model(
        min_k=payload.min_k, max_k=payload.max_k, forced_k=payload.k
    )
    return KMeansTrainResponse(
        optimal_k=result["optimal_k"],
        silhouette_score=result["silhouette_score"],
        inertia=result["inertia"],
        cluster_counts=result["cluster_counts"],
        elbow_scores=result["elbow_scores"],
        dataset_profile=result["dataset_profile"],
        clustering_features=result["clustering_features"],
        message="K-Means model trained successfully.",
    )


@router.post("/train/dbscan", response_model=DBSCANTrainResponse, tags=["Training"])
async def train_dbscan_endpoint(payload: DBSCANTrainRequest = DBSCANTrainRequest()) -> DBSCANTrainResponse:
    """Train a DBSCAN model, automatically tuning eps/min_samples unless provided."""
    result = training_service.train_dbscan_model(eps=payload.eps, min_samples=payload.min_samples)
    return DBSCANTrainResponse(
        eps=result["eps"],
        min_samples=result["min_samples"],
        n_clusters=result["n_clusters"],
        n_noise=result["n_noise"],
        silhouette_score=result["silhouette_score"],
        cluster_counts=result["cluster_counts"],
        dataset_profile=result["dataset_profile"],
        clustering_features=result["clustering_features"],
        message="DBSCAN model trained successfully.",
    )


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------
@router.get("/compare", response_model=CompareResponse, tags=["Training"])
async def compare_models_endpoint() -> CompareResponse:
    """Compare K-Means vs DBSCAN using Silhouette, Davies-Bouldin, and Calinski-Harabasz metrics."""
    result = training_service.compare_models()
    return CompareResponse(
        kmeans=result["kmeans"],
        dbscan=result["dbscan"],
        recommended_model=result["recommended_model"],
        reasoning=result["reasoning"],
    )


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------
@router.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict_endpoint(payload: PredictionRequest) -> PredictionResponse:
    """Predict the cluster, risk level, and recommendations for a new record."""
    result = prediction_service.predict(
        temperature=payload.temperature,
        humidity=payload.humidity,
        electricity_consumption=payload.electricity_consumption,
        state_electricity_consumption=payload.state_electricity_consumption,
        oni_index=payload.oni_index,
        population_density=payload.population_density,
        model_type=payload.model_type,
    )
    return PredictionResponse(**result)


# ---------------------------------------------------------------------------
# Clusters / Metrics / Recommendations
# ---------------------------------------------------------------------------
@router.get("/clusters", response_model=ClustersResponse, tags=["Results"])
async def get_clusters_endpoint(
    model_type: str = Query(default="kmeans", pattern="^(kmeans|dbscan)$")
) -> ClustersResponse:
    """Get cluster assignment summaries (counts per cluster / risk level) for a trained model."""
    result = prediction_service.get_clusters(model_type=model_type)
    return ClustersResponse(**result)


@router.get("/clusters/records", response_model=ClusterRecordsResponse, tags=["Results"])
async def get_cluster_records_endpoint() -> ClusterRecordsResponse:
    """
    Get per-record geographic data (city, latitude, longitude, readings,
    and K-Means/DBSCAN cluster + risk level where trained) for map
    visualization. kmeans_trained/dbscan_trained flags indicate whether
    each model's cluster fields are populated yet.
    """
    result = prediction_service.get_cluster_records()
    return ClusterRecordsResponse(**result)


@router.get("/metrics", response_model=MetricsResponse, tags=["Results"])
async def get_metrics_endpoint() -> MetricsResponse:
    """Get all stored metrics: preprocessing report, training metrics, and comparison results."""
    metrics = prediction_service.get_metrics()
    # Avoid shipping the raw DBSCAN training matrix back to clients; it's
    # internal state used only for nearest-neighbor prediction.
    metrics = {k: v for k, v in metrics.items() if k != "dbscan_train_X"}
    return MetricsResponse(metrics=metrics)


@router.get("/recommendations", response_model=RecommendationsResponse, tags=["Results"])
async def get_recommendations_endpoint() -> RecommendationsResponse:
    """Get the full risk-level -> recommendations mapping used by the recommendation engine."""
    recs = prediction_service.get_recommendations_payload()
    return RecommendationsResponse(recommendations_by_risk_level=recs)
