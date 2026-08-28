# El Niño Urban Cooling Impact Assessment — Backend & AI/ML System

**Project 48:** AI-Based Impact Assessment of El Niño on Urban Cooling Infrastructure and
Energy Consumption Patterns using Clustering.

## Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs (Swagger UI): http://localhost:8000/docs

## What changed in this update

- **`app/recommendations/risk_engine.py`** — fixed a bug where DBSCAN noise
  points (`cluster_id == -1`) were unconditionally hardcoded to "Low Cooling
  Demand", regardless of their actual readings. `RiskClassifier` now stores
  the normalization bounds (temp/electricity min/max) used when ranking
  clusters, and any record that isn't a member of a ranked cluster — DBSCAN
  noise, or an unseen cluster id — is classified from its own actual
  Temperature/Electricity_Consumption values, scored on the same scale as
  the real clusters, instead of defaulting to Low. (Verified against real
  data: noise points averaging 38.6°C / 523 kWh — the highest values in the
  dataset — were previously mislabeled "Low"; they now correctly classify
  as "Extreme Cooling Demand".)
- **`app/services/training_service.py`** — passes each record's actual
  Temperature/Electricity_Consumption into `classify_series()` so noise
  labeling is data-driven during training-set labeling, not just live
  prediction.
- **`app/services/prediction_service.py`** — fixed the risk classifier
  reconstruction, which was previously dropping `cluster_scores` entirely
  (`RiskClassifier(cluster_to_risk=..., cluster_scores={})`) and never
  passing the query's actual feature values into `classify()`. Now uses
  `RiskClassifier.from_dict()` (full state, including score bounds) and
  passes the real input temperature/electricity through.
- **`app/visualization/eda.py`** — added `humidity_distribution()` and
  `humidity_scatter_plot()` charts (Humidity vs Electricity Consumption was
  previously missing entirely). Removed the old unlabeled duplicate
  histogram chart.
- **`app/models/schemas.py`, `app/api/routes.py`** — added
  `GET /clusters/records`, returning per-record geographic + cluster data
  (date, city, lat/lon, temperature, humidity, electricity consumption,
  plus K-Means/DBSCAN cluster + risk level once each model is trained).
  Powers the frontend's Geo View map. Cluster fields are `null` until each
  model is actually trained — never fabricated.
- **`app/preprocessing/preprocessor.py`** — removed a deprecated pandas
  kwarg (`infer_datetime_format`), harmless cleanup.

## API Reference

| Method | Path | Description |
|---|---|---|
| POST | `/upload` | Upload & validate a CSV dataset |
| POST | `/preprocess` | Run cleaning/scaling pipeline on the uploaded dataset |
| GET | `/eda` | Get Plotly JSON for 9 EDA charts |
| POST | `/train/kmeans` | Train K-Means (auto elbow-method `k`, or pass `k`/`min_k`/`max_k`) |
| POST | `/train/dbscan` | Train DBSCAN (auto-tuned `eps`/`min_samples`, or pass explicit values) |
| GET | `/compare` | Compare K-Means vs DBSCAN, get a recommended model |
| POST | `/predict` | Predict cluster/risk/recommendations for a new record |
| GET | `/clusters?model_type=kmeans\|dbscan` | Cluster/risk-level counts for a trained model |
| GET | `/clusters/records` | **(new)** Per-record geo + cluster data for map visualization |
| GET | `/metrics` | All stored metrics (preprocessing report, training, comparison) |
| GET | `/recommendations` | Full risk-level -> recommendations mapping |

### `GET /clusters/records` response shape

```json
{
  "status": "success",
  "total_records": 15,
  "kmeans_trained": true,
  "dbscan_trained": true,
  "records": [
    {
      "date": "2023-01-05",
      "city": "Mumbai",
      "latitude": 19.076,
      "longitude": 72.877,
      "temperature": 32.5,
      "humidity": 68.0,
      "electricity_consumption": 410.0,
      "population_density": null,
      "kmeans_cluster": 3,
      "kmeans_risk_level": "Low Cooling Demand",
      "dbscan_cluster": 0,
      "dbscan_risk_level": "High Cooling Demand"
    }
  ]
}
```

`kmeans_cluster`/`kmeans_risk_level`/`dbscan_cluster`/`dbscan_risk_level` are
`null` for any model not yet trained; `kmeans_trained`/`dbscan_trained` flags
tell the frontend which fields to expect.

## Design Notes

- **State management:** a disk-backed singleton (`app/services/state.py`)
  holds the current dataframe(s) and trained models in memory, persisting
  to pickle/joblib so state survives a server restart.
- **`/clusters/records` sources from `app_state.results_df`** when
  available (post-training, includes cluster columns) or falls back to
  `app_state.processed_df` (pre-training, base columns only) — so the
  endpoint works at any pipeline stage without ever inventing cluster
  assignments that don't exist yet.
- **Risk classification / DBSCAN prediction workaround:** unchanged from
  the original design — see inline docstrings in
  `app/recommendations/risk_engine.py` and
  `app/clustering/dbscan_model.py`.

## Tested

Full pipeline (upload → preprocess → eda → train/kmeans → train/dbscan →
compare → clusters/records → predict) verified end-to-end against a
15-row test CSV matching the exact shape used in QA, confirming correct
per-record cluster differentiation and graceful "not trained yet" states.
