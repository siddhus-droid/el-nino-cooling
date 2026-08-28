"""
Central configuration for the application.

All environment-driven settings live here so the rest of the codebase
never reads os.environ directly.
"""
from __future__ import annotations

import os
from pathlib import Path


class Settings:
    """Application settings, overridable via environment variables."""

    # --- Paths -----------------------------------------------------------
    BASE_DIR: Path = Path(__file__).resolve().parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    DATASET_DIR: Path = BASE_DIR / "datasets"
    STORAGE_DIR: Path = BASE_DIR / "storage"
    MODEL_DIR: Path = STORAGE_DIR / "models"
    DATA_DIR: Path = STORAGE_DIR / "data"

    # Note: datasets are persisted with pandas' pickle format rather than
    # parquet so the project has no native (pyarrow/fastparquet) build
    # dependency - keeps `pip install -r requirements.txt` fast and
    # dependency-light.
    RAW_DATA_FILE: Path = DATA_DIR / "raw_dataset.pkl"
    PROCESSED_DATA_FILE: Path = DATA_DIR / "processed_dataset.pkl"
    KMEANS_MODEL_FILE: Path = MODEL_DIR / "kmeans_model.joblib"
    DBSCAN_MODEL_FILE: Path = MODEL_DIR / "dbscan_model.joblib"
    SCALER_FILE: Path = MODEL_DIR / "scaler.joblib"
    METRICS_FILE: Path = DATA_DIR / "metrics.json"
    RESULTS_FILE: Path = DATA_DIR / "results_dataset.pkl"

    # --- Dataset schema ----------------------------------------------------
    REQUIRED_COLUMNS: tuple = (
        "Date",
        "City",
        "Latitude",
        "Longitude",
        "Temperature",
        "Humidity",
        "Electricity_Consumption",
    )

    NUMERIC_COLUMNS: tuple = (
        "Latitude",
        "Longitude",
        "Temperature",
        "Humidity",
        "Electricity_Consumption",
    )

    # Features actually fed into the clustering algorithms
    CLUSTERING_FEATURES: tuple = (
        "Temperature",
        "Humidity",
        "Electricity_Consumption",
    )

    OPTIONAL_COLUMNS: tuple = ("Population_Density",)

    # --- Preprocessing -------------------------------------------------
    OUTLIER_Z_THRESHOLD: float = 3.0
    MAX_ROWS: int = 100_000

    # --- Clustering ------------------------------------------------------
    KMEANS_MIN_K: int = 2
    KMEANS_MAX_K: int = 10
    DBSCAN_EPS_CANDIDATES: tuple = (0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5)
    DBSCAN_MIN_SAMPLES_CANDIDATES: tuple = (3, 5, 8, 10)

    # --- Misc ------------------------------------------------------------
    APP_NAME: str = "El Nino Urban Cooling Impact Assessment API"
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    def ensure_directories(self) -> None:
        """Create every directory this app writes to, if missing."""
        for path in (
            self.UPLOAD_DIR,
            self.DATASET_DIR,
            self.STORAGE_DIR,
            self.MODEL_DIR,
            self.DATA_DIR,
        ):
            path.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()
