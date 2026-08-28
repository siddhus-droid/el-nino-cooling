import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/dataset": "Dataset",
  "/dashboard/preprocessing": "Preprocessing",
  "/dashboard/eda": "Exploratory Data Analysis",
  "/dashboard/kmeans": "K-Means Clustering",
  "/dashboard/dbscan": "DBSCAN Clustering",
  "/dashboard/compare": "Model Comparison",
  "/dashboard/predict": "Prediction",
  "/dashboard/map": "Geo View",
  "/dashboard/insights": "Insights",
};

type BackendStatus = "checking" | "online" | "offline";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const title = TITLES[location.pathname] ?? "Dashboard";
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        await apiClient.get("/health", { timeout: 5000 });
        if (!cancelled) setStatus("online");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }
    check();
    const interval = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 bg-ground-900/90 backdrop-blur border-b border-ground-800 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-ground-300 hover:text-ground-100"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-display font-semibold text-ground-50 text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === "online"
              ? "bg-cool-500 shadow-[0_0_6px_#38bdf8]"
              : status === "offline"
              ? "bg-hot-500"
              : "bg-ground-500 animate-pulse"
          }`}
        />
        <span className="text-xs text-ground-400 font-mono-data hidden sm:inline">
          {status === "online"
            ? "Backend online"
            : status === "offline"
            ? "Backend unreachable"
            : "Checking backend…"}
        </span>
      </div>
    </header>
  );
}
