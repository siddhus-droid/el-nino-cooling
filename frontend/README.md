# El Niño Urban Cooling Impact — Frontend Dashboard

React + TypeScript + Vite + Tailwind dashboard for the Project 48 PBL
FastAPI backend (K-Means/DBSCAN clustering on El Niño urban cooling data).

## Setup

```bash
cd frontend
npm install
npm run dev
```

Dev server: **http://localhost:5173**. Backend must be running at
**http://127.0.0.1:8000** (see `.env` → `VITE_API_BASE_URL`).

```bash
npm run build      # production build -> dist/
npm run preview    # preview the production build locally
```

## What changed in this update

- **`src/api/types.ts`** — `PredictionResponse` gained `is_noise: boolean`
  and `explanation: string | null`, matching the backend's new fields.
- **`src/pages/Prediction.tsx`** — when a DBSCAN prediction returns noise
  (`is_noise: true`), the result panel no longer shows a fabricated risk
  badge alongside recommendations. Instead it shows the cluster marked
  `(noise)`, the `Noise / Outlier` badge, the backend's truthful
  explanation text, no recommendations list, and a small card explaining
  why K-Means and DBSCAN are allowed to disagree here (K-Means always
  assigns a cluster; DBSCAN can correctly decline to). The "Recent
  predictions" history table also marks noise-cluster rows explicitly.
- **`src/components/ui/Badge.tsx`** — added an explicit, intentional style
  for the `"Noise / Outlier"` label (dashed border, neutral gray) so it
  reads as a distinct model output, not a risk level that happened to
  fall through to the default badge style.
- **`src/pages/EDA.tsx`** — added a truthful caption ("Only one time
  period is present in the current dataset.") under `monthly_trend`/
  `yearly_trend` when the chart's own data legitimately has only one
  distinct time period — detected from the actual chart trace data, nothing
  fabricated or smoothed.
- Backend also fixed the Correlation Matrix's clipped axis labels (see
  backend README) - no frontend change was needed for this, since
  `PlotlyChart.tsx`'s margin-merging already applies whatever `layout.margin`
  the backend sends.

## Prior update (still present)

- EDA auto-load effect fix (re-upload no longer leaves the page blank),
  `ChartErrorBoundary` (one bad chart can't blank the whole page), Geo View
  rewritten with real Leaflet + `GET /clusters/records`, shared cluster
  color mapping (`clusterColors.ts`) between `ClusterBarChart` and the map.

### Problem 1 — EDA charts not rendering

**Root cause:** `EDA.tsx`'s auto-load `useEffect` depended on a derived
boolean (`hasDataset`) that could stay `true` across a re-upload while
`eda.data` was reset to `null` underneath it — so the effect never
re-fired and the page rendered nothing.

**Fixes:**
- `src/pages/EDA.tsx` — effect now depends on the actual data references,
  not the derived boolean; added an explicit "no charts returned" state.
- `src/components/ui/ChartErrorBoundary.tsx` **(new)** — isolates
  per-chart render failures so one bad chart can't blank the whole page
  (previously there were zero error boundaries anywhere in the app).
- `src/components/charts/PlotlyChart.tsx` — strips the backend's default
  Plotly theme `template` object instead of spreading it (avoids
  light-theme defaults leaking through the dark re-theme), guards
  empty/missing trace data.
- Backend gained two new charts (`humidity_distribution`,
  `humidity_scatter_plot`) — see `CHART_TITLES` in `EDA.tsx` and the
  Overview page's derived-stats key.

### Problem 2 — Geo View had no real map

**Fix:** full rewrite of `src/pages/MapPage.tsx` using **Leaflet +
react-leaflet**, backed by the new `GET /clusters/records` endpoint:
- City-level markers (aggregated from per-record data — see
  `src/utils/cityGroups.ts`), colored by cluster (`src/utils/clusterColors.ts`,
  shared with the K-Means/DBSCAN bar charts for visual consistency)
- K-Means / DBSCAN toggle (DBSCAN disabled until trained)
- Click-to-see-detail popups: city, avg temperature/humidity/electricity,
  both cluster IDs, risk level, record count
- Exact empty-state message when no model is trained yet: *"Train
  K-Means and DBSCAN first to view cluster assignments."* — and a clear
  banner when only K-Means is available
- Lazy-loaded (`React.lazy`) so Leaflet doesn't bloat the main bundle

New/changed supporting files: `src/api/types.ts` (`ClusterRecordItem`,
`ClusterRecordsResponse`), `src/api/clustering.ts` (`getClusterRecords`),
`src/context/AppStateContext.tsx` (`clusterRecords` state,
`doLoadClusterRecords`, auto-refresh after training, rehydration on
page load).

## Folder structure

```
frontend/
  .env                        # VITE_API_BASE_URL
  src/
    main.tsx                  # entry point (imports leaflet/dist/leaflet.css)
    App.tsx                   # routing; EDA + Map pages are lazy-loaded
    api/
      client.ts, types.ts, dataset.ts, eda.ts, clustering.ts, prediction.ts
    context/
      AppStateContext.tsx      # global state + backend rehydration
    components/
      layout/                  # Sidebar, Topbar, DashboardLayout, PageHeader
      ui/                       # Card, Button, Badge, Toast, States, ChartErrorBoundary
      charts/
        PlotlyChart.tsx          # renders backend's raw Plotly EDA figures
        ElbowChart.tsx, ClusterBarChart.tsx, ComparisonBarChart.tsx
    pages/
      Landing.tsx, Overview.tsx, Dataset.tsx, Preprocessing.tsx,
      EDA.tsx, KMeans.tsx, DBSCAN.tsx, Compare.tsx, Prediction.tsx,
      MapPage.tsx, Insights.tsx
    utils/
      edaDerived.ts    # real averages/correlations computed from EDA chart data
      cityGroups.ts    # per-city aggregation for the map
      clusterColors.ts # shared cluster -> color mapping
```

## Testing the full workflow

1. **Dataset** → upload CSV (Date, City, Latitude, Longitude, Temperature,
   Humidity, Electricity_Consumption)
2. **Preprocessing** → run pipeline
3. **EDA** → 9 charts render automatically; try re-uploading a different
   file while on this page to confirm it refreshes instead of going blank
4. **K-Means** → train → elbow chart, cluster distribution, risk breakdown
5. **DBSCAN** → train → cluster distribution, noise points, risk breakdown
6. **Model Comparison** → compare → recommended model
7. **Prediction** → pick a model, enter readings → see predicted risk
8. **Geo View** → city markers colored by cluster; toggle K-Means/DBSCAN;
   click a marker for details
9. **Insights** → auto-generated observations from whatever's been run

Refreshing the browser at any point re-hydrates state from `GET /metrics`
+ `GET /clusters` + `GET /clusters/records`, since the backend persists
dataset/models to disk.

## Verification performed

- `npm run build` (TypeScript strict mode) — **0 errors**
- `npx oxlint src/` — **0 errors** (2 harmless fast-refresh style warnings)
- Every endpoint re-verified against a live backend running the updated
  code, including the new `/clusters/records` at each training stage
  (untrained → K-Means only → both trained)
- Not verified: an actual browser click-through (no headless browser
  available in the sandbox this was built in) — please click through the
  workflow above once and flag anything that looks off.
