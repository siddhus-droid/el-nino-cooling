import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  SlidersHorizontal,
  BarChart3,
  CircleDot,
  Waypoints,
  GitCompareArrows,
  Sparkles,
  Lightbulb,
  MapPin,
  Thermometer,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/dataset", label: "Dataset", icon: Database },
  { to: "/dashboard/preprocessing", label: "Preprocessing", icon: SlidersHorizontal },
  { to: "/dashboard/eda", label: "EDA", icon: BarChart3 },
  { to: "/dashboard/kmeans", label: "K-Means", icon: CircleDot },
  { to: "/dashboard/dbscan", label: "DBSCAN", icon: Waypoints },
  { to: "/dashboard/compare", label: "Model Comparison", icon: GitCompareArrows },
  { to: "/dashboard/predict", label: "Prediction", icon: Sparkles },
  { to: "/dashboard/map", label: "Geo View", icon: MapPin },
  { to: "/dashboard/insights", label: "Insights", icon: Lightbulb },
];

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 bg-ground-900 border-r border-ground-800 z-40
        flex flex-col transition-transform duration-200 ease-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-ground-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-gradient-to-br from-cool-500 to-hot-500 p-1.5">
              <Thermometer size={16} className="text-ground-950" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold text-ground-50 text-sm leading-tight">
              El Niño Cooling
              <br />
              <span className="text-ground-400 font-normal text-xs">Impact Dashboard</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-ground-400 hover:text-ground-100"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-cool-500/10 text-cool-400"
                    : "text-ground-300 hover:bg-ground-800 hover:text-ground-100"
                }`
              }
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-ground-800 shrink-0">
          <p className="text-ground-500 text-xs leading-relaxed">
            TY AI-DS · PBL Project 48
            <br />
            Urban Cooling · Clustering Engine
          </p>
        </div>
      </aside>
    </>
  );
}
