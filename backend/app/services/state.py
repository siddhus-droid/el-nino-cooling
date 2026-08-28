"""
Application state manager.

FastAPI request handlers are stateless by default, but this project needs
a shared "current dataset" / "current trained models" concept between
calls (upload -> preprocess -> train -> predict). Rather than pull in an
external database for this scope, we keep a process-wide singleton that
also persists to disk (pickle / joblib) so state survives a server
restart.

This is intentionally simple: for a production multi-worker deployment
this would be swapped for a database + object storage, but the service
layer below is written against a small interface so that swap is
localized to this file.
"""
from __future__ import annotations

import json
from pathlib import Path
from threading import RLock
from typing import Any, Optional

import joblib
import pandas as pd

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class AppState:
    """Thread-safe, disk-backed singleton holding the app's working data."""

    def __init__(self) -> None:
        self._lock = RLock()
        self.raw_df: Optional[pd.DataFrame] = None
        self.processed_df: Optional[pd.DataFrame] = None
        self.results_df: Optional[pd.DataFrame] = None

        self.scaler: Any = None
        self.kmeans_model: Any = None
        self.dbscan_model: Any = None

        self.metrics: dict = {}

        self._load_from_disk()

    # ------------------------------------------------------------------
    # Persistence helpers
    # ------------------------------------------------------------------
    def _load_from_disk(self) -> None:
        try:
            if settings.RAW_DATA_FILE.exists():
                self.raw_df = pd.read_pickle(settings.RAW_DATA_FILE)
            if settings.PROCESSED_DATA_FILE.exists():
                self.processed_df = pd.read_pickle(settings.PROCESSED_DATA_FILE)
            if settings.RESULTS_FILE.exists():
                self.results_df = pd.read_pickle(settings.RESULTS_FILE)
            if settings.SCALER_FILE.exists():
                self.scaler = joblib.load(settings.SCALER_FILE)
            if settings.KMEANS_MODEL_FILE.exists():
                self.kmeans_model = joblib.load(settings.KMEANS_MODEL_FILE)
            if settings.DBSCAN_MODEL_FILE.exists():
                self.dbscan_model = joblib.load(settings.DBSCAN_MODEL_FILE)
            if settings.METRICS_FILE.exists():
                self.metrics = json.loads(settings.METRICS_FILE.read_text())
            logger.info("Application state restored from disk.")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not fully restore state from disk: %s", exc)

    def save_raw(self, df: pd.DataFrame) -> None:
        with self._lock:
            self.raw_df = df
            df.to_pickle(settings.RAW_DATA_FILE)

    def save_processed(self, df: pd.DataFrame) -> None:
        with self._lock:
            self.processed_df = df
            df.to_pickle(settings.PROCESSED_DATA_FILE)

    def save_results(self, df: pd.DataFrame) -> None:
        with self._lock:
            self.results_df = df
            df.to_pickle(settings.RESULTS_FILE)

    def save_scaler(self, scaler: Any) -> None:
        with self._lock:
            self.scaler = scaler
            joblib.dump(scaler, settings.SCALER_FILE)

    def save_kmeans(self, model: Any) -> None:
        with self._lock:
            self.kmeans_model = model
            joblib.dump(model, settings.KMEANS_MODEL_FILE)

    def save_dbscan(self, model: Any) -> None:
        with self._lock:
            self.dbscan_model = model
            joblib.dump(model, settings.DBSCAN_MODEL_FILE)

    def update_metrics(self, key: str, value: Any) -> None:
        with self._lock:
            self.metrics[key] = value
            settings.METRICS_FILE.write_text(json.dumps(self.metrics, indent=2, default=str))

    def get_metrics(self) -> dict:
        with self._lock:
            return dict(self.metrics)


# Process-wide singleton
app_state = AppState()
