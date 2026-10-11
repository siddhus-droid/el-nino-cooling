"""ENSO helpers. Phase labels follow the standard NOAA ONI thresholds."""
from __future__ import annotations


def classify_oni(oni: float) -> str:
    """Descriptive ENSO phase from an ONI value (>= +0.5 El Nino, <= -0.5 La Nina)."""
    if oni >= 0.5:
        return "El Nino"
    if oni <= -0.5:
        return "La Nina"
    return "Neutral"


ONI_EXPLANATION = (
    "ONI (Oceanic Nino Index) is NOAA's Nino 3.4 sea-surface-temperature anomaly. "
    "Positive values indicate warmer Nino 3.4 conditions, negative values cooler "
    "conditions. ENSO_Phase is based on the supplied ONI classification. The models "
    "find patterns/associations in the supplied data; they do not show that ENSO "
    "caused changes in electricity consumption."
)
