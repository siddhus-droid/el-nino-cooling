import { Link } from "react-router-dom";
import { Play, ArrowRight, CircleDot } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, StatCard } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState } from "../components/ui/States";
import { ElbowChart } from "../components/charts/ElbowChart";
import { ClusterBarChart } from "../components/charts/ClusterBarChart";
import { RiskBadge } from "../components/ui/Badge";
import { useToast } from "../components/ui/Toast";

export function KMeans() {
  const { preprocess, upload, kmeans, kmeansClusters, doTrainKMeans } = useAppState();
  const { showToast } = useToast();
  const hasDataset = !!preprocess.data || !!upload.data;

  const handleTrain = async () => {
    try {
      await doTrainKMeans();
      showToast("K-Means model trained.", "success");
    } catch {
      showToast("K-Means training failed — see details below.", "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Step 4"
        title="K-Means Clustering"
        description="K-Means groups observations with similar environmental and electricity-consumption characteristics. The optimal number of clusters (k) is selected automatically via the elbow method."
        action={
          hasDataset && (
            <Button onClick={handleTrain} loading={kmeans.loading} icon={<Play size={16} />}>
              {kmeans.data ? "Retrain K-Means" : "Train K-Means"}
            </Button>
          )
        }
      />

      {!hasDataset ? (
        <Card>
          <EmptyState
            title="No dataset available"
            description="Upload and preprocess a dataset before training K-Means."
            icon={CircleDot}
            action={
              <Link to="/dashboard/dataset">
                <Button variant="secondary" size="sm">
                  Go to dataset upload
                </Button>
              </Link>
            }
          />
        </Card>
      ) : kmeans.error ? (
        <Card>
          <ErrorState error={kmeans.error} onRetry={handleTrain} />
        </Card>
      ) : !kmeans.data ? (
        <Card>
          <EmptyState
            title="K-Means hasn't been trained yet"
            description="Run training to automatically select the optimal cluster count and fit the model."
            icon={CircleDot}
            action={
              <Button size="sm" onClick={handleTrain} loading={kmeans.loading}>
                Train K-Means
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Optimal K" value={kmeans.data.optimal_k} accent="cool" />
            <StatCard
              label="Silhouette Score"
              value={kmeans.data.silhouette_score.toFixed(4)}
              accent="cool"
            />
            <StatCard label="Inertia" value={kmeans.data.inertia.toFixed(1)} accent="neutral" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <h3 className="font-display font-semibold text-ground-50 mb-1">
                Elbow method
              </h3>
              <p className="text-ground-400 text-sm mb-4">
                Inertia vs. k — the highlighted point is the automatically
                selected optimal k.
              </p>
              {Object.keys(kmeans.data.elbow_scores).length > 0 ? (
                <ElbowChart elbowScores={kmeans.data.elbow_scores} optimalK={kmeans.data.optimal_k} />
              ) : (
                <p className="text-ground-500 text-sm text-center py-10">
                  Elbow scores aren't available for this session (e.g. after a
                  page refresh restored a prior training run). Retrain to see
                  the curve.
                </p>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-display font-semibold text-ground-50 mb-1">
                Cluster distribution
              </h3>
              <p className="text-ground-400 text-sm mb-4">
                Number of records assigned to each cluster.
              </p>
              <ClusterBarChart clusterCounts={kmeans.data.cluster_counts} />
            </Card>
          </div>

          {kmeansClusters.data?.clusters?.risk_level_counts && (
            <Card className="p-6 mb-6">
              <h3 className="font-display font-semibold text-ground-50 mb-1">
                Risk level breakdown
              </h3>
              <p className="text-ground-400 text-sm mb-4">
                Clusters mapped to cooling-demand risk levels, ranked by
                composite temperature + electricity-consumption score.
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(
                  kmeansClusters.data.clusters.risk_level_counts as Record<string, number>
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

          <Card className="p-5 bg-cool-500/5 border-cool-500/20">
            <p className="text-ground-300 text-sm leading-relaxed">
              <span className="text-cool-400 font-medium">K-Means</span> groups
              observations with similar environmental and
              electricity-consumption characteristics into{" "}
              {kmeans.data.optimal_k} clusters, chosen automatically via the
              elbow method on inertia.
            </p>
          </Card>

          <div className="mt-6">
            <Link to="/dashboard/dbscan">
              <Button variant="secondary" icon={<ArrowRight size={16} />}>
                Continue to DBSCAN
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
