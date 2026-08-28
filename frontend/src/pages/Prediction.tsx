import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Thermometer, Droplets, Zap, Users } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { RiskBadge } from "../components/ui/Badge";
import { EmptyState, ErrorState } from "../components/ui/States";
import { useToast } from "../components/ui/Toast";
import type { ModelType, PredictionResponse } from "../api/types";
import { normalizeApiError } from "../api/client";
import type { NormalizedApiError } from "../api/types";

interface FormState {
  temperature: string;
  humidity: string;
  electricity_consumption: string;
  population_density: string;
  model_type: ModelType;
}

const initialForm: FormState = {
  temperature: "",
  humidity: "",
  electricity_consumption: "",
  population_density: "",
  model_type: "kmeans",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-hot-400 text-xs mt-1.5">{message}</p>;
}

export function Prediction() {
  const { kmeans, dbscan, doPredict, predictionHistory } = useAppState();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<NormalizedApiError | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const modelAvailable = form.model_type === "kmeans" ? !!kmeans.data : !!dbscan.data;
  const anyModelTrained = !!kmeans.data || !!dbscan.data;

  const fieldError = (field: string) =>
    error?.fieldErrors?.find((f) => f.field === field)?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const temperature = parseFloat(form.temperature);
    const humidity = parseFloat(form.humidity);
    const electricity_consumption = parseFloat(form.electricity_consumption);
    const population_density = form.population_density
      ? parseFloat(form.population_density)
      : null;

    if ([temperature, humidity, electricity_consumption].some((v) => Number.isNaN(v))) {
      showToast("Please fill in all required numeric fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const data = await doPredict({
        temperature,
        humidity,
        electricity_consumption,
        population_density,
        model_type: form.model_type,
      });
      setResult(data);
      showToast("Prediction complete.", "success");
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized);
      showToast(normalized.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Step 7"
        title="Prediction"
        description="Predict the cluster, risk level, and recommendations for a new set of environmental readings."
      />

      {!anyModelTrained ? (
        <Card>
          <EmptyState
            title="No trained model available"
            description="Train K-Means or DBSCAN before making predictions."
            icon={Sparkles}
            action={
              <div className="flex gap-2">
                <Link to="/dashboard/kmeans">
                  <Button variant="secondary" size="sm">Train K-Means</Button>
                </Link>
                <Link to="/dashboard/dbscan">
                  <Button variant="secondary" size="sm">Train DBSCAN</Button>
                </Link>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          {/* ---- Form ---- */}
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ground-200 mb-1.5">
                  Model
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["kmeans", "dbscan"] as ModelType[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setForm((f) => ({ ...f, model_type: m }))}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                        form.model_type === m
                          ? "bg-cool-500/10 border-cool-500/40 text-cool-400"
                          : "bg-ground-800 border-ground-700 text-ground-300 hover:border-ground-600"
                      }`}
                    >
                      {m === "kmeans" ? "K-Means" : "DBSCAN"}
                    </button>
                  ))}
                </div>
                {!modelAvailable && (
                  <p className="text-amber-500 text-xs mt-1.5">
                    {form.model_type === "kmeans" ? "K-Means" : "DBSCAN"} hasn't
                    been trained yet — train it first from the sidebar.
                  </p>
                )}
              </div>

              <FormField
                label="Temperature"
                unit="°C"
                icon={Thermometer}
                value={form.temperature}
                onChange={(v) => setForm((f) => ({ ...f, temperature: v }))}
                placeholder="e.g. 38.5"
                error={fieldError("temperature")}
              />
              <FormField
                label="Humidity"
                unit="%"
                icon={Droplets}
                value={form.humidity}
                onChange={(v) => setForm((f) => ({ ...f, humidity: v }))}
                placeholder="0–100"
                error={fieldError("humidity")}
              />
              <FormField
                label="Electricity Consumption"
                unit="kWh"
                icon={Zap}
                value={form.electricity_consumption}
                onChange={(v) => setForm((f) => ({ ...f, electricity_consumption: v }))}
                placeholder="e.g. 420"
                error={fieldError("electricity_consumption")}
              />
              <FormField
                label="Population Density"
                unit="optional"
                icon={Users}
                value={form.population_density}
                onChange={(v) => setForm((f) => ({ ...f, population_density: v }))}
                placeholder="e.g. 15000"
                error={fieldError("population_density")}
                required={false}
              />

              <Button
                type="submit"
                className="w-full"
                loading={submitting}
                disabled={!modelAvailable}
                icon={<Sparkles size={16} />}
              >
                Predict
              </Button>

              {error && !error.fieldErrors && <ErrorState error={error} />}
            </form>
          </Card>

          {/* ---- Result ---- */}
          <div className="space-y-6">
            <Card className="p-6 min-h-[220px] flex flex-col justify-center">
              {result ? (
                <div>
                  <p className="text-ground-400 text-xs uppercase tracking-wide font-mono-data mb-2">
                    Predicted risk level
                  </p>
                  <div className="mb-4">
                    <RiskBadge level={result.risk_level} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-ground-500 text-xs mb-0.5">Cluster</p>
                      <p className="font-mono-data text-ground-100 font-semibold">
                        {result.cluster}
                      </p>
                    </div>
                    <div>
                      <p className="text-ground-500 text-xs mb-0.5">Model used</p>
                      <p className="font-mono-data text-ground-100 font-semibold capitalize">
                        {result.model_used}
                      </p>
                    </div>
                  </div>
                  <p className="text-ground-300 text-sm leading-relaxed mt-4">
                    This combination of environmental and consumption values
                    was assigned to <span className="text-ground-100 font-medium">cluster {result.cluster}</span>,
                    classified as{" "}
                    <span className="text-ground-100 font-medium">{result.cooling_demand_category}</span>.
                  </p>
                </div>
              ) : (
                <EmptyState
                  title="No prediction yet"
                  description="Fill in the form and submit to see the predicted risk level."
                  icon={Sparkles}
                />
              )}
            </Card>

            {result && result.recommendations.length > 0 && (
              <Card className="p-6">
                <h3 className="font-display font-semibold text-ground-50 mb-3">
                  Recommendations
                </h3>
                <ul className="space-y-2.5">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-ground-300">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cool-500 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {predictionHistory.length > 1 && (
        <Card className="p-6 mt-6">
          <h3 className="font-display font-semibold text-ground-50 mb-4">
            Recent predictions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ground-700 text-ground-500 text-xs uppercase tracking-wide">
                  <th className="text-left pb-2 font-medium">Model</th>
                  <th className="text-left pb-2 font-medium">Cluster</th>
                  <th className="text-left pb-2 font-medium">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {predictionHistory.slice(1).map((p, i) => (
                  <tr key={i} className="border-b border-ground-800 last:border-0">
                    <td className="py-2.5 text-ground-300 capitalize">{p.model_used}</td>
                    <td className="py-2.5 text-ground-300 font-mono-data">{p.cluster}</td>
                    <td className="py-2.5">
                      <RiskBadge level={p.risk_level} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function FormField({
  label,
  unit,
  icon: Icon,
  value,
  onChange,
  placeholder,
  error,
  required = true,
}: {
  label: string;
  unit: string;
  icon: typeof Thermometer;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-sm font-medium text-ground-200 mb-1.5">
        <span className="flex items-center gap-1.5">
          <Icon size={14} className="text-ground-500" />
          {label}
        </span>
        <span className="text-ground-500 text-xs font-normal">{unit}</span>
      </label>
      <input
        type="number"
        step="any"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-ground-800 border rounded-lg px-3.5 py-2.5 text-sm text-ground-100 placeholder:text-ground-600 focus:outline-none focus:ring-2 focus:ring-cool-500/50 transition-shadow ${
          error ? "border-hot-500/60" : "border-ground-700"
        }`}
      />
      <FieldError message={error} />
    </div>
  );
}
