import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  Thermometer,
  Droplets,
  Zap,
  MapPin,
  CircleDot,
  Waypoints,
  Target,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCard } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import {
  cityCountFromScatter,
  meanFromHistogram,
} from "../utils/edaDerived";

export function Overview() {
  const { upload, preprocess, eda, kmeans, dbscan, compare, doEDA, rehydrating } =
    useAppState();

  // Once preprocessing has happened, silently pull EDA in the background so
  // the summary cards below can derive real averages/city-count from it.
  useEffect(() => {
    if (preprocess.data && !eda.data && !eda.loading) {
      doEDA().catch(() => {
        /* EDA card below will just show "—" for derived stats */
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preprocess.data]);

  const rows = preprocess.data?.rows_after ?? upload.data?.rows ?? null;
  const cities = cityCountFromScatter(eda.data);
  const avgTemp = meanFromHistogram(eda.data, "temperature_distribution");
  const avgHumidity = meanFromHistogram(eda.data, "humidity_distribution");
  const avgElectricity = meanFromHistogram(eda.data, "energy_distribution");

  const steps = [
    { label: "Dataset uploaded", done: !!upload.data || !!preprocess.data },
    { label: "Preprocessing complete", done: !!preprocess.data },
    { label: "K-Means trained", done: !!kmeans.data },
    { label: "DBSCAN trained", done: !!dbscan.data },
    { label: "Models compared", done: !!compare.data },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="Overview"
        description="A live snapshot of the current dataset, preprocessing results, and trained clustering models."
      />

      {!rehydrating && !upload.data && !preprocess.data && (
        <div className="card-surface rounded-xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-ground-50 mb-1">
              No dataset loaded yet
            </h3>
            <p className="text-ground-400 text-sm">
              Upload a CSV to start the pipeline — preprocessing, EDA, and
              clustering all build on it.
            </p>
          </div>
          <Link to="/dashboard/dataset">
            <Button icon={<ArrowRight size={16} />}>Upload dataset</Button>
          </Link>
        </div>
      )}

      {/* ---- Summary cards ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Dataset Rows" value={rows} icon={Database} accent="neutral" />
        <StatCard label="Cities" value={cities} icon={MapPin} accent="cool" />
        <StatCard
          label="Avg. Temperature"
          value={avgTemp !== null ? avgTemp.toFixed(1) : null}
          suffix="°C"
          icon={Thermometer}
          accent="hot"
        />
        <StatCard
          label="Avg. Humidity"
          value={avgHumidity !== null ? avgHumidity.toFixed(1) : null}
          suffix="%"
          icon={Droplets}
          accent="cool"
        />
        <StatCard
          label="Avg. Electricity"
          value={avgElectricity !== null ? avgElectricity.toFixed(0) : null}
          suffix="kWh"
          icon={Zap}
          accent="amber"
        />
        <StatCard
          label="Optimal K"
          value={kmeans.data?.optimal_k ?? null}
          icon={CircleDot}
          accent="cool"
        />
        <StatCard
          label="K-Means Silhouette"
          value={
            kmeans.data?.silhouette_score !== undefined && kmeans.data?.silhouette_score !== null
              ? kmeans.data.silhouette_score.toFixed(3)
              : null
          }
          icon={Target}
          accent="cool"
        />
        <StatCard
          label="DBSCAN Silhouette"
          value={
            dbscan.data?.silhouette_score !== undefined && dbscan.data?.silhouette_score !== null
              ? dbscan.data.silhouette_score.toFixed(3)
              : null
          }
          icon={Waypoints}
          accent="hot"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* ---- Pipeline progress ---- */}
        <div className="card-surface rounded-xl p-6">
          <h3 className="font-display font-semibold text-ground-50 mb-4">
            Pipeline progress
          </h3>
          <ul className="space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                {s.done ? (
                  <CheckCircle2 size={18} className="text-cool-500 shrink-0" />
                ) : (
                  <Circle size={18} className="text-ground-600 shrink-0" />
                )}
                <span className={`text-sm ${s.done ? "text-ground-100" : "text-ground-500"}`}>
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ---- Recommended model ---- */}
        <div className="card-surface rounded-xl p-6">
          <h3 className="font-display font-semibold text-ground-50 mb-4">
            Recommended model
          </h3>
          {compare.data ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-display font-semibold text-cool-400 capitalize">
                  {compare.data.recommended_model}
                </span>
              </div>
              <p className="text-ground-400 text-sm leading-relaxed">
                {compare.data.reasoning}
              </p>
              <Link to="/dashboard/compare">
                <Button variant="ghost" size="sm" className="mt-4" icon={<ArrowRight size={14} />}>
                  View full comparison
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-ground-400 text-sm mb-4">
                Train both K-Means and DBSCAN, then run the comparison to see
                which model fits this dataset best.
              </p>
              <Link to="/dashboard/compare">
                <Button variant="secondary" size="sm">
                  Go to comparison
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
