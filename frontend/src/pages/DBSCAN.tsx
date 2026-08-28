import { Link } from "react-router-dom";
import { Play, ArrowRight, Waypoints } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, StatCard } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState } from "../components/ui/States";
import { ClusterBarChart } from "../components/charts/ClusterBarChart";
import { RiskBadge } from "../components/ui/Badge";
import { useToast } from "../components/ui/Toast";

export function DBSCAN() {
  const { preprocess, upload, dbscan, dbscanClusters, doTrainDBSCAN } = useAppState();
  const { showToast } = useToast();
  const hasDataset = !!preprocess.data || !!upload.data;

  const handleTrain = async () => {
    try {
      await doTrainDBSCAN();
      showToast("DBSCAN model trained.", "success");
    } catch {
      showToast("DBSCAN training failed — see details below.", "error");
    }
  };

  const noisePercent =
    dbscan.data && dbscanClusters.data
      ? ((dbscan.data.n_noise / dbscanClusters.data.total_records) * 100).toFixed(1)
      : null;

  return (
    <div>
      <PageHeader
        eyebrow="Step 5"
        title="DBSCAN Clustering"
        description="DBSCAN groups records by density, discovering clusters of arbitrary shape while flagging sparse, atypical records as noise rather than forcing them into a cluster. eps and min_samples are auto-tuned via grid search."
        action={
          hasDataset && (
            <Button onClick={handleTrain} loading={dbscan.loading} icon={<Play size={16} />}>
              {dbscan.data ? "Retrain DBSCAN" : "Train DBSCAN"}
            </Button>
          )
        }
      />

      {!hasDataset ? (
        <Card>
          <EmptyState
            title="No dataset available"
            description="Upload and preprocess a dataset before training DBSCAN."
            icon={Waypoints}
            action={
              <Link to="/dashboard/dataset">
                <Button variant="secondary" size="sm">
                  Go to dataset upload
                </Button>
              </Link>
            }
          />
        </Card>
      ) : dbscan.error ? (
        <Card>
          <ErrorState error={dbscan.error} onRetry={handleTrain} />
        </Card>
      ) : !dbscan.data ? (
        <Card>
          <EmptyState
            title="DBSCAN hasn't been trained yet"
            description="Run training to auto-tune eps/min_samples and fit the model."
            icon={Waypoints}
            action={
              <Button size="sm" onClick={handleTrain} loading={dbscan.loading}>
                Train DBSCAN
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard label="Clusters Found" value={dbscan.data.n_clusters} accent="hot" />
            <StatCard label="Noise Points" value={dbscan.data.n_noise} accent="amber" suffix={noisePercent ? `(${noisePercent}%)` : undefined} />
            <StatCard
              label="Silhouette Score"
              value={dbscan.data.silhouette_score !== null ? dbscan.data.silhouette_score.toFixed(4) : null}
              accent="hot"
            />
            <StatCard label="eps" value={dbscan.data.eps} accent="neutral" />
            <StatCard label="min_samples" value={dbscan.data.min_samples} accent="neutral" />
          </div>

          <Card className="p-6 mb-6">
            <h3 className="font-display font-semibold text-ground-50 mb-1">
              Cluster distribution
            </h3>
            <p className="text-ground-400 text-sm mb-4">
              Records per cluster — the gray bar represents noise points that
              didn't fit any dense region.
            </p>
            <ClusterBarChart clusterCounts={dbscan.data.cluster_counts} />
          </Card>

          {dbscanClusters.data?.clusters?.risk_level_counts && (
            <Card className="p-6 mb-6">
              <h3 className="font-display font-semibold text-ground-50 mb-1">
                Risk level breakdown
              </h3>
              <p className="text-ground-400 text-sm mb-4">
                Noise points are conservatively classified as{" "}
                <span className="text-ground-200 font-medium">Low Cooling Demand</span>.
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(
                  dbscanClusters.data.clusters.risk_level_counts as Record<string, number>
                ).map(([level, count]) => (
                  <div
                    key={level}
                    className="flex items-center gap-2.5 bg-ground-800 rounded-lg px-3.5 py-2.5"
                  >
                    <RiskBadge level={level} />
                    <span className="font-mono-data text-ground-100 text-sm font-semibold">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5 bg-hot-500/5 border-hot-500/20">
            <p className="text-ground-300 text-sm leading-relaxed">
              <span className="text-hot-400 font-medium">DBSCAN</span> found{" "}
              {dbscan.data.n_clusters} density-based clusters and flagged{" "}
              {dbscan.data.n_noise} records as noise — atypical combinations of
              temperature, humidity, and consumption that didn't fit a dense
              region.
            </p>
          </Card>

          <div className="mt-6">
            <Link to="/dashboard/compare">
              <Button variant="secondary" icon={<ArrowRight size={16} />}>
                Continue to model comparison
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
