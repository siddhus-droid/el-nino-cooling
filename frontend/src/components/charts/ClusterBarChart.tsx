import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorForCluster } from "../../utils/clusterColors";

interface ClusterBarChartProps {
  clusterCounts: Record<string, number>;
  /** Highlight noise cluster (-1) distinctly, e.g. for DBSCAN. */
  noiseKey?: string;
}

export function ClusterBarChart({ clusterCounts, noiseKey = "-1" }: ClusterBarChartProps) {
  const data = Object.entries(clusterCounts)
    .map(([cluster, count]) => ({ cluster, count }))
    .sort((a, b) => {
      if (a.cluster === noiseKey) return 1;
      if (b.cluster === noiseKey) return -1;
      return Number(a.cluster) - Number(b.cluster);
    });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="cluster"
          stroke="#96a0bd"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "#33405f" }}
          tickFormatter={(v) => (v === noiseKey ? "Noise" : `Cluster ${v}`)}
        />
        <YAxis
          stroke="#96a0bd"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "#33405f" }}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "#131b2d",
            border: "1px solid #232e4a",
            borderRadius: 8,
            fontSize: 12,
            color: "#e4e8f2",
          }}
          labelFormatter={(v) => (v === noiseKey ? "Noise points" : `Cluster ${v}`)}
          formatter={(value: any) => [value, "Records"]}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.cluster}
              fill={entry.cluster === noiseKey ? "#4a5578" : colorForCluster(Number(entry.cluster))}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
