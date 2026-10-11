"""
Risk classification engine.

Maps raw cluster IDs to human-meaningful cooling-demand risk levels by
ranking clusters according to their mean electricity consumption and
temperature (the two primary drivers of urban cooling demand), then
bucketing them into four ordinal risk levels.

This is implemented as a small, reusable service class so it can be
called both during training (to label the training set) and during
prediction (to label a single new record).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

RISK_LEVELS = [
    "Low Cooling Demand",
    "Moderate Cooling Demand",
    "High Cooling Demand",
    "Extreme Cooling Demand",
]

# Sentinel returned for DBSCAN noise (cluster_id == -1). Deliberately NOT
# one of RISK_LEVELS: DBSCAN noise means "this record does not sit in any
# sufficiently dense learned region," which is a statement about the
# clustering result, not a cooling-demand risk. A noise point's own raw
# Temperature/Electricity_Consumption values still exist, but inferring a
# risk level from them here would misrepresent the DBSCAN model's actual
# output ("no dense-region membership") as if it were a risk judgment.
NOISE_LABEL = "Noise / Outlier"


@dataclass
class RiskClassifier:
    """
    Ranks clusters by a composite "cooling demand score" (weighted
    combination of mean temperature and mean electricity consumption)
    and assigns ordinal risk levels to the ranked clusters.

    DBSCAN noise (cluster_id == -1) always classifies to NOISE_LABEL,
    never one of the four ordinal risk levels: DBSCAN explicitly reported
    that the record doesn't belong to any sufficiently dense learned
    region, and a risk level should not be silently invented from that.
    A genuinely unseen *non-noise* cluster id (should not occur in
    practice, since predictions only ever return cluster ids the model
    was fit on) falls back to scoring the record's own raw
    Temperature/Electricity_Consumption values against the ranked
    clusters, as a defensive measure only.
    """

    cluster_to_risk: dict[int, str]
    cluster_scores: dict[int, float]
    # Bounds the composite score was normalized against when fit() ran.
    # Needed to score new/unseen records (noise points, live predictions)
    # on the same scale as the clusters that were ranked.
    temp_min: float | None = field(default=None)
    temp_max: float | None = field(default=None)
    elec_min: float | None = field(default=None)
    elec_max: float | None = field(default=None)

    @classmethod
    def fit(
        cls,
        df: pd.DataFrame,
        cluster_col: str,
        temperature_col: str = "Temperature",
        electricity_col: str = "Electricity_Consumption",
    ) -> "RiskClassifier":
        """
        Build the cluster -> risk-level mapping from a labeled training
        dataframe. Noise points (cluster == -1) are excluded from the
        cluster ranking itself (there's no coherent "noise cluster" mean
        to rank, and noise always classifies to NOISE_LABEL regardless).
        The score bounds computed here are kept only for the defensive
        unseen-non-noise-cluster fallback in `classify()`.
        """
        working = df[df[cluster_col] != -1]
        cluster_ids = sorted(working[cluster_col].unique().tolist())

        temp_min, temp_max = float(df[temperature_col].min()), float(df[temperature_col].max())
        elec_min, elec_max = float(df[electricity_col].min()), float(df[electricity_col].max())

        if not cluster_ids:
            return cls(
                cluster_to_risk={},
                cluster_scores={},
                temp_min=temp_min,
                temp_max=temp_max,
                elec_min=elec_min,
                elec_max=elec_max,
            )

        scores: dict[int, float] = {}
        for cid in cluster_ids:
            subset = working[working[cluster_col] == cid]
            mean_temp = subset[temperature_col].mean()
            mean_elec = subset[electricity_col].mean()
            scores[cid] = _composite_score(mean_temp, mean_elec, temp_min, temp_max, elec_min, elec_max)

        # Rank clusters by composite score ascending, then bucket into
        # 4 ordinal risk levels.
        ranked = sorted(scores.items(), key=lambda kv: kv[1])
        n = len(ranked)
        cluster_to_risk: dict[int, str] = {}

        for idx, (cid, _score) in enumerate(ranked):
            bucket = int(np.floor(idx * len(RISK_LEVELS) / n))
            bucket = min(bucket, len(RISK_LEVELS) - 1)
            cluster_to_risk[cid] = RISK_LEVELS[bucket]

        return cls(
            cluster_to_risk=cluster_to_risk,
            cluster_scores=scores,
            temp_min=temp_min,
            temp_max=temp_max,
            elec_min=elec_min,
            elec_max=elec_max,
        )

    def _score_from_features(self, temperature: float, electricity_consumption: float) -> float | None:
        if None in (self.temp_min, self.temp_max, self.elec_min, self.elec_max):
            return None
        return _composite_score(
            temperature, electricity_consumption,
            self.temp_min, self.temp_max, self.elec_min, self.elec_max,
        )

    def _classify_by_score(self, score: float) -> str:
        """
        Bucket an arbitrary composite score by its rank against the
        already-ranked cluster scores, extending the same quantile
        boundaries used for real clusters to a score that doesn't belong
        to any of them.
        """
        if not self.cluster_scores:
            return RISK_LEVELS[0]
        sorted_scores = sorted(self.cluster_scores.values())
        n = len(sorted_scores)
        rank = sum(1 for s in sorted_scores if s <= score)
        fraction = rank / n
        bucket = int(np.floor(fraction * len(RISK_LEVELS)))
        bucket = max(0, min(bucket, len(RISK_LEVELS) - 1))
        return RISK_LEVELS[bucket]

    def classify(
        self,
        cluster_id: int,
        temperature: float | None = None,
        electricity_consumption: float | None = None,
    ) -> str:
        """
        Return the risk level for a record.

        - cluster_id == -1 (DBSCAN noise) always returns NOISE_LABEL,
          regardless of the record's own feature values. This is not a
          risk level and callers must not treat it as one (no
          recommendations should be generated from it).
        - A known, ranked cluster returns its data-driven label directly.
        - A genuinely unseen non-noise cluster id (defensive fallback,
          should not occur in normal operation) is scored from the
          record's own Temperature/Electricity_Consumption against the
          ranked clusters' scores, falling back to the lowest risk level
          only if no feature values are available to score with.
        """
        if cluster_id == -1:
            return NOISE_LABEL

        if cluster_id in self.cluster_to_risk:
            return self.cluster_to_risk[cluster_id]

        if temperature is not None and electricity_consumption is not None:
            score = self._score_from_features(temperature, electricity_consumption)
            if score is not None:
                return self._classify_by_score(score)

        return RISK_LEVELS[0]

    def classify_series(
        self,
        cluster_labels: pd.Series | np.ndarray,
        temperatures: pd.Series | np.ndarray | None = None,
        electricity_values: pd.Series | np.ndarray | None = None,
    ) -> list[str]:
        cluster_labels = list(cluster_labels)
        if temperatures is not None and electricity_values is not None:
            temperatures = list(temperatures)
            electricity_values = list(electricity_values)
            return [
                self.classify(int(c), float(t), float(e))
                for c, t, e in zip(cluster_labels, temperatures, electricity_values)
            ]
        return [self.classify(int(c)) for c in cluster_labels]

    def to_dict(self) -> dict:
        return {
            "cluster_to_risk": {str(k): v for k, v in self.cluster_to_risk.items()},
            "cluster_scores": {str(k): v for k, v in self.cluster_scores.items()},
            "temp_min": self.temp_min,
            "temp_max": self.temp_max,
            "elec_min": self.elec_min,
            "elec_max": self.elec_max,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "RiskClassifier":
        return cls(
            cluster_to_risk={int(k): v for k, v in data.get("cluster_to_risk", {}).items()},
            cluster_scores={int(k): v for k, v in data.get("cluster_scores", {}).items()},
            temp_min=data.get("temp_min"),
            temp_max=data.get("temp_max"),
            elec_min=data.get("elec_min"),
            elec_max=data.get("elec_max"),
        )


def _composite_score(
    temperature: float,
    electricity_consumption: float,
    temp_min: float,
    temp_max: float,
    elec_min: float,
    elec_max: float,
) -> float:
    """
    Normalize temperature/electricity to [0, 1] against the given bounds
    and combine into the composite cooling-demand score. Electricity
    consumption is weighted slightly higher since it's the direct proxy
    for cooling demand; temperature is the driving climatic factor.
    """
    norm_temp = (temperature - temp_min) / (temp_max - temp_min + 1e-12)
    norm_elec = (electricity_consumption - elec_min) / (elec_max - elec_min + 1e-12)
    return 0.6 * norm_elec + 0.4 * norm_temp
