/**
 * TypeScript types mirroring the FastAPI backend's OpenAPI schema exactly
 * (pulled from GET /openapi.json). Do not add fields the backend doesn't
 * actually return — pages must render "not available" states instead of
 * guessing at shapes.
 */

// ---------------------------------------------------------------------------
// Upload / Preprocess
// ---------------------------------------------------------------------------
export interface UploadResponse {
  status: string;
  filename: string;
  rows: number;
  columns: string[];
  message: string;
}

export interface PreprocessResponse {
  status: string;
  rows_before: number;
  rows_after: number;
  duplicates_removed: number;
  missing_values_handled: number;
  outliers_removed: number;
  columns: string[];
  message: string;
}

// ---------------------------------------------------------------------------
// EDA — charts is a dict of Plotly figure JSON (each has `data` + `layout`)
// ---------------------------------------------------------------------------
export interface PlotlyFigure {
  data: unknown[];
  layout: Record<string, unknown>;
}

export interface EDAResponse {
  status: string;
  charts: Record<string, PlotlyFigure>;
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------
export interface KMeansTrainRequest {
  min_k?: number | null;
  max_k?: number | null;
  k?: number | null;
}

export interface KMeansTrainResponse {
  status: string;
  optimal_k: number;
  silhouette_score: number;
  inertia: number;
  cluster_counts: Record<string, number>;
  elbow_scores: Record<string, number>;
  message: string;
}

export interface DBSCANTrainRequest {
  eps?: number | null;
  min_samples?: number | null;
}

export interface DBSCANTrainResponse {
  status: string;
  eps: number;
  min_samples: number;
  n_clusters: number;
  n_noise: number;
  silhouette_score: number | null;
  cluster_counts: Record<string, number>;
  message: string;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------
export interface ClusterMetrics {
  silhouette_score: number | null;
  davies_bouldin_index: number | null;
  calinski_harabasz_score: number | null;
  n_clusters: number;
}

export interface CompareResponse {
  status: string;
  kmeans: ClusterMetrics;
  dbscan: ClusterMetrics;
  recommended_model: string;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Prediction
// ---------------------------------------------------------------------------
export type ModelType = "kmeans" | "dbscan";

export interface PredictionRequest {
  temperature: number;
  humidity: number;
  electricity_consumption: number;
  population_density?: number | null;
  model_type: ModelType;
}

export interface PredictionResponse {
  status: string;
  cluster: number;
  risk_level: string;
  cooling_demand_category: string;
  recommendations: string[];
  model_used: string;
}

// ---------------------------------------------------------------------------
// Clusters / Metrics / Recommendations
// ---------------------------------------------------------------------------
export interface ClustersResponse {
  status: string;
  model_type: string;
  total_records: number;
  clusters: {
    cluster_counts?: Record<string, number>;
    risk_level_counts?: Record<string, number>;
    [key: string]: unknown;
  };
}

/** One row of the dataset with coordinates and (if trained) cluster assignments. */
export interface ClusterRecordItem {
  date: string;
  city: string;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  electricity_consumption: number;
  population_density?: number | null;
  kmeans_cluster?: number | null;
  kmeans_risk_level?: string | null;
  dbscan_cluster?: number | null;
  dbscan_risk_level?: string | null;
}

export interface ClusterRecordsResponse {
  status: string;
  total_records: number;
  kmeans_trained: boolean;
  dbscan_trained: boolean;
  records: ClusterRecordItem[];
}

export interface MetricsResponse {
  status: string;
  metrics: Record<string, unknown>;
}

export interface RecommendationsResponse {
  status: string;
  recommendations_by_risk_level: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Format used by the app's custom AppBaseException handler. */
export interface AppErrorResponse {
  status: "error";
  error_type: string;
  message: string;
  details: Record<string, unknown>;
}

/** Format used by FastAPI/Pydantic's default 422 validation errors. */
export interface ValidationErrorResponse {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

/** Normalized shape the UI actually works with, regardless of backend format. */
export interface NormalizedApiError {
  statusCode: number | null;
  message: string;
  fieldErrors?: { field: string; message: string }[];
  isNetworkError: boolean;
}
