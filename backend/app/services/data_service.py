"""
Data service: orchestrates file upload, validation, preprocessing, and
EDA chart generation. This is the layer the API routes call into;
routes should contain no business logic themselves.
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import pandas as pd

from app.config import settings
from app.preprocessing.preprocessor import run_preprocessing_pipeline
from app.preprocessing.validator import validate_dataset
from app.services.state import app_state
from app.utils.exceptions import FileValidationError, NoDatasetAvailableError
from app.utils.logger import get_logger
from app.visualization import eda

logger = get_logger(__name__)


def save_upload_and_load_df(filename: str, file_bytes: bytes) -> pd.DataFrame:
    """
    Persist the raw upload to disk and parse it into a DataFrame.
    Raises FileValidationError for unreadable / non-CSV files.
    """
    if not filename.lower().endswith(".csv"):
        raise FileValidationError(message="Only .csv files are supported.")

    if not file_bytes:
        raise FileValidationError(message="Uploaded file is empty.")

    upload_path: Path = settings.UPLOAD_DIR / filename
    try:
        upload_path.write_bytes(file_bytes)
    except OSError as exc:
        raise FileValidationError(message=f"Could not save uploaded file: {exc}") from exc

    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:  # noqa: BLE001
        raise FileValidationError(message=f"Could not parse CSV file: {exc}") from exc

    return df


def handle_upload(filename: str, file_bytes: bytes) -> dict[str, Any]:
    """Full upload flow: save, parse, validate, store as raw dataset."""
    df = save_upload_and_load_df(filename, file_bytes)
    validated_df, profile = validate_dataset(df)

    app_state.save_raw(validated_df, profile)
    logger.info("Upload accepted: %s (%d rows)", filename, len(validated_df))

    return {
        "filename": filename,
        "rows": len(validated_df),
        "columns": list(validated_df.columns),
        "dataset_profile": profile.name,
        "dataset_profile_display": profile.display_name,
        "clustering_features": list(profile.clustering_features),
    }


def handle_preprocess() -> dict[str, Any]:
    """Run the preprocessing pipeline over the currently stored raw dataset."""
    if app_state.raw_df is None:
        raise NoDatasetAvailableError(message="No raw dataset found. Please upload a CSV first.")

    processed_df, scaler, report = run_preprocessing_pipeline(
        app_state.raw_df, app_state.dataset_profile
    )

    app_state.save_processed(processed_df)
    app_state.save_scaler(scaler)
    app_state.update_metrics("preprocessing_report", report.__dict__)

    return report.__dict__


def handle_eda() -> dict[str, Any]:
    """Generate the full EDA chart bundle for the processed dataset."""
    df = app_state.processed_df if app_state.processed_df is not None else app_state.raw_df
    if df is None:
        raise NoDatasetAvailableError(
            message="No dataset available for EDA. Please upload (and ideally preprocess) data first."
        )
    return {
        "charts": eda.generate_all_charts(df, app_state.dataset_profile),
        "dataset_profile": app_state.dataset_profile.name,
    }
