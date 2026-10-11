import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { uploadDataset, runPreprocessing } from "../api/dataset";
import { getEDA } from "../api/eda";
import {
  compareModels,
  getClusterRecords,
  getClusters,
  trainDBSCAN,
  trainKMeans,
} from "../api/clustering";
import { getMetrics, getRecommendations, predict } from "../api/prediction";
import { normalizeApiError } from "../api/client";
import type {
  ClusterRecordsResponse,
  ClustersResponse,
  CompareResponse,
  DBSCANTrainResponse,
  DatasetProfileName,
  EDAResponse,
  KMeansTrainResponse,
  NormalizedApiError,
  PredictionRequest,
  PredictionResponse,
  PreprocessResponse,
  RecommendationsResponse,
  UploadResponse,
} from "../api/types";

interface AsyncSlice<T> {
  data: T | null;
  loading: boolean;
  error: NormalizedApiError | null;
}

function emptySlice<T>(): AsyncSlice<T> {
  return { data: null, loading: false, error: null };
}

interface AppState {
  upload: AsyncSlice<UploadResponse>;
  preprocess: AsyncSlice<PreprocessResponse>;
  eda: AsyncSlice<EDAResponse>;
  kmeans: AsyncSlice<KMeansTrainResponse>;
  dbscan: AsyncSlice<DBSCANTrainResponse>;
  compare: AsyncSlice<CompareResponse>;
  kmeansClusters: AsyncSlice<ClustersResponse>;
  dbscanClusters: AsyncSlice<ClustersResponse>;
  clusterRecords: AsyncSlice<ClusterRecordsResponse>;
  recommendations: AsyncSlice<RecommendationsResponse>;
  predictionHistory: PredictionResponse[];
  rehydrating: boolean;

  doUpload: (file: File, onProgress?: (pct: number) => void) => Promise<void>;
  doPreprocess: () => Promise<void>;
  doEDA: () => Promise<void>;
  doTrainKMeans: (k?: number) => Promise<void>;
  doTrainDBSCAN: (eps?: number, minSamples?: number) => Promise<void>;
  doCompare: () => Promise<void>;
  doPredict: (payload: PredictionRequest) => Promise<PredictionResponse | null>;
  doLoadRecommendations: () => Promise<void>;
  doLoadClusterRecords: () => Promise<void>;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [upload, setUpload] = useState<AsyncSlice<UploadResponse>>(emptySlice());
  const [preprocess, setPreprocess] = useState<AsyncSlice<PreprocessResponse>>(
    emptySlice()
  );
  const [eda, setEda] = useState<AsyncSlice<EDAResponse>>(emptySlice());
  const [kmeans, setKmeans] = useState<AsyncSlice<KMeansTrainResponse>>(
    emptySlice()
  );
  const [dbscan, setDbscan] = useState<AsyncSlice<DBSCANTrainResponse>>(
    emptySlice()
  );
  const [compare, setCompare] = useState<AsyncSlice<CompareResponse>>(
    emptySlice()
  );
  const [kmeansClusters, setKmeansClusters] = useState<
    AsyncSlice<ClustersResponse>
  >(emptySlice());
  const [dbscanClusters, setDbscanClusters] = useState<
    AsyncSlice<ClustersResponse>
  >(emptySlice());
  const [clusterRecords, setClusterRecords] = useState<
    AsyncSlice<ClusterRecordsResponse>
  >(emptySlice());
  const [recommendations, setRecommendations] = useState<
    AsyncSlice<RecommendationsResponse>
  >(emptySlice());
  const [predictionHistory, setPredictionHistory] = useState<
    PredictionResponse[]
  >([]);
  const [rehydrating, setRehydrating] = useState(true);

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  const doUpload = useCallback(
    async (file: File, onProgress?: (pct: number) => void) => {
      setUpload({ data: null, loading: true, error: null });
      try {
        const data = await uploadDataset(file, onProgress);
        setUpload({ data, loading: false, error: null });
        // A fresh upload invalidates everything downstream.
        setPreprocess(emptySlice());
        setEda(emptySlice());
        setKmeans(emptySlice());
        setDbscan(emptySlice());
        setCompare(emptySlice());
        setKmeansClusters(emptySlice());
        setDbscanClusters(emptySlice());
        setClusterRecords(emptySlice());
      } catch (err) {
        setUpload({ data: null, loading: false, error: normalizeApiError(err) });
        throw err;
      }
    },
    []
  );

