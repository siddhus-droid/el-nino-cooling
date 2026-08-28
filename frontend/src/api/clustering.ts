import { apiClient } from "./client";
import type {
  ClusterRecordsResponse,
  ClustersResponse,
  CompareResponse,
  DBSCANTrainRequest,
  DBSCANTrainResponse,
  KMeansTrainRequest,
  KMeansTrainResponse,
  ModelType,
} from "./types";

/** POST /train/kmeans — body may be {} to let the backend auto-select k. */
export async function trainKMeans(
  payload: KMeansTrainRequest = {}
): Promise<KMeansTrainResponse> {
  const response = await apiClient.post<KMeansTrainResponse>(
    "/train/kmeans",
    payload
  );
  return response.data;
}

/** POST /train/dbscan — body may be {} to let the backend auto-tune eps/min_samples. */
export async function trainDBSCAN(
  payload: DBSCANTrainRequest = {}
): Promise<DBSCANTrainResponse> {
  const response = await apiClient.post<DBSCANTrainResponse>(
    "/train/dbscan",
    payload
  );
  return response.data;
}

/** GET /compare */
export async function compareModels(): Promise<CompareResponse> {
  const response = await apiClient.get<CompareResponse>("/compare");
  return response.data;
}

/** GET /clusters?model_type=kmeans|dbscan */
export async function getClusters(
  modelType: ModelType
): Promise<ClustersResponse> {
  const response = await apiClient.get<ClustersResponse>("/clusters", {
    params: { model_type: modelType },
  });
  return response.data;
}

/**
 * GET /clusters/records — per-record geo + cluster data for the map view.
 * kmeans_trained/dbscan_trained flags indicate which cluster fields are
 * actually populated; cluster fields are null for models not yet trained.
 */
export async function getClusterRecords(): Promise<ClusterRecordsResponse> {
  const response = await apiClient.get<ClusterRecordsResponse>(
    "/clusters/records"
  );
  return response.data;
}
