import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Thermometer, Droplets, Zap, Users, ScatterChart, Waves, MapPin } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { RiskBadge } from "../components/ui/Badge";
import { EmptyState, ErrorState } from "../components/ui/States";
import { useToast } from "../components/ui/Toast";
import { ONI_EXPLANATION, isClimacool } from "../utils/enso";
import { EnsoBadge } from "../components/ui/Badge";
import type { ModelType, PredictionResponse } from "../api/types";
import { normalizeApiError } from "../api/client";
import type { NormalizedApiError } from "../api/types";

interface FormState {
  temperature: string;
  humidity: string;
  electricity_consumption: string;
  state_electricity_consumption: string;
  oni_index: string;
  population_density: string;
  // Optional context - displayed/sent for reference, never used as clustering features
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  model_type: ModelType;
}

const initialForm: FormState = {
  temperature: "",
  humidity: "",
  electricity_consumption: "",
  state_electricity_consumption: "",
  oni_index: "",
  population_density: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
  model_type: "kmeans",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-hot-400 text-xs mt-1.5">{message}</p>;
}

export function Prediction() {
  const { kmeans, dbscan, doPredict, predictionHistory, upload, preprocess } = useAppState();
  const profile =
    preprocess.data?.dataset_profile ??
    upload.data?.dataset_profile ??
    kmeans.data?.dataset_profile ??
    dbscan.data?.dataset_profile;
  const climacool = isClimacool(profile);
  // ClimaCool: the same input is also run through the other trained model
  // so K-Means and DBSCAN results are shown side by side.
  const [otherResult, setOtherResult] = useState<PredictionResponse | null>(null);
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
    const state_electricity_consumption = parseFloat(form.state_electricity_consumption);
    const oni_index = parseFloat(form.oni_index);
    const population_density = form.population_density
      ? parseFloat(form.population_density)
      : null;
    const optNum = (v: string) => (v.trim() !== "" && !Number.isNaN(parseFloat(v)) ? parseFloat(v) : null);

    const required = climacool
      ? [temperature, state_electricity_consumption, oni_index]
      : [temperature, humidity, electricity_consumption];
    if (required.some((v) => Number.isNaN(v))) {
      showToast("Please fill in all required numeric fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = climacool
        ? {
            temperature,
            state_electricity_consumption,
            oni_index,
            city: form.city || null,
            state: form.state || null,
            latitude: optNum(form.latitude),
            longitude: optNum(form.longitude),
          }
        : { temperature, humidity, electricity_consumption, population_density };
      const data = await doPredict({ ...payload, model_type: form.model_type });
      setResult(data);
      setOtherResult(null);
      if (climacool) {
        const other: ModelType = form.model_type === "kmeans" ? "dbscan" : "kmeans";
        if (other === "kmeans" ? kmeans.data : dbscan.data) {
          setOtherResult(await doPredict({ ...payload, model_type: other }));
        }
      }
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
              {climacool ? (
                <>
                  <FormField
                    label="State Electricity Consumption"
                    unit="state-level"
                    icon={Zap}
                    value={form.state_electricity_consumption}
                    onChange={(v) => setForm((f) => ({ ...f, state_electricity_consumption: v }))}
                    placeholder="e.g. 2500"
                    error={fieldError("state_electricity_consumption")}
                  />
                  <FormField
                    label="ONI Index"
                    unit="NOAA"
                    icon={Waves}
                    value={form.oni_index}
                    onChange={(v) => setForm((f) => ({ ...f, oni_index: v }))}
                    placeholder="e.g. 0.8 (negative = cooler)"
                    error={fieldError("oni_index")}
                  />
                  <p className="text-ground-500 text-xs leading-relaxed">{ONI_EXPLANATION}</p>
                  <p className="text-ground-500 text-xs pt-1 flex items-center gap-1.5">
                    <MapPin size={12} /> Optional context (not used as clustering features)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["city", "state", "latitude", "longitude"] as const).map((k) => (
                      <input
                        key={k}
                        type={k === "city" || k === "state" ? "text" : "number"}
                        step="any"
                        value={form[k]}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        placeholder={k[0].toUpperCase() + k.slice(1)}
                        className="w-full bg-ground-800 border border-ground-700 rounded-lg px-3 py-2 text-sm text-ground-100 placeholder:text-ground-600 focus:outline-none focus:ring-2 focus:ring-cool-500/50"
                      />
                    ))}
                  </div>
                </>
              ) : (
              <>
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
              </>
              )}

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
              {result?.is_noise ? (
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="rounded-full bg-ground-700 p-2">
                      <ScatterChart size={16} className="text-ground-300" />
                    </div>
                    <p className="text-ground-400 text-xs uppercase tracking-wide font-mono-data">
                      DBSCAN result
                    </p>
                  </div>
                  <div className="mb-4">
                    <RiskBadge level={result.risk_level} />
                  </div>
                  <div className="mb-4">
                    <p className="text-ground-500 text-xs mb-0.5">Cluster</p>
                    <p className="font-mono-data text-ground-100 font-semibold">
                      {result.cluster} <span className="text-ground-500 font-normal">(noise)</span>
                    </p>
                  </div>
                  <p className="text-ground-300 text-sm leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              ) : result ? (
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

            {result && climacool && (
              <Card className="p-6">
                <h3 className="font-display font-semibold text-ground-50 mb-3">
                  K-Means vs DBSCAN for this input
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  {[result, otherResult]
                    .filter((r): r is PredictionResponse => !!r)
                    .sort((a, b) => a.model_used.localeCompare(b.model_used) * -1)
                    .map((r) => (
                      <div key={r.model_used} className="rounded-lg bg-ground-800/60 p-3">
                        <p className="text-ground-500 text-xs uppercase tracking-wide mb-1">
                          {r.model_used === "kmeans" ? "K-Means" : "DBSCAN"}
                        </p>
                        <p className="font-mono-data text-ground-100 mb-1.5">
                          Cluster {r.cluster}
                          {r.is_noise && <span className="text-ground-500"> (noise)</span>}
                        </p>
                        <RiskBadge level={r.risk_level} />
                        {r.is_noise && (
                          <p className="text-ground-400 text-xs mt-2">Noise / outlier — not in a learned dense cluster.</p>
                        )}
                      </div>
                    ))}
                </div>
                {!otherResult && (
                  <p className="text-ground-500 text-xs mt-3">
                    Train the other model to see both results side by side.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-ground-400">ONI: <span className="font-mono-data text-ground-100">{result.oni_index ?? "—"}</span></span>
                  {result.enso_phase && <EnsoBadge phase={result.enso_phase} />}
                </div>
                <p className="text-ground-500 text-xs mt-3 leading-relaxed">
                  {result.explanation ?? "Risk level is derived from the cluster's mean temperature and state-level electricity consumption. ENSO phase is based on the supplied ONI classification; this is an association in the data, not proof that El Niño caused the result."}
                </p>
              </Card>
            )}

            {result && !result.is_noise && result.recommendations.length > 0 && (
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

            {result?.is_noise && (
              <Card className="p-6 bg-ground-800/50 border-ground-700">
                <h3 className="font-display font-semibold text-ground-50 mb-2 flex items-center gap-2">
                  <ScatterChart size={16} className="text-ground-400" />
                  Why K-Means and DBSCAN can disagree
                </h3>
                <p className="text-ground-400 text-sm leading-relaxed">
                  K-Means always assigns every input to its nearest cluster, so
                  it always returns a risk level. DBSCAN instead checks whether
                  an input sits in a sufficiently dense region of the training
                  data — if it doesn't, DBSCAN reports it as noise (cluster{" "}
                  <span className="font-mono-data">-1</span>) rather than
                  forcing it into a cluster it doesn't really belong to. That's
                  expected, correct behavior for these two algorithms, not a
                  bug — the two models are answering different questions.
                </p>
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
                    <td className="py-2.5 text-ground-300 font-mono-data">
                      {p.cluster}
                      {p.is_noise && <span className="text-ground-500"> (noise)</span>}
                    </td>
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
