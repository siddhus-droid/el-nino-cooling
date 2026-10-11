import type { ClusterRecordItem } from "../api/types";

export interface CityGroup {
  city: string;
  latitude: number;
  longitude: number;
  records: ClusterRecordItem[];
  count: number;
  avgTemperature: number;
  /** Null when the loaded dataset has no such column (e.g. Humidity is not in the ClimaCool data). */
  avgHumidity: number | null;
  avgElectricityConsumption: number | null;
  /** State-level electricity (ClimaCool dataset) - NOT city-level. */
  avgStateElectricityConsumption: number | null;
  avgOniIndex: number | null;
  state: string | null;
  dominantEnsoPhase: string | null;
  /** Most common K-Means cluster among this city's records, if trained. */
  dominantKmeansCluster: number | null;
  dominantKmeansRisk: string | null;
  /** Most common DBSCAN cluster among this city's records, if trained. */
  dominantDbscanCluster: number | null;
  dominantDbscanRisk: string | null;
}

function mode<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  let best: T = values[0];
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      bestCount = c;
      best = v;
    }
  }
  return best;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Mean of a field over only the records that actually have it; null if none do. */
function meanOf(
  records: ClusterRecordItem[],
  pick: (r: ClusterRecordItem) => number | null | undefined
): number | null {
  const vals = records.map(pick).filter((v): v is number => typeof v === "number");
  return vals.length > 0 ? mean(vals) : null;
}

/**
 * Groups per-record data by city for map display: one marker per city,
 * positioned at the mean of that city's actual coordinates (identical in
 * practice unless a dataset has slightly varying lat/lon per record for
 * the same city), with averaged readings and the most common cluster
 * assignment. Every number here is computed directly from real backend
 * records — nothing is invented.
 */
export function groupRecordsByCity(records: ClusterRecordItem[]): CityGroup[] {
  const byCity = new Map<string, ClusterRecordItem[]>();
  for (const r of records) {
    const list = byCity.get(r.city) ?? [];
    list.push(r);
    byCity.set(r.city, list);
  }

  const groups: CityGroup[] = [];
  for (const [city, cityRecords] of byCity.entries()) {
    const kmeansClusters = cityRecords
      .map((r) => r.kmeans_cluster)
      .filter((c): c is number => c !== null && c !== undefined);
    const dbscanClusters = cityRecords
      .map((r) => r.dbscan_cluster)
      .filter((c): c is number => c !== null && c !== undefined);

    const dominantKmeansCluster = mode(kmeansClusters);
    const dominantDbscanCluster = mode(dbscanClusters);

    const dominantKmeansRisk =
      dominantKmeansCluster !== null
        ? cityRecords.find((r) => r.kmeans_cluster === dominantKmeansCluster)
            ?.kmeans_risk_level ?? null
        : null;
    const dominantDbscanRisk =
      dominantDbscanCluster !== null
        ? cityRecords.find((r) => r.dbscan_cluster === dominantDbscanCluster)
            ?.dbscan_risk_level ?? null
        : null;

    groups.push({
      city,
      latitude: mean(cityRecords.map((r) => r.latitude)),
      longitude: mean(cityRecords.map((r) => r.longitude)),
      records: cityRecords,
      count: cityRecords.length,
      avgTemperature: mean(cityRecords.map((r) => r.temperature)),
      avgHumidity: meanOf(cityRecords, (r) => r.humidity),
      avgElectricityConsumption: meanOf(cityRecords, (r) => r.electricity_consumption),
      avgStateElectricityConsumption: meanOf(cityRecords, (r) => r.state_electricity_consumption),
      avgOniIndex: meanOf(cityRecords, (r) => r.oni_index),
      state: cityRecords.find((r) => r.state)?.state ?? null,
      dominantEnsoPhase: mode(
        cityRecords.map((r) => r.enso_phase).filter((v): v is string => !!v)
      ),
      dominantKmeansCluster,
      dominantKmeansRisk,
      dominantDbscanCluster,
      dominantDbscanRisk,
    });
  }

  return groups.sort((a, b) => a.city.localeCompare(b.city));
}
