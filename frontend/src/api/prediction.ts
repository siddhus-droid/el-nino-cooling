import { apiClient } from "./client";
import type {
  MetricsResponse,
  PredictionRequest,
  PredictionResponse,
  RecommendationsResponse,
} from "./types";

/** POST /predict */
export async function predict(
  payload: PredictionRequest
): Promise<PredictionResponse> {
  const response = await apiClient.post<PredictionResponse>(
    "/predict",
    payload
  );
  return response.data;
}

/** GET /recommendations */
export async function getRecommendations(): Promise<RecommendationsResponse> {
  const response = await apiClient.get<RecommendationsResponse>(
    "/recommendations"
  );
  return response.data;
}

/** GET /metrics */
export async function getMetrics(): Promise<MetricsResponse> {
  const response = await apiClient.get<MetricsResponse>("/metrics");
  return response.data;
}
