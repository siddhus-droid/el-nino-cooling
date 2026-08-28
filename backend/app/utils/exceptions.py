"""
Custom exception hierarchy for the application.

Each exception maps to a specific HTTP status code so the API layer can
translate them uniformly (see app/api/routes.py exception handlers).
"""
from __future__ import annotations


class AppBaseException(Exception):
    """Base class for all application-raised exceptions."""

    status_code: int = 500
    default_message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None, details: dict | None = None):
        self.message = message or self.default_message
        self.details = details or {}
        super().__init__(self.message)


class FileValidationError(AppBaseException):
    """Raised when an uploaded file fails basic file-level validation."""

    status_code = 400
    default_message = "Uploaded file failed validation."


class MissingColumnsError(AppBaseException):
    """Raised when required dataset columns are missing."""

    status_code = 422
    default_message = "Dataset is missing required columns."


class InvalidNumericValueError(AppBaseException):
    """Raised when numeric columns contain non-numeric or invalid values."""

    status_code = 422
    default_message = "Dataset contains invalid numeric values."


class EmptyDatasetError(AppBaseException):
    """Raised when a dataset has zero usable rows."""

    status_code = 422
    default_message = "Dataset is empty after validation/cleaning."


class DatasetTooLargeError(AppBaseException):
    """Raised when a dataset exceeds the configured row limit."""

    status_code = 413
    default_message = "Dataset exceeds the maximum allowed number of rows."


class NoDatasetAvailableError(AppBaseException):
    """Raised when an operation requires an uploaded/processed dataset that doesn't exist."""

    status_code = 404
    default_message = "No dataset available. Please upload and preprocess data first."


class ModelNotTrainedError(AppBaseException):
    """Raised when a prediction/comparison is requested before training a model."""

    status_code = 409
    default_message = "Model has not been trained yet."


class PredictionError(AppBaseException):
    """Raised when a prediction request fails."""

    status_code = 400
    default_message = "Prediction failed due to invalid input."


class ClusteringError(AppBaseException):
    """Raised when a clustering algorithm fails to fit the data."""

    status_code = 500
    default_message = "Clustering operation failed."
