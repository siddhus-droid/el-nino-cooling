"""
Central configuration for the application.

All environment-driven settings live here so the rest of the codebase
never reads os.environ directly.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DatasetProfile:
    """
    Describes one supported CSV schema. The clustering feature list lives
    here (the single place to change it) rather than being hardcoded in
    preprocessing / training / prediction.
    """

    name: str
    display_name: str
    required_columns: tuple
    optional_columns: tuple
    numeric_columns: tuple
    categorical_columns: tuple
    clustering_features: tuple
    temperature_col: str
    consumption_col: str


# Original test-data schema (kept working for backward compatibility).
LEGACY_PROFILE = DatasetProfile(
    name="legacy",
    display_name="Legacy schema (Temperature / Humidity / Electricity)",
    required_columns=(
        "Date", "City", "Latitude", "Longitude",
        "Temperature", "Humidity", "Electricity_Consumption",
    ),
    optional_columns=("Population_Density",),
    numeric_columns=(
        "Latitude", "Longitude", "Temperature", "Humidity", "Electricity_Consumption",
    ),
    categorical_columns=(),
    clustering_features=("Temperature", "Humidity", "Electricity_Consumption"),
    temperature_col="Temperature",
    consumption_col="Electricity_Consumption",
)

# Real combined dataset (ClimaCool_AI_Real_Combined_2017_2019.csv).
# Electricity is STATE-level. Latitude/Longitude/City/Date/ENSO_Phase and
# Population are intentionally NOT clustering features.
CLIMACOOL_REAL_PROFILE = DatasetProfile(
    name="climacool_real",
    display_name="ClimaCool real combined dataset",
    required_columns=(
        "Date", "City", "Latitude", "Longitude",
        "Temperature", "State_Electricity_Consumption", "ONI_Index",
    ),
    optional_columns=(
        "State", "Population", "Min_Temperature", "Max_Temperature", "ENSO_Phase",
    ),
    numeric_columns=(
        "Latitude", "Longitude", "Population", "Temperature", "Min_Temperature",
        "Max_Temperature", "State_Electricity_Consumption", "ONI_Index",
    ),
    categorical_columns=("State", "ENSO_Phase"),
    clustering_features=("Temperature", "State_Electricity_Consumption", "ONI_Index"),
    temperature_col="Temperature",
    consumption_col="State_Electricity_Consumption",
)

# Order matters: the first profile whose required columns are all present wins.
DATASET_PROFILES: tuple = (CLIMACOOL_REAL_PROFILE, LEGACY_PROFILE)


def get_profile_by_name(name: str | None) -> DatasetProfile:
    for profile in DATASET_PROFILES:
        if profile.name == name:
            return profile
    return LEGACY_PROFILE


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
    PROFILE_FILE: Path = DATA_DIR / "dataset_profile.json"
    KMEANS_MODEL_FILE: Path = MODEL_DIR / "kmeans_model.joblib"
    DBSCAN_MODEL_FILE: Path = MODEL_DIR / "dbscan_model.joblib"
    SCALER_FILE: Path = MODEL_DIR / "scaler.joblib"
    METRICS_FILE: Path = DATA_DIR / "metrics.json"
    RESULTS_FILE: Path = DATA_DIR / "results_dataset.pkl"

    # --- Dataset schema ----------------------------------------------------
    # Schemas live in DATASET_PROFILES above (auto-detected on upload).
    # The aliases below keep the legacy schema available to old callers.
    REQUIRED_COLUMNS: tuple = LEGACY_PROFILE.required_columns
    NUMERIC_COLUMNS: tuple = LEGACY_PROFILE.numeric_columns
    CLUSTERING_FEATURES: tuple = LEGACY_PROFILE.clustering_features
    OPTIONAL_COLUMNS: tuple = LEGACY_PROFILE.optional_columns

    # --- Preprocessing -------------------------------------------------
    OUTLIER_Z_THRESHOLD: float = 3.0
    MAX_ROWS: int = 100_000

    # --- Clustering ------------------------------------------------------
    KMEANS_MIN_K: int = 2
    KMEANS_MAX_K: int = 10
    DBSCAN_EPS_CANDIDATES: tuple = (0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5)
    DBSCAN_MIN_SAMPLES_CANDIDATES: tuple = (3, 5, 8, 10)

    # --- Misc ------------------------------------------------------------
    APP_NAME: str = "ClimaCool AI — Urban Climate & Cooling Intelligence API"
    APP_VERSION: str = "1.1.0"
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
