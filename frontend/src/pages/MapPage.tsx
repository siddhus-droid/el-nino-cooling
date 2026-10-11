import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { MapPin, Thermometer, Droplets, Zap, Layers, Waves } from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { RiskBadge } from "../components/ui/Badge";
import { EmptyState, ErrorState, ChartSkeleton } from "../components/ui/States";
import { groupRecordsByCity, type CityGroup } from "../utils/cityGroups";
import { colorForCluster } from "../utils/clusterColors";
import type { ModelType } from "../api/types";

/** Fits the map viewport to the given points once, when they first arrive. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 10);
      return;
    }
    map.fitBounds(points, { padding: [40, 40], maxZoom: 11 });
  }, [map, points]);
  return null;
}

export function MapPage() {
  const { preprocess, upload, clusterRecords, doLoadClusterRecords } = useAppState();
  const hasDataset = !!preprocess.data || !!upload.data;
  const [activeModel, setActiveModel] = useState<ModelType>("kmeans");

  useEffect(() => {
    if (hasDataset && !clusterRecords.data && !clusterRecords.loading && !clusterRecords.error) {
      doLoadClusterRecords().catch(() => {
        /* handled via clusterRecords.error below */
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDataset, clusterRecords.data, clusterRecords.loading, clusterRecords.error]);

  // If DBSCAN isn't trained but was selected (e.g. after a fresh upload
  // reset training state), fall back to K-Means rather than showing an
  // empty toggle.
  useEffect(() => {
    if (activeModel === "dbscan" && !clusterRecords.data?.dbscan_trained) {
      setActiveModel("kmeans");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterRecords.data?.dbscan_trained]);

  const cityGroups = useMemo(
    () => (clusterRecords.data ? groupRecordsByCity(clusterRecords.data.records) : []),
    [clusterRecords.data]
  );

  const points: [number, number][] = cityGroups.map((g) => [g.latitude, g.longitude]);

  const handleRetry = async () => {
    try {
      await doLoadClusterRecords();
    } catch {
      /* error state renders from context */
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Geo View"
        title="Geo Visualization"
        description="City-level map of cluster and risk assignments, built from actual uploaded coordinates and trained model output."
        action={
          clusterRecords.data && (
            <div className="flex items-center gap-1 bg-ground-800 rounded-lg p-1">
              <button
                onClick={() => setActiveModel("kmeans")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeModel === "kmeans"
                    ? "bg-cool-500/15 text-cool-400"
                    : "text-ground-400 hover:text-ground-200"
                }`}
              >
                K-Means
              </button>
              <button
                onClick={() => setActiveModel("dbscan")}
                disabled={!clusterRecords.data.dbscan_trained}
                title={
                  !clusterRecords.data.dbscan_trained
                    ? "Train DBSCAN to enable this view"
                    : undefined
                }
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeModel === "dbscan"
                    ? "bg-hot-500/15 text-hot-400"
                    : "text-ground-400 hover:text-ground-200"
                }`}
              >
                DBSCAN
              </button>
            </div>
          )
        }
      />

      {!hasDataset ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title="No dataset available"
            description="Upload and preprocess a dataset before viewing the map."
            action={
              <Link to="/dashboard/dataset">
                <Button variant="secondary" size="sm">
                  Go to dataset upload
                </Button>
              </Link>
            }
          />
        </Card>
      ) : clusterRecords.loading && !clusterRecords.data ? (
        <ChartSkeleton />
      ) : clusterRecords.error ? (
        <Card>
          <ErrorState error={clusterRecords.error} onRetry={handleRetry} />
        </Card>
      ) : !clusterRecords.data || cityGroups.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title="No geographic data yet"
            description="Upload and preprocess a dataset to see city markers here."
          />
        </Card>
      ) : !clusterRecords.data.kmeans_trained && !clusterRecords.data.dbscan_trained ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="Train K-Means and DBSCAN first to view cluster assignments."
            description="The map will show city markers colored by cluster once at least one model has been trained."
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
        <>
          {activeModel === "kmeans" && !clusterRecords.data.dbscan_trained && (
            <div className="mb-4 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3.5 py-2.5">
              Showing K-Means clusters only — DBSCAN hasn't been trained yet.
            </div>
          )}

          <Card className="p-3 mb-6 overflow-hidden">
            <div className="rounded-lg overflow-hidden" style={{ height: 480 }}>
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: "100%", width: "100%", background: "#0f1524" }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds points={points} />
                {cityGroups.map((group) => (
                  <CityMarker key={group.city} group={group} activeModel={activeModel} />
                ))}
              </MapContainer>
            </div>
          </Card>

          <ClusterLegend cityGroups={cityGroups} activeModel={activeModel} />
        </>
      )}
    </div>
  );
}

