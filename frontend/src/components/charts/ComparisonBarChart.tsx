import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClusterMetrics } from "../../api/types";

export function ComparisonBarChart({
  kmeans,
  dbscan,
}: {
  kmeans: ClusterMetrics;
  dbscan: ClusterMetrics;
}) {
  const data = [
    {
      metric: "Silhouette",
      KMeans: kmeans.silhouette_score,
      DBSCAN: dbscan.silhouette_score,
    },
    {
      metric: "Davies–Bouldin",
      KMeans: kmeans.davies_bouldin_index,
      DBSCAN: dbscan.davies_bouldin_index,
    },
  ].filter((d) => d.KMeans !== null || d.DBSCAN !== null);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#232e4a" vertical={false} />
        <XAxis
          dataKey="metric"
          stroke="#96a0bd"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "#33405f" }}
        />
        <YAxis stroke="#96a0bd" fontSize={12} tickLine={false} axisLine={{ stroke: "#33405f" }} width={44} />
        <Tooltip
          contentStyle={{
            background: "#131b2d",
            border: "1px solid #232e4a",
            borderRadius: 8,
            fontSize: 12,
            color: "#e4e8f2",
          }}
          formatter={(value: any) => (typeof value === "number" ? value.toFixed(3) : value)}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#c3cadf" }} />
        <Bar dataKey="KMeans" fill="#38bdf8" radius={[6, 6, 0, 0]} />
        <Bar dataKey="DBSCAN" fill="#fb7185" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
