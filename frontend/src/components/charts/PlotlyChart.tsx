import Plot from "react-plotly.js";
import type { PlotlyFigure } from "../../api/types";

/**
 * Renders a Plotly figure JSON exactly as returned by GET /eda, only
 * re-skinning colors/fonts to match the dashboard's dark theme. Trace
 * data itself is never modified — only presentation-layer layout
 * properties are merged in.
 */
export function PlotlyChart({
  figure,
  height = 320,
}: {
  figure: PlotlyFigure;
  height?: number;
}) {
  if (!figure || !Array.isArray(figure.data) || figure.data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-ground-500 text-sm"
        style={{ height: `${height}px` }}
      >
        No data available for this chart.
      </div>
    );
  }

  const sourceLayout = figure.layout ?? {};
  // The backend's default Plotly layout includes a large `template` object
  // (Plotly's built-in light theme: colorways, axis colors, default
  // paper/plot backgrounds, etc). We fully re-theme the chart for dark
  // mode below, so the template is dropped entirely rather than spread —
  // keeping it around only risks its light-theme defaults leaking through
  // wherever our override doesn't cover every nested property.
  const { template: _template, ...restLayout } = sourceLayout as Record<string, unknown>;

  const rawTitle = (restLayout as any).title;
  const rawXaxis = (restLayout as any).xaxis as Record<string, unknown> | undefined;
  const rawYaxis = (restLayout as any).yaxis as Record<string, unknown> | undefined;
  const rawXaxis2 = (restLayout as any).xaxis2 as Record<string, unknown> | undefined;
  const rawYaxis2 = (restLayout as any).yaxis2 as Record<string, unknown> | undefined;
  const rawLegend = (restLayout as any).legend as Record<string, unknown> | undefined;
  const rawMargin = (restLayout as any).margin as Record<string, unknown> | undefined;

  const darkLayout: Record<string, unknown> = {
    ...restLayout,
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: {
      color: "#c3cadf",
      family: "Inter, ui-sans-serif, system-ui, sans-serif",
      size: 12,
    },
    ...(rawTitle
      ? {
          title: {
            ...(typeof rawTitle === "object" ? rawTitle : { text: rawTitle }),
            font: { color: "#e4e8f2", size: 14, family: "Space Grotesk, sans-serif" },
          },
        }
      : {}),
    xaxis: {
      ...rawXaxis,
      gridcolor: "#232e4a",
      zerolinecolor: "#33405f",
      linecolor: "#33405f",
      color: "#96a0bd",
    },
    yaxis: {
      ...rawYaxis,
      gridcolor: "#232e4a",
      zerolinecolor: "#33405f",
      linecolor: "#33405f",
      color: "#96a0bd",
    },
    ...(rawXaxis2
      ? { xaxis2: { ...rawXaxis2, gridcolor: "#232e4a", color: "#96a0bd" } }
      : {}),
    ...(rawYaxis2
      ? { yaxis2: { ...rawYaxis2, gridcolor: "#232e4a", color: "#96a0bd" } }
      : {}),
    margin: { l: 48, r: 24, t: 40, b: 40, ...rawMargin },
    legend: {
      font: { color: "#c3cadf", size: 11 },
      bgcolor: "transparent",
      ...rawLegend,
    },
    autosize: true,
    height,
  };

  return (
    <Plot
      data={figure.data as any}
      layout={darkLayout as any}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: `${height}px` }}
      useResizeHandler
    />
  );
}
