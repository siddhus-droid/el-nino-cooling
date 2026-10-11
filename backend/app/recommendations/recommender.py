"""
Recommendation engine: maps a cooling-demand risk level to a curated
list of actionable strategies.
"""
from __future__ import annotations

RECOMMENDATIONS_MAP: dict[str, list[str]] = {
    "Extreme Cooling Demand": [
        "Increase urban green cover and expand tree canopy in high-density zones",
        "Install reflective / cool roofs on commercial and residential buildings",
        "Deploy smart AC scheduling and demand-response systems",
        "Incentivize rooftop solar installations to offset peak cooling load",
        "Enforce building energy-efficiency codes for new construction",
        "Set up cooling shelters / public cooling centers for vulnerable populations",
    ],
    "High Cooling Demand": [
        "Promote adoption of energy-efficient (5-star rated) cooling appliances",
        "Run public awareness campaigns on peak-hour energy conservation",
        "Expand urban tree plantation drives in affected wards",
        "Upgrade grid infrastructure to handle rising peak demand",
        "Introduce time-of-use electricity tariffs to flatten demand peaks",
    ],
    "Moderate Cooling Demand": [
        "Monitor consumption trends monthly to catch early escalation",
        "Encourage use of efficient appliances via subsidy programs",
        "Conduct periodic infrastructure health checks",
        "Promote passive cooling techniques (shading, ventilation) in housing",
    ],
    "Low Cooling Demand": [
        "Maintain existing infrastructure with routine inspections",
        "Continue baseline monitoring of temperature and consumption",
        "Preserve current green cover and water bodies",
    ],
}


def get_recommendations(risk_level: str) -> list[str]:
    """
    Return the recommendation list for a given risk level string.

    Deliberately returns an empty list (not Low's recommendations) for any
    string that isn't one of the four canonical RISK_LEVELS - notably
    NOISE_LABEL ("Noise / Outlier"), since generating actionable
    cooling-demand recommendations for a record the model couldn't
    classify would misrepresent it as a real risk assessment.
    """
    return RECOMMENDATIONS_MAP.get(risk_level, [])


def get_all_recommendations() -> dict[str, list[str]]:
    """Return the full risk-level -> recommendations mapping."""
    return dict(RECOMMENDATIONS_MAP)
