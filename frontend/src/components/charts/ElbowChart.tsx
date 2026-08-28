import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Dot,
} from "recharts";

interface ElbowChartProps {
  elbowScores: Record<string, number>;
  optimalK: number;
}

export function ElbowChart({ elbowScores, optimalK }: ElbowChartProps) {
  const data = Object.entries(elbowScores)
    .map(([k, inertia]) => ({ k: Number(k), inertia }))
    .sort((a, b) => a.k - b.k);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="k"
          stroke="#96a0bd"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "#33405f" }}
          label={{ value: "k (clusters)", position: "insideBottom", offset: -2, fill: "#6b7597", fontSize: 11 }}
        />
        <YAxis
          stroke="#96a0bd"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "#33405f" }}
          width={56}
          label={{ value: "Inertia", angle: -90, position: "insideLeft", fill: "#6b7597", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: "#131b2d",
            border: "1px solid #232e4a",
            borderRadius: 8,
            fontSize: 12,
            color: "#e4e8f2",
          }}
          labelFormatter={(k) => `k = ${k}`}
          formatter={(value: any) => [
            typeof value === "number" ? value.toFixed(2) : value,
            "Inertia",
          ]}
        />
        <Line
          type="monotone"
          dataKey="inertia"
          stroke="#38bdf8"
          strokeWidth={2.5}
          dot={(props) => {
            const isOptimal = props.payload.k === optimalK;
            return (
              <Dot
                key={`dot-${props.payload.k}`}
                cx={props.cx}
                cy={props.cy}
                r={isOptimal ? 6 : 3}
                fill={isOptimal ? "#fb7185" : "#38bdf8"}
                stroke={isOptimal ? "#fb7185" : "none"}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
