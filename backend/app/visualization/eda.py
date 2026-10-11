"""
Exploratory Data Analysis chart generation.

Every function returns a Plotly figure serialized to a JSON-able dict
(via plotly's own JSON encoder), ready to be sent straight to a frontend
that uses Plotly.js/react-plotly for rendering.
"""
from __future__ import annotations

import json
from typing import Any

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import plotly.io as pio

from app.config import CLIMACOOL_REAL_PROFILE, DatasetProfile
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _label(col: str) -> str:
    return col.replace("_", " ")


def _fig_to_json(fig: go.Figure) -> dict[str, Any]:
    """
    Serialize a Plotly figure to a plain JSON-safe dict.

    fig.to_dict() leaves numpy arrays / datetime64 objects embedded in the
    structure, which FastAPI's pydantic-based response serializer can't
    encode. Round-tripping through plotly's own JSON encoder (which knows
    how to handle numpy/pandas types) and back into a dict guarantees a
    plain-Python, JSON-safe structure.
    """
    return json.loads(pio.to_json(fig))


def correlation_matrix(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    numeric_cols = [c for c in profile.numeric_columns if c in df.columns]
    corr = df[numeric_cols].corr()

    # Use spaced-out display names ("Electricity Consumption" instead of
    # "Electricity_Consumption") purely for the chart's axis labels - the
    # underlying correlation values and dataset are untouched.
    display_names = [c.replace("_", " ") for c in numeric_cols]
    corr = corr.copy()
    corr.columns = display_names
    corr.index = display_names

    fig = px.imshow(
        corr,
        text_auto=".2f",
        color_continuous_scale="RdBu_r",
        title="Correlation Matrix",
        aspect="auto",
    )
    # The longest label here ("Electricity Consumption") needs considerably
    # more room than the default margins provide, on both the left (y-axis
    # tick labels) and bottom (x-axis tick labels) edges, or Plotly clips
    # the start of the text. automargin lets Plotly expand past these
    # explicit values based on actual rendered label size; the explicit
    # values are a sane baseline so the chart still looks right before
    # that measurement pass completes.
    fig.update_xaxes(automargin=True, tickangle=-35)
    fig.update_yaxes(automargin=True)
    fig.update_layout(margin=dict(l=140, r=40, t=60, b=110))
    return _fig_to_json(fig)


def temperature_distribution(df: pd.DataFrame) -> dict[str, Any]:
    fig = px.histogram(
        df, x="Temperature", nbins=30, title="Temperature Distribution",
        color_discrete_sequence=["#e76f51"],
    )
    fig.update_layout(xaxis_title="Temperature (°C)", yaxis_title="Frequency")
    return _fig_to_json(fig)


def humidity_distribution(df: pd.DataFrame) -> dict[str, Any]:
    fig = px.histogram(
        df, x="Humidity", nbins=30, title="Humidity Distribution",
        color_discrete_sequence=["#4895ef"],
    )
    fig.update_layout(xaxis_title="Humidity (%)", yaxis_title="Frequency")
    return _fig_to_json(fig)


def energy_distribution(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    fig = px.histogram(
        df, x=profile.consumption_col, nbins=30,
        title=f"{_label(profile.consumption_col)} Distribution",
        color_discrete_sequence=["#2a9d8f"],
    )
    fig.update_layout(xaxis_title=_label(profile.consumption_col), yaxis_title="Frequency")
    return _fig_to_json(fig)


def scatter_plot(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    fig = px.scatter(
        df,
        x="Temperature",
        y=profile.consumption_col,
        color="City" if "City" in df.columns else None,
        title=f"Temperature vs {_label(profile.consumption_col)}",
        opacity=0.7,
    )
    fig.update_layout(xaxis_title="Temperature (°C)", yaxis_title=_label(profile.consumption_col))
    return _fig_to_json(fig)


def humidity_scatter_plot(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    fig = px.scatter(
        df,
        x="Humidity",
        y=profile.consumption_col,
        color="City" if "City" in df.columns else None,
        title="Humidity vs Electricity Consumption",
        opacity=0.7,
    )
    fig.update_layout(xaxis_title="Humidity (%)", yaxis_title="Electricity Consumption (kWh)")
    return _fig_to_json(fig)


def monthly_trend(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    if "Month" not in df.columns:
        df = df.copy()
        df["Month"] = pd.to_datetime(df["Date"], errors="coerce").dt.month

    trend = (
        df.groupby("Month")[["Temperature", profile.consumption_col]]
        .mean()
        .reset_index()
        .sort_values("Month")
    )
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=trend["Month"], y=trend["Temperature"], name="Avg Temperature", mode="lines+markers"))
    fig.add_trace(go.Scatter(x=trend["Month"], y=trend[profile.consumption_col], name=f"Avg {_label(profile.consumption_col)}", mode="lines+markers", yaxis="y2"))
    fig.update_layout(
        title=f"Monthly Trend: Temperature vs {_label(profile.consumption_col)}",
        xaxis_title="Month",
        yaxis=dict(title="Avg Temperature (°C)"),
        yaxis2=dict(title=f"Avg {_label(profile.consumption_col)}", overlaying="y", side="right"),
    )
    return _fig_to_json(fig)


def yearly_trend(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    if "Year" not in df.columns:
        df = df.copy()
        df["Year"] = pd.to_datetime(df["Date"], errors="coerce").dt.year

    trend = (
        df.groupby("Year")[["Temperature", profile.consumption_col]]
        .mean()
        .reset_index()
        .sort_values("Year")
    )
    fig = go.Figure()
    fig.add_trace(go.Bar(x=trend["Year"], y=trend[profile.consumption_col], name=f"Avg {_label(profile.consumption_col)}"))
    fig.add_trace(go.Scatter(x=trend["Year"], y=trend["Temperature"], name="Avg Temperature", mode="lines+markers", yaxis="y2"))
    fig.update_layout(
        title=f"Yearly Trend: Temperature vs {_label(profile.consumption_col)}",
        xaxis_title="Year",
        yaxis=dict(title=f"Avg {_label(profile.consumption_col)}"),
        yaxis2=dict(title="Avg Temperature (°C)", overlaying="y", side="right"),
    )
    return _fig_to_json(fig)


def box_plot(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    numeric_cols = [c for c in profile.clustering_features if c in df.columns]
    fig = go.Figure()
    for col in numeric_cols:
        fig.add_trace(go.Box(y=df[col], name=col))
    fig.update_layout(title="Box Plot of Key Features")
    return _fig_to_json(fig)


def oni_distribution(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    fig = px.histogram(df, x="ONI_Index", nbins=20, title="ONI Index Distribution",
                       color_discrete_sequence=["#4895ef"])
    fig.update_layout(xaxis_title="ONI Index (Nino 3.4 anomaly)", yaxis_title="Frequency")
    return _fig_to_json(fig)


def _scatter(df: pd.DataFrame, x: str, y: str, title: str) -> dict[str, Any]:
    fig = px.scatter(df, x=x, y=y, color="City" if "City" in df.columns else None,
                     title=title, opacity=0.7)
    fig.update_layout(xaxis_title=_label(x), yaxis_title=_label(y))
    return _fig_to_json(fig)


def temp_vs_oni(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    return _scatter(df, "ONI_Index", "Temperature", "Temperature vs ONI Index")


def consumption_vs_oni(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    return _scatter(df, "ONI_Index", "State_Electricity_Consumption",
                    "State Electricity Consumption vs ONI Index")


def enso_phase_distribution(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    counts = df["ENSO_Phase"].value_counts().reset_index()
    counts.columns = ["ENSO_Phase", "Count"]
    fig = px.bar(counts, x="ENSO_Phase", y="Count", title="ENSO Phase Distribution (supplied classification)")
    fig.update_layout(xaxis_title="ENSO Phase", yaxis_title="Records")
    return _fig_to_json(fig)


def city_wise_temperature(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    fig = px.box(df, x="City", y="Temperature", title="Temperature by City")
    fig.update_layout(xaxis_title="City", yaxis_title="Temperature (°C)")
    return _fig_to_json(fig)


def city_wise_electricity(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    avg = df.groupby("City")["State_Electricity_Consumption"].mean().reset_index()
    fig = px.bar(avg, x="City", y="State_Electricity_Consumption",
                 title="Electricity Consumption by City (State-Level Values)")
    fig.update_layout(xaxis_title="City", yaxis_title="Avg State Electricity Consumption")
    return _fig_to_json(fig)


_LEGACY_BUILDERS = {
    "correlation_matrix": correlation_matrix,
    "temperature_distribution": lambda df, p: temperature_distribution(df),
    "humidity_distribution": lambda df, p: humidity_distribution(df),
    "energy_distribution": energy_distribution,
    "scatter_plot": scatter_plot,
    "humidity_scatter_plot": humidity_scatter_plot,
    "monthly_trend": monthly_trend,
    "yearly_trend": yearly_trend,
    "box_plot": box_plot,
}

_CLIMACOOL_BUILDERS = {
    "correlation_matrix": correlation_matrix,
    "temperature_distribution": lambda df, p: temperature_distribution(df),
    "box_plot": box_plot,
    "oni_distribution": oni_distribution,
    "temp_vs_oni": temp_vs_oni,
    "consumption_vs_oni": consumption_vs_oni,
    "scatter_plot": scatter_plot,
    "enso_phase_distribution": enso_phase_distribution,
    "city_wise_temperature": city_wise_temperature,
    "city_wise_electricity": city_wise_electricity,
    "monthly_trend": monthly_trend,
    "yearly_trend": yearly_trend,
}


def generate_all_charts(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    """
    Generate the EDA chart bundle for the active profile. Each chart is built
    independently: a chart whose columns are missing/invalid is skipped with a
    log warning instead of failing the whole /eda response.
    """
    logger.info("Generating EDA charts (%s) for %d rows", profile.name, len(df))
    builders = _CLIMACOOL_BUILDERS if profile.name == CLIMACOOL_REAL_PROFILE.name else _LEGACY_BUILDERS
    charts: dict[str, Any] = {}
    for key, builder in builders.items():
        try:
            charts[key] = builder(df, profile)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Skipping EDA chart '%s': %s", key, exc)
    return charts
