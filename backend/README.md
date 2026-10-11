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

- **`app/recommendations/risk_engine.py`** — DBSCAN noise (`cluster_id == -1`)
  now always returns a dedicated `NOISE_LABEL` ("Noise / Outlier") sentinel,
  never a fabricated Low/Moderate/High/Extreme risk level inferred from the
  point's raw feature values. Previously (an earlier fix in this project)
  noise points were scored from their own Temperature/Electricity_Consumption
  values, which was more truthful than the original hardcoded "Low" but
  still implied a risk judgment DBSCAN itself never made. Per explicit
  design decision: "a cooling-demand risk level cannot be reliably inferred
  from the DBSCAN cluster assignment" when that assignment is noise.
- **`app/recommendations/recommender.py`** — `get_recommendations()` no
  longer defaults unrecognized risk-level strings (i.e. the noise
  sentinel) to "Low Cooling Demand"'s recommendation list; returns an
  empty list instead, since generating cooling-demand recommendations for
  a point the model couldn't classify would misrepresent it as a real
  assessment.
- **`app/services/prediction_service.py`** — `predict()` now sets
  `is_noise: bool` and `explanation: str | None` on the response. For
  DBSCAN noise, `explanation` contains the required truthful message and
  `recommendations` is empty; both are `None`/`[]` for every normal
  (non-noise) prediction, K-Means or DBSCAN.
- **`app/models/schemas.py`** — `PredictionResponse` gained `is_noise: bool`
  and `explanation: Optional[str]`.
- **`app/visualization/eda.py`** — fixed the Correlation Matrix chart's
  clipped axis labels ("atitude", "gitude", "erature", etc.) by enabling
  Plotly `automargin` on both axes, setting generous explicit margins
  (`l=140, r=40, t=60, b=110`) as a baseline, a `-35°` tick angle on the
  x-axis, and using spaced display names ("Electricity Consumption"
  instead of "Electricity_Consumption") for the chart's axis labels only —
  the underlying correlation values and dataset are byte-for-byte
  unchanged (verified: max diff vs. directly-computed correlation = 0.0).
- **`app/visualization/eda.py`, `app/models/schemas.py`,
  `app/services/prediction_service.py`, `app/api/routes.py`** — (prior fix,
  still present) `GET /clusters/records` per-record geo + cluster data
  endpoint; `humidity_distribution`/`humidity_scatter_plot` charts.
- **`app/preprocessing/preprocessor.py`** — removed a deprecated pandas
  kwarg, harmless cleanup.

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
