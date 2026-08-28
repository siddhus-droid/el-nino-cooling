import { Link } from "react-router-dom";
import { GitCompareArrows, ArrowRight, Trophy } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState } from "../components/ui/States";
import { ComparisonBarChart } from "../components/charts/ComparisonBarChart";
import { useToast } from "../components/ui/Toast";

function MetricRow({
  label,
  kmeansValue,
  dbscanValue,
  higherIsBetter = true,
}: {
  label: string;
  kmeansValue: number | null;
  dbscanValue: number | null;
  higherIsBetter?: boolean;
}) {
  let kmeansWins = false;
  let dbscanWins = false;
  if (kmeansValue !== null && dbscanValue !== null) {
    kmeansWins = higherIsBetter ? kmeansValue > dbscanValue : kmeansValue < dbscanValue;
    dbscanWins = higherIsBetter ? dbscanValue > kmeansValue : dbscanValue < kmeansValue;
  }

  return (
    <tr className="border-b border-ground-800 last:border-0">
      <td className="py-3 text-sm text-ground-300">{label}</td>
      <td className={`py-3 text-sm font-mono-data text-right ${kmeansWins ? "text-cool-400 font-semibold" : "text-ground-200"}`}>
        {kmeansValue !== null ? kmeansValue.toFixed(4) : "—"}
      </td>
      <td className={`py-3 text-sm font-mono-data text-right ${dbscanWins ? "text-hot-400 font-semibold" : "text-ground-200"}`}>
        {dbscanValue !== null ? dbscanValue.toFixed(4) : "—"}
      </td>
    </tr>
  );
}

export function Compare() {
  const { kmeans, dbscan, compare, doCompare } = useAppState();
  const { showToast } = useToast();
  const bothTrained = !!kmeans.data && !!dbscan.data;

  const handleCompare = async () => {
    try {
      await doCompare();
      showToast("Comparison complete.", "success");
    } catch {
      showToast("Comparison failed — see details below.", "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Step 6"
        title="Model Comparison"
        description="Compares K-Means and DBSCAN using Silhouette Score, Davies-Bouldin Index, and Calinski-Harabasz Score, then recommends the better fit."
        action={
          bothTrained && (
            <Button onClick={handleCompare} loading={compare.loading} icon={<GitCompareArrows size={16} />}>
              {compare.data ? "Re-run comparison" : "Compare models"}
            </Button>
          )
        }
      />

      {!bothTrained ? (
        <Card>
          <EmptyState
            title="Both models are required"
            description="Train K-Means and DBSCAN before running a comparison."
            icon={GitCompareArrows}
            action={
              <div className="flex gap-2">
                {!kmeans.data && (
                  <Link to="/dashboard/kmeans">
                    <Button variant="secondary" size="sm">Train K-Means</Button>
                  </Link>
                )}
                {!dbscan.data && (
                  <Link to="/dashboard/dbscan">
                    <Button variant="secondary" size="sm">Train DBSCAN</Button>
                  </Link>
                )}
              </div>
            }
          />
        </Card>
      ) : compare.error ? (
        <Card>
          <ErrorState error={compare.error} onRetry={handleCompare} />
        </Card>
      ) : !compare.data ? (
        <Card>
          <EmptyState
            title="Ready to compare"
            description="Both models are trained — run the comparison to see internal validation metrics side by side."
            icon={GitCompareArrows}
            action={
              <Button size="sm" onClick={handleCompare} loading={compare.loading}>
                Compare models
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* ---- Recommended model banner ---- */}
          <Card className="p-6 mb-6 bg-gradient-to-r from-cool-500/10 to-transparent border-cool-500/20">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-cool-500/15 p-3">
                <Trophy size={22} className="text-cool-400" />
              </div>
              <div>
                <p className="text-ground-400 text-xs uppercase tracking-wide font-mono-data mb-0.5">
                  Recommended model
                </p>
                <p className="font-display text-2xl font-semibold text-ground-50 capitalize">
                  {compare.data.recommended_model}
                </p>
              </div>
            </div>
            <p className="text-ground-300 text-sm leading-relaxed mt-4">
              {compare.data.reasoning}
            </p>
          </Card>

          <div className="grid lg:grid-cols-[1fr_1fr] gap-6 mb-6">
            {/* ---- Metric table ---- */}
            <Card className="p-6">
              <h3 className="font-display font-semibold text-ground-50 mb-4">
                Metric comparison
              </h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ground-700">
                    <th className="text-left text-xs text-ground-500 uppercase tracking-wide font-medium pb-2">
                      Metric
                    </th>
                    <th className="text-right text-xs text-cool-500 uppercase tracking-wide font-medium pb-2">
                      K-Means
                    </th>
                    <th className="text-right text-xs text-hot-500 uppercase tracking-wide font-medium pb-2">
                      DBSCAN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <MetricRow
                    label="Silhouette Score"
                    kmeansValue={compare.data.kmeans.silhouette_score}
                    dbscanValue={compare.data.dbscan.silhouette_score}
                    higherIsBetter
                  />
                  <MetricRow
                    label="Davies-Bouldin Index"
                    kmeansValue={compare.data.kmeans.davies_bouldin_index}
                    dbscanValue={compare.data.dbscan.davies_bouldin_index}
                    higherIsBetter={false}
                  />
                  <MetricRow
                    label="Calinski-Harabasz Score"
                    kmeansValue={compare.data.kmeans.calinski_harabasz_score}
                    dbscanValue={compare.data.dbscan.calinski_harabasz_score}
                    higherIsBetter
                  />
                  <MetricRow
                    label="Number of Clusters"
                    kmeansValue={compare.data.kmeans.n_clusters}
                    dbscanValue={compare.data.dbscan.n_clusters}
                    higherIsBetter
                  />
                </tbody>
              </table>
            </Card>

            {/* ---- Comparison chart ---- */}
            <Card className="p-6">
              <h3 className="font-display font-semibold text-ground-50 mb-4">
                Visual comparison
              </h3>
              <ComparisonBarChart kmeans={compare.data.kmeans} dbscan={compare.data.dbscan} />
            </Card>
          </div>

          <div>
            <Link to="/dashboard/predict">
              <Button variant="secondary" icon={<ArrowRight size={16} />}>
                Continue to prediction
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
