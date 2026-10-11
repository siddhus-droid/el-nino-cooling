import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  ArrowRight,
  X,
} from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/States";
import { useToast } from "../components/ui/Toast";
import { CLIMACOOL_DATASET_META, ONI_EXPLANATION, isClimacool } from "../utils/enso";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function Dataset() {
  const { upload, doUpload } = useAppState();
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showToast("Only .csv files are supported.", "error");
      return;
    }
    setSelectedFile(file);
  }, [showToast]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleUpload = async () => {
    if (!selectedFile) return;
    setProgress(0);
    try {
      await doUpload(selectedFile, setProgress);
      showToast(`"${selectedFile.name}" uploaded and validated.`, "success");
    } catch {
      showToast("Upload failed — see details below.", "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Step 1"
        title="Dataset"
        description="Upload a CSV in either supported schema: the ClimaCool real dataset (Date, City, Latitude, Longitude, Temperature, State_Electricity_Consumption, ONI_Index …) or the legacy schema (… Temperature, Humidity, Electricity_Consumption)."
      />

      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
        <Card className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-cool-500 bg-cool-500/5"
                : "border-ground-700 hover:border-ground-600"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <div className="rounded-full bg-ground-800 p-4 mb-4">
              <UploadCloud size={24} className="text-cool-500" />
            </div>
            <p className="text-ground-100 font-medium mb-1">
              Drag & drop your CSV here
            </p>
            <p className="text-ground-500 text-sm">or click to browse files</p>
          </div>

          {selectedFile && (
            <div className="mt-4 flex items-center justify-between gap-3 bg-ground-800 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={18} className="text-ground-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-ground-100 font-medium truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-ground-500">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-ground-500 hover:text-ground-100 shrink-0"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {upload.loading && (
            <div className="mt-4">
              <div className="h-1.5 bg-ground-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cool-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-ground-500 mt-1.5">Uploading… {progress}%</p>
            </div>
          )}

          <Button
            className="mt-5 w-full"
            disabled={!selectedFile}
            loading={upload.loading}
            onClick={handleUpload}
            icon={<UploadCloud size={16} />}
          >
            Upload dataset
          </Button>

          {upload.error && (
            <div className="mt-4">
              <ErrorState error={upload.error} onRetry={handleUpload} />
            </div>
          )}
        </Card>

        {/* ---- Result / requirements panel ---- */}
        <Card className="p-6">
          {upload.data ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={20} className="text-cool-500" />
                <h3 className="font-display font-semibold text-ground-50">
                  Upload validated
                </h3>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ground-400">Filename</dt>
                  <dd className="text-ground-100 font-mono-data truncate max-w-[60%]">
                    {upload.data.filename}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ground-400">Rows</dt>
                  <dd className="text-ground-100 font-mono-data">{upload.data.rows}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ground-400">Detected schema</dt>
                  <dd className="text-ground-100 text-right max-w-[60%]">{upload.data.dataset_profile_display}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ground-400 shrink-0">Clustering features</dt>
                  <dd className="text-ground-100 font-mono-data text-right text-xs">{upload.data.clustering_features.join(", ")}</dd>
                </div>
              </dl>
              {isClimacool(upload.data.dataset_profile) && (
                <div className="mt-4 rounded-lg bg-ground-800/60 p-3 text-xs text-ground-300 space-y-1">
                  <p><span className="text-ground-500">Dataset: </span>{CLIMACOOL_DATASET_META.name}</p>
                  <p><span className="text-ground-500">Cities: </span>{CLIMACOOL_DATASET_META.cities}</p>
                  <p><span className="text-ground-500">Period: </span>{CLIMACOOL_DATASET_META.period}</p>
                  <p><span className="text-ground-500">Data type: </span>{CLIMACOOL_DATASET_META.dataType}</p>
                  <p><span className="text-ground-500">ENSO source: </span>{CLIMACOOL_DATASET_META.ensoSource}</p>
                  <p className="text-amber-500 font-medium">{CLIMACOOL_DATASET_META.note}</p>
                  <p className="pt-1 text-ground-400">{ONI_EXPLANATION}</p>
                </div>
              )}
              <div className="mt-4">
                <p className="text-ground-400 text-xs uppercase tracking-wide mb-2">
                  Detected columns
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {upload.data.columns.map((c) => (
                    <span
                      key={c}
                      className="text-xs font-mono-data bg-ground-800 text-ground-200 px-2 py-1 rounded-md"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <Link to="/dashboard/preprocessing">
                <Button variant="secondary" className="mt-6 w-full" icon={<ArrowRight size={16} />}>
                  Continue to preprocessing
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <h3 className="font-display font-semibold text-ground-50 mb-4">
                Required columns
              </h3>
              <ul className="space-y-2 text-sm">
                {[
                  "Date",
                  "City",
                  "Latitude",
                  "Longitude",
                  "Temperature",
                  "State_Electricity_Consumption",
                  "ONI_Index",
                ].map((c) => (
                  <li key={c} className="flex items-center gap-2 text-ground-300">
                    <span className="h-1 w-1 rounded-full bg-ground-500 shrink-0" />
                    <span className="font-mono-data">{c}</span>
                  </li>
                ))}
              </ul>
              <p className="text-ground-500 text-xs mt-4 leading-relaxed">
                Column names are matched case- and spacing-insensitively by
                the backend. Optional: State, Population, Min_Temperature,
                Max_Temperature, ENSO_Phase. The legacy schema (Humidity +
                Electricity_Consumption instead of State_Electricity_Consumption +
                ONI_Index) is also accepted. Electricity data is state-level.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