  const doPreprocess = useCallback(async () => {
    setPreprocess({ data: null, loading: true, error: null });
    try {
      const data = await runPreprocessing();
      setPreprocess({ data, loading: false, error: null });
    } catch (err) {
      setPreprocess({ data: null, loading: false, error: normalizeApiError(err) });
      throw err;
    }
  }, []);

  const doEDA = useCallback(async () => {
    setEda((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getEDA();
      setEda({ data, loading: false, error: null });
    } catch (err) {
      setEda({ data: null, loading: false, error: normalizeApiError(err) });
      throw err;
    }
  }, []);

  const doTrainKMeans = useCallback(async (k?: number) => {
    setKmeans((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await trainKMeans(k ? { k } : {});
      setKmeans({ data, loading: false, error: null });
      try {
        const clusters = await getClusters("kmeans");
        setKmeansClusters({ data: clusters, loading: false, error: null });
      } catch {
        /* non-fatal: cluster summary is supplementary */
      }
      try {
        const records = await getClusterRecords();
        setClusterRecords({ data: records, loading: false, error: null });
      } catch {
        /* non-fatal: geo view will lazily load if this fails */
      }
    } catch (err) {
      setKmeans({ data: null, loading: false, error: normalizeApiError(err) });
      throw err;
    }
  }, []);

  const doTrainDBSCAN = useCallback(async (eps?: number, minSamples?: number) => {
    setDbscan((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await trainDBSCAN({
        eps: eps ?? null,
        min_samples: minSamples ?? null,
      });
      setDbscan({ data, loading: false, error: null });
      try {
        const clusters = await getClusters("dbscan");
        setDbscanClusters({ data: clusters, loading: false, error: null });
      } catch {
        /* non-fatal */
      }
      try {
        const records = await getClusterRecords();
        setClusterRecords({ data: records, loading: false, error: null });
      } catch {
        /* non-fatal: geo view will lazily load if this fails */
      }
    } catch (err) {
      setDbscan({ data: null, loading: false, error: normalizeApiError(err) });
      throw err;
    }
  }, []);

  const doCompare = useCallback(async () => {
    setCompare((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await compareModels();
      setCompare({ data, loading: false, error: null });
    } catch (err) {
      setCompare({ data: null, loading: false, error: normalizeApiError(err) });
      throw err;
    }
  }, []);

  const doPredict = useCallback(
    async (payload: PredictionRequest): Promise<PredictionResponse | null> => {
      const data = await predict(payload);
      setPredictionHistory((prev) => [data, ...prev].slice(0, 20));
      return data;
    },
    []
  );

  const doLoadRecommendations = useCallback(async () => {
    setRecommendations((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getRecommendations();
      setRecommendations({ data, loading: false, error: null });
    } catch (err) {
      setRecommendations({
        data: null,
        loading: false,
        error: normalizeApiError(err),
      });
    }
  }, []);

  const doLoadClusterRecords = useCallback(async () => {
    setClusterRecords((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getClusterRecords();
      setClusterRecords({ data, loading: false, error: null });
    } catch (err) {
      setClusterRecords({
        data: null,
        loading: false,
        error: normalizeApiError(err),
      });
      throw err;
    }
  }, []);

  // ------------------------------------------------------------------
  // Rehydration: on load, the backend may already hold state (dataset
  // uploaded / preprocessed / models trained in a previous session,
  // since app_state persists to disk). Reconstruct the UI's picture of
  // that state from GET /metrics + GET /clusters rather than assuming
  // a blank slate.
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      try {
        const metricsResp = await getMetrics();
        if (cancelled) return;

        const m = metricsResp.metrics as Record<string, any>;
        // Schema info lives in the preprocessing report; training metrics
        // inherit it (models are always trained on the preprocessed dataset).
        const restoredProfile: DatasetProfileName =
          m.preprocessing_report?.dataset_profile ?? "legacy";
        const restoredFeatures: string[] = m.preprocessing_report?.clustering_features ?? [];

        if (m.preprocessing_report) {
          setPreprocess({
            data: {
              status: "success",
              message: "Restored from a previous session.",
              ...m.preprocessing_report,
            } as PreprocessResponse,
            loading: false,
            error: null,
          });
        }

        if (m.kmeans) {
          setKmeans({
            data: {
              status: "success",
              message: "Restored from a previous session.",
              optimal_k: m.kmeans.optimal_k,
              silhouette_score: m.kmeans.silhouette_score,
              inertia: m.kmeans.inertia,
              cluster_counts: m.kmeans.cluster_counts,
              elbow_scores: m.kmeans.elbow_scores ?? {},
              dataset_profile: restoredProfile,
              clustering_features: restoredFeatures,
            },
            loading: false,
            error: null,
          });
          try {
            const clusters = await getClusters("kmeans");
            if (!cancelled) {
              setKmeansClusters({ data: clusters, loading: false, error: null });
            }
          } catch {
            /* ignore */
          }
        }

        if (m.dbscan) {
          setDbscan({
            data: {
              status: "success",
              message: "Restored from a previous session.",
              eps: m.dbscan.eps,
              min_samples: m.dbscan.min_samples,
              n_clusters: m.dbscan.n_clusters,
              n_noise: m.dbscan.n_noise,
              silhouette_score: m.dbscan.silhouette_score,
              cluster_counts: m.dbscan.cluster_counts,
              dataset_profile: restoredProfile,
              clustering_features: restoredFeatures,
            },
            loading: false,
            error: null,
          });
          try {
            const clusters = await getClusters("dbscan");
            if (!cancelled) {
              setDbscanClusters({ data: clusters, loading: false, error: null });
            }
          } catch {
            /* ignore */
          }
        }

        if (m.comparison) {
          setCompare({ data: m.comparison as CompareResponse, loading: false, error: null });
        }

        // If either model was trained in a prior session, the geo view
        // has real data to show immediately rather than waiting for the
        // user to visit the K-Means/DBSCAN pages again.
        if (m.kmeans || m.dbscan) {
          try {
            const records = await getClusterRecords();
            if (!cancelled) {
              setClusterRecords({ data: records, loading: false, error: null });
            }
          } catch {
            /* ignore — Geo View will lazily load on visit */
          }
        }
      } catch {
        // No prior session state (or backend just started) — that's fine,
        // the UI simply starts from empty states.
      } finally {
        if (!cancelled) setRehydrating(false);
      }
    }

    rehydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppState>(
    () => ({
      upload,
      preprocess,
      eda,
      kmeans,
      dbscan,
      compare,
      kmeansClusters,
      dbscanClusters,
      clusterRecords,
      recommendations,
      predictionHistory,
      rehydrating,
      doUpload,
      doPreprocess,
      doEDA,
      doTrainKMeans,
      doTrainDBSCAN,
      doCompare,
      doPredict,
      doLoadRecommendations,
      doLoadClusterRecords,
    }),
    [
      upload,
      preprocess,
      eda,
      kmeans,
      dbscan,
      compare,
      kmeansClusters,
      dbscanClusters,
      clusterRecords,
      recommendations,
      predictionHistory,
      rehydrating,
      doUpload,
      doPreprocess,
      doEDA,
      doTrainKMeans,
      doTrainDBSCAN,
      doCompare,
      doPredict,
      doLoadRecommendations,
      doLoadClusterRecords,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return ctx;
}
