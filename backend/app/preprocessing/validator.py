"""
Dataset validation logic.

Runs before any preprocessing/training happens, to fail fast with
meaningful error messages instead of letting bad data propagate.
"""
from __future__ import annotations

import pandas as pd

from app.config import DATASET_PROFILES, DatasetProfile, settings
from app.utils.exceptions import (
    EmptyDatasetError,
    InvalidNumericValueError,
    MissingColumnsError,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize column names so minor case/whitespace/underscore differences
    in the uploaded CSV don't cause spurious 'missing column' errors.

    e.g. "electricity consumption" -> "Electricity_Consumption"
    """
    normalized_map = {}
    canonical_targets: list[str] = []
    for profile in DATASET_PROFILES:
        for col in (*profile.required_columns, *profile.optional_columns, *profile.numeric_columns):
            if col not in canonical_targets:
                canonical_targets.append(col)
    canonical_lookup = {
        col.replace("_", "").replace(" ", "").lower(): col for col in canonical_targets
    }

    for col in df.columns:
        key = col.strip().replace("_", "").replace(" ", "").lower()
        if key in canonical_lookup:
            normalized_map[col] = canonical_lookup[key]
        else:
            normalized_map[col] = col.strip()

    return df.rename(columns=normalized_map)


def detect_profile(columns) -> DatasetProfile:
    """
    Pick the first supported schema whose required columns are all present.
    Raises MissingColumnsError (listing every supported schema) otherwise.
    """
    cols = set(columns)
    for profile in DATASET_PROFILES:
        if all(c in cols for c in profile.required_columns):
            return profile
    raise MissingColumnsError(
        message=(
            "Dataset does not match any supported schema. Required columns: "
            + " | ".join(f"{p.name}: {list(p.required_columns)}" for p in DATASET_PROFILES)
        ),
        details={
            "supported_schemas": {p.name: list(p.required_columns) for p in DATASET_PROFILES},
            "found_columns": list(columns),
        },
    )


def validate_not_empty(df: pd.DataFrame) -> None:
    """Raise EmptyDatasetError if the dataframe has no rows."""
    if df is None or df.empty:
        raise EmptyDatasetError(message="Uploaded dataset contains zero rows.")


def validate_row_limit(df: pd.DataFrame) -> None:
    """Raise DatasetTooLargeError if the dataframe exceeds the configured max rows."""
    from app.utils.exceptions import DatasetTooLargeError  # local import to avoid cycle noise

    if len(df) > settings.MAX_ROWS:
        raise DatasetTooLargeError(
            message=(
                f"Dataset has {len(df)} rows, which exceeds the maximum "
                f"supported {settings.MAX_ROWS} rows."
            ),
            details={"rows": len(df), "max_rows": settings.MAX_ROWS},
        )


def validate_numeric_columns(df: pd.DataFrame, profile: DatasetProfile) -> pd.DataFrame:
    """
    Coerce the profile's numeric columns to numeric dtype. Raises
    InvalidNumericValueError if a column is entirely non-numeric.
    """
    df = df.copy()
    numeric = list(profile.numeric_columns) + [
        c for c in profile.optional_columns if c not in profile.categorical_columns
    ]
    for col in numeric:
        if col not in df.columns:
            continue
        original_non_null = df[col].notna().sum()
        coerced = pd.to_numeric(df[col], errors="coerce")
        coerced_non_null = coerced.notna().sum()

        if original_non_null > 0 and coerced_non_null == 0:
            raise InvalidNumericValueError(
                message=f"Column '{col}' contains no valid numeric values.",
                details={"column": col},
            )
        df[col] = coerced

    return df


def validate_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, DatasetProfile]:
    """
    Full validation pipeline: normalize columns, detect the schema, check
    non-empty, check row limit, coerce numeric types.

    Returns (validated dataframe, detected DatasetProfile).
    """
    df = normalize_columns(df)
    profile = detect_profile(df.columns)
    validate_not_empty(df)
    validate_row_limit(df)
    df = validate_numeric_columns(df, profile)
    logger.info(
        "Dataset validated (%s): %d rows, %d columns", profile.name, len(df), len(df.columns)
    )
    return df, profile