function CityMarker({
  group,
  activeModel,
}: {
  group: CityGroup;
  activeModel: ModelType;
}) {
  const cluster =
    activeModel === "kmeans" ? group.dominantKmeansCluster : group.dominantDbscanCluster;
  const risk =
    activeModel === "kmeans" ? group.dominantKmeansRisk : group.dominantDbscanRisk;
  const color = cluster !== null ? colorForCluster(cluster) : "#6b7597";

  return (
    <CircleMarker
      center={[group.latitude, group.longitude]}
      radius={10}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.65,
        weight: 2,
      }}
    >
      <Popup>
        <div className="min-w-[200px] font-sans">
          <p className="font-semibold text-sm mb-2">{group.city}</p>

          {risk && (
            <div className="mb-2">
              <RiskBadge level={risk} />
            </div>
          )}

          <dl className="space-y-1 text-xs">
            <Row icon={Thermometer} label="Avg. Temperature" value={`${group.avgTemperature.toFixed(1)} °C`} />
            {group.state && <Row icon={MapPin} label="State" value={group.state} />}
            {group.avgHumidity !== null && (
              <Row icon={Droplets} label="Avg. Humidity" value={`${group.avgHumidity.toFixed(1)} %`} />
            )}
            {group.avgElectricityConsumption !== null && (
              <Row icon={Zap} label="Avg. Electricity" value={`${group.avgElectricityConsumption.toFixed(0)} kWh`} />
            )}
            {group.avgStateElectricityConsumption !== null && (
              <Row icon={Zap} label="Avg. State Electricity Consumption" value={group.avgStateElectricityConsumption.toFixed(0)} />
            )}
            {group.avgOniIndex !== null && (
              <Row icon={Waves} label="Avg. ONI Index" value={group.avgOniIndex.toFixed(2)} />
            )}
            {group.dominantEnsoPhase && (
              <Row icon={Waves} label="ENSO phase" value={group.dominantEnsoPhase} />
            )}
          </dl>

          <div className="mt-2 pt-2 border-t border-gray-200 space-y-0.5 text-xs">
            <p>
              <span className="text-gray-500">K-Means cluster: </span>
              <span className="font-medium">
                {group.dominantKmeansCluster !== null ? group.dominantKmeansCluster : "not trained"}
              </span>
            </p>
            <p>
              <span className="text-gray-500">DBSCAN cluster: </span>
              <span className="font-medium">
                {group.dominantDbscanCluster !== null
                  ? group.dominantDbscanCluster === -1
                    ? "noise"
                    : group.dominantDbscanCluster
                  : "not trained"}
              </span>
            </p>
            <p className="text-gray-500">
              Based on {group.count} record{group.count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1 text-gray-500">
        <Icon size={11} />
        {label}
      </span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ClusterLegend({
  cityGroups,
  activeModel,
}: {
  cityGroups: CityGroup[];
  activeModel: ModelType;
}) {
  const clusters = new Set<number>();
  cityGroups.forEach((g) => {
    const c = activeModel === "kmeans" ? g.dominantKmeansCluster : g.dominantDbscanCluster;
    if (c !== null) clusters.add(c);
  });
  const sorted = Array.from(clusters).sort((a, b) => a - b);

  if (sorted.length === 0) return null;

  return (
    <Card className="p-4">
      <p className="text-ground-400 text-xs uppercase tracking-wide font-mono-data mb-3">
        Cluster legend — {activeModel === "kmeans" ? "K-Means" : "DBSCAN"}
      </p>
      <div className="flex flex-wrap gap-3">
        {sorted.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: colorForCluster(c) }}
            />
            <span className="text-sm text-ground-300">
              {c === -1 ? "Noise" : `Cluster ${c}`}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
