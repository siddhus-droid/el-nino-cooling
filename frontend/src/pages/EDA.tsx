import { useEffect } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ArrowRight, BarChart3 } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ChartSkeleton } from "../components/ui/States";
import { EmptyState, ErrorState } from "../components/ui/States";
import { PlotlyChart } from "../components/charts/PlotlyChart";
import { ChartErrorBoundary } from "../components/ui/ChartErrorBoundary";
import { useToast } from "../components/ui/Toast";

const CHART_TITLES: Record<string, string> = {
  correlation_matrix: "Correlation Matrix",
  temperature_distribution: "Temperature Distribution",
  humidity_distribution: "Humidity Distribution",
  energy_distribution: "Electricity Consumption Distribution",
  scatter_plot: "Temperature vs. Electricity Consumption",
  humidity_scatter_plot: "Humidity vs. Electricity Consumption",
  monthly_trend: "Monthly Trend",
  yearly_trend: "Yearly Trend",
  box_plot: "Box Plot — Key Features",
};

export function EDA() {
  const { preprocess, upload, eda, doEDA } = useAppState();
  const { showToast } = useToast();
  const hasDataset = !!preprocess.data || !!upload.data;

  useEffect(() => {
    if (hasDataset && !eda.data && !eda.loading && !eda.error) {
      doEDA().catch(() => {
        /* handled via eda.error below */
      });
    }
    // Re-run whenever the underlying dataset actually changes (a fresh
    // upload/preprocess produces a new object reference and resets
    // eda.data to null), not just when the derived "is a dataset present"
    // boolean flips — that boolean can stay `true` across a re-upload,
    // which previously left this effect never re-firing and the page
    // rendering nothing after re-uploading while already on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preprocess.data, upload.data, eda.data, eda.loading, eda.error]);

  const handleRefresh = async () => {
    try {
      await doEDA();
      showToast("EDA charts refreshed.", "success");
    } catch {
      showToast("Failed to load EDA charts.", "error");
    }
  };

  const chartEntries = eda.data ? Object.entries(eda.data.charts) : [];

  return (
    <div>
      <PageHeader
        eyebrow="Step 3"
        title="Exploratory Data Analysis"
        description="Distributions, correlations, and trends generated directly from the current dataset."
        action={
          hasDataset && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              loading={eda.loading}
              icon={<RefreshCw size={14} />}
            >
              Refresh charts
            </Button>
          )
        }
      />

      {!hasDataset ? (
        <Card>
          <EmptyState
            title="No dataset available"
            description="Upload (and ideally preprocess) a dataset before running EDA."
            action={
              <Link to="/dashboard/dataset">
                <Button variant="secondary" size="sm">
                  Go to dataset upload
                </Button>
              </Link>
            }
          />
        </Card>
      ) : eda.loading && !eda.data ? (
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      ) : eda.error ? (
        <Card>
          <ErrorState error={eda.error} onRetry={handleRefresh} />
        </Card>
      ) : chartEntries.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {chartEntries.map(([key, figure]) => (
            <Card key={key} className="p-5">
              <h3 className="font-display font-semibold text-ground-50 text-sm mb-2">
                {CHART_TITLES[key] ?? key}
              </h3>
              <ChartErrorBoundary label={CHART_TITLES[key] ?? key}>
                <PlotlyChart figure={figure} height={300} />
              </ChartErrorBoundary>
            </Card>
          ))}
        </div>
      ) : eda.data ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No charts returned"
            description="The backend responded successfully but returned no charts for this dataset."
            action={
              <Button variant="secondary" size="sm" onClick={handleRefresh}>
                Retry
              </Button>
            }
          />
        </Card>
      ) : null}

      {chartEntries.length > 0 && (
        <div className="mt-6">
          <Link to="/dashboard/kmeans">
            <Button variant="secondary" icon={<ArrowRight size={16} />}>
              Continue to K-Means
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
