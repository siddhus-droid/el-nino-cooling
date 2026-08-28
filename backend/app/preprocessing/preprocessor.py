"""
Data preprocessing pipeline: missing values, duplicates, outliers,
date parsing, feature selection, and normalization.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from app.config import settings
from app.utils.exceptions import EmptyDatasetError
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class PreprocessingReport:
    rows_before: int = 0
    rows_after: int = 0
    duplicates_removed: int = 0
    missing_values_handled: int = 0
    outliers_removed: int = 0
    columns: list = field(default_factory=list)


def parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    """Parse the Date column into pandas datetime, extracting Month/Year features."""
    df = df.copy()
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df["Month"] = df["Date"].dt.month
    df["Year"] = df["Date"].dt.year
    return df


def handle_missing_values(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """
    Impute missing numeric values with column median, and drop rows where
    critical identifying fields (Date, City) are missing.

    Returns (df, count_of_missing_cells_handled).
    """
    df = df.copy()
    numeric_cols = [c for c in settings.NUMERIC_COLUMNS if c in df.columns]

    missing_before = int(df[numeric_cols].isna().sum().sum()) if numeric_cols else 0

    for col in numeric_cols:
        if df[col].isna().any():
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)

    if "Population_Density" in df.columns and df["Population_Density"].isna().any():
        median_val = df["Population_Density"].median()
        missing_before += int(df["Population_Density"].isna().sum())
        df["Population_Density"] = df["Population_Density"].fillna(median_val)

    # Rows without a usable date or city cannot be meaningfully analyzed
    before_drop = len(df)
    df = df.dropna(subset=["Date", "City"])
    dropped_rows = before_drop - len(df)
    if dropped_rows:
        logger.info("Dropped %d rows with missing Date/City", dropped_rows)

    return df, missing_before


def remove_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Drop exact duplicate rows."""
    before = len(df)
    df = df.drop_duplicates()
    removed = before - len(df)
    return df, removed


def detect_and_remove_outliers(
    df: pd.DataFrame, z_threshold: float = settings.OUTLIER_Z_THRESHOLD
) -> tuple[pd.DataFrame, int]:
    """
    Remove rows where any clustering feature is a statistical outlier,
    using the Z-score method (|z| > threshold).
    """
    df = df.copy()
    feature_cols = [c for c in settings.CLUSTERING_FEATURES if c in df.columns]
    if not feature_cols:
        return df, 0

    z_scores = df[feature_cols].apply(
        lambda col: (col - col.mean()) / col.std(ddof=0) if col.std(ddof=0) > 0 else col * 0
    )
    outlier_mask = (z_scores.abs() > z_threshold).any(axis=1)
    removed = int(outlier_mask.sum())
    df = df.loc[~outlier_mask].reset_index(drop=True)
    return df, removed


def select_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Select the columns relevant for downstream analysis/modeling, keeping
    identifying metadata (Date, City, Lat/Lon) plus engineered/optional
    features present in the dataframe.
    """
    keep_cols = list(settings.REQUIRED_COLUMNS) + ["Month", "Year"]
    if "Population_Density" in df.columns:
        keep_cols.append("Population_Density")
    keep_cols = [c for c in keep_cols if c in df.columns]
    return df[keep_cols].copy()


def normalize_features(df: pd.DataFrame) -> tuple[pd.DataFrame, StandardScaler]:
    """
    Apply StandardScaler to the clustering feature columns, storing the
    scaled values in new `<col>_scaled` columns so raw values are preserved
    for reporting/EDA.
    """
    df = df.copy()
    feature_cols = [c for c in settings.CLUSTERING_FEATURES if c in df.columns]
    scaler = StandardScaler()
    scaled_values = scaler.fit_transform(df[feature_cols])
    for i, col in enumerate(feature_cols):
        df[f"{col}_scaled"] = scaled_values[:, i]
    return df, scaler


def run_preprocessing_pipeline(df: pd.DataFrame) -> tuple[pd.DataFrame, StandardScaler, PreprocessingReport]:
    """
    Execute the full preprocessing pipeline end to end.

    Returns (processed_dataframe, fitted_scaler, report).
    """
    report = PreprocessingReport(rows_before=len(df))

    df = parse_dates(df)
    df, missing_handled = handle_missing_values(df)
    df, duplicates_removed = remove_duplicates(df)
    df, outliers_removed = detect_and_remove_outliers(df)
    df = select_features(df)

    if df.empty:
        raise EmptyDatasetError(
            message="Dataset became empty after preprocessing (all rows were invalid/outliers)."
        )

    df, scaler = normalize_features(df)

    report.rows_after = len(df)
    report.duplicates_removed = duplicates_removed
    report.missing_values_handled = missing_handled
    report.outliers_removed = outliers_removed
    report.columns = list(df.columns)

    logger.info(
        "Preprocessing complete: %d -> %d rows (dupes=%d, outliers=%d)",
        report.rows_before,
        report.rows_after,
        duplicates_removed,
        outliers_removed,
    )

    return df, scaler, report
