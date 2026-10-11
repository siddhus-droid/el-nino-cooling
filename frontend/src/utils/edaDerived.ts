import type { EDAResponse } from "../api/types";

/**
 * The backend has no dedicated "summary stats" endpoint — GET /eda returns
 * full Plotly figures instead. These helpers derive a few real numbers
 * (mean temperature, city count, etc.) directly from the trace arrays
 * those figures already contain, rather than inventing values. If the
 * expected trace shape isn't present, they return null and the UI must
 * render a "not available" state.
 */

interface PlotlyTrace {
  type?: string;
  name?: string;
  x?: number[];
  [key: string]: unknown;
}

function getTraces(eda: EDAResponse | null, chartKey: string): PlotlyTrace[] | null {
  const chart = eda?.charts?.[chartKey];
  if (!chart || !Array.isArray(chart.data)) return null;
  return chart.data as PlotlyTrace[];
}

/** Mean of the `x` array in a histogram-type chart's first trace. */
export function meanFromHistogram(
  eda: EDAResponse | null,
  chartKey: string
): number | null {
  const traces = getTraces(eda, chartKey);
  const values = traces?.[0]?.x;
  if (!values || values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

/** Distinct trace names in the city-colored scatter plot (i.e. city count). */
export function cityCountFromScatter(eda: EDAResponse | null): number | null {
  const traces = getTraces(eda, "scatter_plot");
  if (!traces) return null;
  const names = new Set(traces.map((t) => t.name).filter(Boolean));
  return names.size > 0 ? names.size : null;
}

/** Distinct trace names as a list (for display). */
export function cityNamesFromScatter(eda: EDAResponse | null): string[] | null {
  const traces = getTraces(eda, "scatter_plot");
  if (!traces) return null;
  const names = Array.from(new Set(traces.map((t) => t.name).filter(Boolean))) as string[];
  return names.length > 0 ? names : null;
}

interface HeatmapTrace {
  x?: string[];
  y?: string[];
  z?: number[][];
}

/** Pearson correlation coefficient between two named columns in the correlation_matrix chart. */
export function correlationBetween(
  eda: EDAResponse | null,
  colA: string,
  colB: string
): number | null {
  const chart = eda?.charts?.["correlation_matrix"];
  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) return null;
  const trace = chart.data[0] as HeatmapTrace;
  if (!trace.x || !trace.y || !trace.z) return null;
  const rowIdx = trace.y.indexOf(colA);
  const colIdx = trace.x.indexOf(colB);
  if (rowIdx === -1 || colIdx === -1) return null;
  return trace.z[rowIdx]?.[colIdx] ?? null;
}

/** Mean of the `y` values across every trace of a scatter chart (e.g. state electricity). */
export function meanYFromScatter(eda: EDAResponse | null, chartKey: string): number | null {
  const traces = getTraces(eda, chartKey) as Array<{ y?: number[] }> | null;
  if (!traces) return null;
  const ys = traces.flatMap((t) => (Array.isArray(t.y) ? t.y : []));
  return ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : null;
}
