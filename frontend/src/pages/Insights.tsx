import { Link } from "react-router-dom";
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  GitCompareArrows,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { isClimacool } from "../utils/enso";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/States";
import { correlationBetween } from "../utils/edaDerived";

interface Insight {
  icon: LucideIcon;
  accent: "hot" | "cool" | "amber";
  title: string;
  body: string;
}

export function Insights() {
  const { preprocess, upload, eda, kmeans, dbscan, compare, kmeansClusters, dbscanClusters } =
    useAppState();
  const hasDataset = !!preprocess.data || !!upload.data;

  const insights: Insight[] = [];

  // ---- Correlation insight (from actual correlation_matrix data) ----
  const climacool = isClimacool(eda.data?.dataset_profile);
  // Correlation-matrix axis labels use spaces (backend display names).
  const consumptionLabel = climacool ? "State Electricity Consumption" : "Electricity Consumption";
  const corr = correlationBetween(eda.data, "Temperature", consumptionLabel);
  if (corr !== null) {
    const strength = Math.abs(corr) >= 0.6 ? "strong" : Math.abs(corr) >= 0.3 ? "moderate" : "weak";
    const direction = corr >= 0 ? "positive" : "negative";
    insights.push({
      icon: TrendingUp,
      accent: "hot",
      title: `${strength[0].toUpperCase()}${strength.slice(1)} ${direction} correlation between temperature and consumption`,
      body: `Based on the current uploaded dataset, temperature and ${climacool ? "state-level electricity consumption" : "electricity consumption"} show a ${strength} ${direction} correlation (r = ${corr.toFixed(
        3
      )}). ${
        corr >= 0.3
          ? "As temperatures rise, electricity consumption tends to rise with them — consistent with cooling-driven demand."
          : "The relationship is weaker than expected, suggesting other factors (humidity, city-level infrastructure) may be co-driving consumption."
      }`,
    });
  }

  // ---- ONI association insight (ClimaCool data only; no causal claim) ----
  const corrOni = climacool ? correlationBetween(eda.data, "ONI Index", "State Electricity Consumption") : null;
  if (corrOni !== null) {
    insights.push({
      icon: TrendingUp,
      accent: "cool",
      title: "ONI index and state electricity consumption",
      body: `Based on the current uploaded dataset, ONI index and state-level electricity consumption have a correlation of r = ${corrOni.toFixed(
        3
      )}. This is an association within the supplied data only; it does not show that El Niño caused changes in electricity consumption.`,
    });
  }

  // ---- K-Means cluster / risk insights ----
  const kmeansRisk = kmeansClusters.data?.clusters?.risk_level_counts as
    | Record<string, number>
    | undefined;
  if (kmeansRisk) {
    const total = Object.values(kmeansRisk).reduce((a, b) => a + b, 0);
    const extreme = kmeansRisk["Extreme Cooling Demand"] ?? 0;
    const high = kmeansRisk["High Cooling Demand"] ?? 0;
    if (total > 0) {
      const pct = (((extreme + high) / total) * 100).toFixed(1);
      insights.push({
        icon: AlertTriangle,
        accent: "hot",
        title: "Potential cooling-demand hotspots identified",
        body: `Based on the current uploaded dataset, K-Means found that ${pct}% of records fall into "High" or "Extreme Cooling Demand" clusters (${
          extreme + high
        } of ${total} records). These represent the combinations of temperature, consumption${climacool ? " and ONI index" : ", and humidity"} that most strongly warrant cooling-infrastructure attention.`,
      });
    }
  }

  // ---- DBSCAN noise / outlier insight ----
  if (dbscan.data && dbscanClusters.data) {
    const noisePercent = (
      (dbscan.data.n_noise / dbscanClusters.data.total_records) *
      100
    ).toFixed(1);
    insights.push({
      icon: Waypoints,
      accent: "amber",
      title: "Outlier records flagged by DBSCAN",
      body: `Based on the current uploaded dataset, DBSCAN classified ${dbscan.data.n_noise} records (${noisePercent}%) as noise — atypical combinations of environmental and consumption readings that didn't fit any dense cluster. These are worth reviewing individually rather than generalizing from cluster-level patterns.`,
    });
  }

  // ---- Model comparison insight ----
  if (compare.data) {
    insights.push({
      icon: GitCompareArrows,
      accent: "cool",
      title: `${compare.data.recommended_model === "kmeans" ? "K-Means" : "DBSCAN"} recommended for this dataset`,
      body: `Based on the current uploaded dataset, the comparison engine recommends ${
        compare.data.recommended_model === "kmeans" ? "K-Means" : "DBSCAN"
      } for this data. ${compare.data.reasoning}`,
    });
  }

  // ---- K-Means quality insight ----
  if (kmeans.data) {
    const quality =
      kmeans.data.silhouette_score >= 0.5
        ? "well-separated"
        : kmeans.data.silhouette_score >= 0.25
        ? "moderately separated"
        : "loosely separated";
    insights.push({
      icon: TrendingUp,
      accent: "cool",
      title: `K-Means clusters are ${quality}`,
      body: `Based on the current uploaded dataset, K-Means settled on ${kmeans.data.optimal_k} clusters with a silhouette score of ${kmeans.data.silhouette_score.toFixed(
        3
      )}, indicating ${quality} groupings. ${
        kmeans.data.silhouette_score < 0.25
          ? "Consider whether additional features or a different k might sharpen the separation."
          : "This is a reasonably confident partitioning of the data."
      }`,
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Step 8"
        title="Insights"
        description="Automatically generated observations, built only from the current session's actual backend results."
      />

      {!hasDataset ? (
        <Card>
          <EmptyState
            title="No dataset available"
            description="Upload a dataset and run the pipeline to generate insights."
            icon={Lightbulb}
            action={
              <Link to="/dashboard/dataset">
                <Button variant="secondary" size="sm">
                  Go to dataset upload
                </Button>
              </Link>
            }
          />
        </Card>
      ) : insights.length === 0 ? (
        <Card>
          <EmptyState
            title="Not enough results yet"
            description="Run EDA, train K-Means/DBSCAN, and compare models to generate insights from real output."
            icon={Lightbulb}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {insights.map((insight, i) => (
            <InsightCard key={i} {...insight} />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ icon: Icon, accent, title, body }: Insight) {
  const accentClasses: Record<string, string> = {
    hot: "bg-hot-500/10 text-hot-500",
    cool: "bg-cool-500/10 text-cool-500",
    amber: "bg-amber-500/10 text-amber-500",
  };
  return (
    <Card className="p-6">
      <div className={`inline-flex rounded-lg p-2.5 mb-4 ${accentClasses[accent]}`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <h3 className="font-display font-semibold text-ground-50 mb-2 leading-snug">
        {title}
      </h3>
      <p className="text-ground-400 text-sm leading-relaxed">{body}</p>
    </Card>
  );
}
