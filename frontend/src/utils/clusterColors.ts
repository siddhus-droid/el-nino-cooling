/** Shared color palette so cluster N looks the same color everywhere in the app. */
export const CLUSTER_PALETTE = [
  "#38bdf8",
  "#f59e0b",
  "#fb7185",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#60a5fa",
];

export const NOISE_COLOR = "#4a5578";

export function colorForCluster(clusterId: number): string {
  if (clusterId === -1) return NOISE_COLOR;
  return CLUSTER_PALETTE[clusterId % CLUSTER_PALETTE.length];
}
