import { Link } from "react-router-dom";
import {
  Play,
  ArrowRight,
  Database,
  Sparkle,
  Filter,
  Ruler,
  FileOutput,
} from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/Card";
import { EmptyState, ErrorState } from "../components/ui/States";
import { useToast } from "../components/ui/Toast";

const PIPELINE_STAGES = [
  { label: "Raw Data", icon: Database },
  { label: "Cleaning", icon: Sparkle },
  { label: "Missing Values", icon: Filter },
  { label: "Outlier Handling", icon: Sparkle },
  { label: "Feature Engineering", icon: Ruler },
  { label: "Feature Scaling", icon: Ruler },
  { label: "Processed Data", icon: FileOutput },
];

export function Preprocessing() {
  const { upload, preprocess, doPreprocess } = useAppState();
  const { showToast } = useToast();

  const handleRun = async () => {
    try {
      await doPreprocess();
      showToast("Preprocessing completed.", "success");
    } catch {
      showToast("Preprocessing failed — see details below.", "error");
    }
  };

  const hasDataset = !!upload.data || !!preprocess.data;

  return (
    <div>
      <PageHeader
        eyebrow="Step 2"
        title="Preprocessing"
        description="Runs missing-value handling, duplicate removal, outlier detection, feature engineering, and scaling on the uploaded dataset."
        action={
          <Button
            onClick={handleRun}
            loading={preprocess.loading}
            disabled={!hasDataset}
            icon={<Play size={16} />}
          >
            Run preprocessing
          </Button>
        }
      />

      {!hasDataset ? (
        <Card>
          <EmptyState
            title="No dataset to preprocess"
            description="Upload a CSV first — preprocessing runs against the most recently uploaded dataset."
            action={
              <Link to="/dashboard/dataset">
                <Button variant="secondary" size="sm">
                  Go to dataset upload
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* ---- Pipeline visualization ---- */}
          <Card className="p-6 mb-6 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage.label} className="flex items-center">
                  <div className="flex flex-col items-center gap-2 w-28">
                    <div
                      className={`rounded-full p-3 transition-colors ${
                        preprocess.data
                          ? "bg-cool-500/15 text-cool-400"
                          : "bg-ground-800 text-ground-500"
                      }`}
                    >
                      <stage.icon size={18} strokeWidth={2} />
                    </div>
                    <span
                      className={`text-xs text-center leading-tight ${
                        preprocess.data ? "text-ground-200" : "text-ground-500"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={`h-px w-8 shrink-0 ${
                        preprocess.data ? "bg-cool-500/40" : "bg-ground-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>

          {preprocess.loading && (
            <Card className="p-10 flex flex-col items-center justify-center mb-6">
              <div className="h-8 w-8 rounded-full border-2 border-ground-700 border-t-cool-500 animate-spin mb-3" />
              <p className="text-ground-400 text-sm">Running preprocessing pipeline…</p>
            </Card>
          )}

          {preprocess.error && (
            <Card className="mb-6">
              <ErrorState error={preprocess.error} onRetry={handleRun} />
            </Card>
          )}

          {preprocess.data && !preprocess.loading && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard label="Rows Before" value={preprocess.data.rows_before} accent="neutral" />
                <StatCard label="Rows After" value={preprocess.data.rows_after} accent="cool" />
                <StatCard
                  label="Duplicates Removed"
                  value={preprocess.data.duplicates_removed}
                  accent="amber"
                />
                <StatCard
                  label="Missing Handled"
                  value={preprocess.data.missing_values_handled}
                  accent="amber"
                />
                <StatCard
                  label="Outliers Removed"
                  value={preprocess.data.outliers_removed}
                  accent="hot"
                />
              </div>

              <Card className="p-6">
                <h3 className="font-display font-semibold text-ground-50 mb-3">
                  Resulting columns
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {preprocess.data.columns.map((c) => (
                    <span
                      key={c}
                      className="text-xs font-mono-data bg-ground-800 text-ground-200 px-2 py-1 rounded-md"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <Link to="/dashboard/eda">
                  <Button variant="secondary" className="mt-6" icon={<ArrowRight size={16} />}>
                    Continue to EDA
                  </Button>
                </Link>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
