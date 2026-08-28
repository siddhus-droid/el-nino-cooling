"""
Dataset validation logic.

Runs before any preprocessing/training happens, to fail fast with
meaningful error messages instead of letting bad data propagate.
"""
from __future__ import annotations

import pandas as pd

from app.config import settings
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
    canonical_targets = list(settings.REQUIRED_COLUMNS) + list(settings.OPTIONAL_COLUMNS)
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


def validate_columns(df: pd.DataFrame) -> None:
    """Raise MissingColumnsError if any required column is absent."""
    missing = [c for c in settings.REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise MissingColumnsError(
            message=f"Dataset is missing required columns: {missing}",
            details={
                "missing_columns": missing,
                "required_columns": list(settings.REQUIRED_COLUMNS),
                "found_columns": list(df.columns),
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


def validate_numeric_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Coerce numeric columns to numeric dtype. Raises InvalidNumericValueError
    if a column is entirely non-numeric (i.e. coercion yields all-NaN on a
    column that had non-null values to begin with).
    """
    df = df.copy()
    for col in settings.NUMERIC_COLUMNS:
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

    if "Population_Density" in df.columns:
        df["Population_Density"] = pd.to_numeric(df["Population_Density"], errors="coerce")

    return df


def validate_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full validation pipeline: normalize columns, check required columns
    exist, check non-empty, check row limit, coerce numeric types.

    Returns the validated (and lightly normalized) dataframe.
    """
    df = normalize_columns(df)
    validate_columns(df)
    validate_not_empty(df)
    validate_row_limit(df)
    df = validate_numeric_columns(df)
    logger.info("Dataset validated successfully: %d rows, %d columns", len(df), len(df.columns))
    return df
