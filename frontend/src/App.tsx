import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AppStateProvider } from "./context/AppStateContext";
import { ToastProvider } from "./components/ui/Toast";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Landing } from "./pages/Landing";
import { Overview } from "./pages/Overview";
import { Dataset } from "./pages/Dataset";
import { Preprocessing } from "./pages/Preprocessing";
import { KMeans } from "./pages/KMeans";
import { DBSCAN } from "./pages/DBSCAN";
import { Compare } from "./pages/Compare";
import { Prediction } from "./pages/Prediction";
import { Insights } from "./pages/Insights";

// Plotly.js and Leaflet are both large and only needed on their
// respective pages, so they're code-split rather than bloating the
// main bundle every visitor downloads.
const EDA = lazy(() => import("./pages/EDA").then((m) => ({ default: m.EDA })));
const MapPage = lazy(() =>
  import("./pages/MapPage").then((m) => ({ default: m.MapPage }))
);

function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 rounded-full border-2 border-ground-700 border-t-cool-500 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppStateProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="dataset" element={<Dataset />} />
              <Route path="preprocessing" element={<Preprocessing />} />
              <Route
                path="eda"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <EDA />
                  </Suspense>
                }
              />
              <Route path="kmeans" element={<KMeans />} />
              <Route path="dbscan" element={<DBSCAN />} />
              <Route path="compare" element={<Compare />} />
              <Route path="predict" element={<Prediction />} />
              <Route
                path="map"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <MapPage />
                  </Suspense>
                }
              />
              <Route path="insights" element={<Insights />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppStateProvider>
    </ToastProvider>
  );
}
