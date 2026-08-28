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

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


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


def correlation_matrix(df: pd.DataFrame) -> dict[str, Any]:
    numeric_cols = [c for c in settings.NUMERIC_COLUMNS if c in df.columns]
    corr = df[numeric_cols].corr()
    fig = px.imshow(
        corr,
        text_auto=".2f",
        color_continuous_scale="RdBu_r",
        title="Correlation Matrix",
        aspect="auto",
    )
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


def energy_distribution(df: pd.DataFrame) -> dict[str, Any]:
    fig = px.histogram(
        df, x="Electricity_Consumption", nbins=30,
        title="Energy Consumption Distribution",
        color_discrete_sequence=["#2a9d8f"],
    )
    fig.update_layout(xaxis_title="Electricity Consumption (kWh)", yaxis_title="Frequency")
    return _fig_to_json(fig)


def scatter_plot(df: pd.DataFrame) -> dict[str, Any]:
    fig = px.scatter(
        df,
        x="Temperature",
        y="Electricity_Consumption",
        color="City" if "City" in df.columns else None,
        title="Temperature vs Electricity Consumption",
        opacity=0.7,
    )
    fig.update_layout(xaxis_title="Temperature (°C)", yaxis_title="Electricity Consumption (kWh)")
    return _fig_to_json(fig)


def humidity_scatter_plot(df: pd.DataFrame) -> dict[str, Any]:
    fig = px.scatter(
        df,
        x="Humidity",
        y="Electricity_Consumption",
        color="City" if "City" in df.columns else None,
        title="Humidity vs Electricity Consumption",
        opacity=0.7,
    )
    fig.update_layout(xaxis_title="Humidity (%)", yaxis_title="Electricity Consumption (kWh)")
    return _fig_to_json(fig)


def monthly_trend(df: pd.DataFrame) -> dict[str, Any]:
    if "Month" not in df.columns:
        df = df.copy()
        df["Month"] = pd.to_datetime(df["Date"], errors="coerce").dt.month

    trend = (
        df.groupby("Month")[["Temperature", "Electricity_Consumption"]]
        .mean()
        .reset_index()
        .sort_values("Month")
    )
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=trend["Month"], y=trend["Temperature"], name="Avg Temperature", mode="lines+markers"))
    fig.add_trace(go.Scatter(x=trend["Month"], y=trend["Electricity_Consumption"], name="Avg Electricity Consumption", mode="lines+markers", yaxis="y2"))
    fig.update_layout(
        title="Monthly Trend: Temperature vs Electricity Consumption",
        xaxis_title="Month",
        yaxis=dict(title="Avg Temperature (°C)"),
        yaxis2=dict(title="Avg Electricity Consumption (kWh)", overlaying="y", side="right"),
    )
    return _fig_to_json(fig)


def yearly_trend(df: pd.DataFrame) -> dict[str, Any]:
    if "Year" not in df.columns:
        df = df.copy()
        df["Year"] = pd.to_datetime(df["Date"], errors="coerce").dt.year

    trend = (
        df.groupby("Year")[["Temperature", "Electricity_Consumption"]]
        .mean()
        .reset_index()
        .sort_values("Year")
    )
    fig = go.Figure()
    fig.add_trace(go.Bar(x=trend["Year"], y=trend["Electricity_Consumption"], name="Avg Electricity Consumption"))
    fig.add_trace(go.Scatter(x=trend["Year"], y=trend["Temperature"], name="Avg Temperature", mode="lines+markers", yaxis="y2"))
    fig.update_layout(
        title="Yearly Trend: Temperature vs Electricity Consumption",
        xaxis_title="Year",
        yaxis=dict(title="Avg Electricity Consumption (kWh)"),
        yaxis2=dict(title="Avg Temperature (°C)", overlaying="y", side="right"),
    )
    return _fig_to_json(fig)


def box_plot(df: pd.DataFrame) -> dict[str, Any]:
    numeric_cols = [c for c in settings.CLUSTERING_FEATURES if c in df.columns]
    fig = go.Figure()
    for col in numeric_cols:
        fig.add_trace(go.Box(y=df[col], name=col))
    fig.update_layout(title="Box Plot of Key Features")
    return _fig_to_json(fig)


def generate_all_charts(df: pd.DataFrame) -> dict[str, Any]:
    """Generate the complete EDA chart bundle for the /eda endpoint."""
    logger.info("Generating EDA charts for %d rows", len(df))
    return {
        "correlation_matrix": correlation_matrix(df),
        "temperature_distribution": temperature_distribution(df),
        "humidity_distribution": humidity_distribution(df),
        "energy_distribution": energy_distribution(df),
        "scatter_plot": scatter_plot(df),
        "humidity_scatter_plot": humidity_scatter_plot(df),
        "monthly_trend": monthly_trend(df),
        "yearly_trend": yearly_trend(df),
        "box_plot": box_plot(df),
    }
