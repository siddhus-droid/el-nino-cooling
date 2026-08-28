import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Label shown in the fallback UI, e.g. the chart's title. */
  label?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Catches render-time exceptions in whatever it wraps (e.g. a single
 * Plotly chart choking on unexpected trace data) and shows a scoped
 * fallback instead of letting the error propagate up and unmount the
 * entire page. Without this, one bad chart would blank the whole EDA
 * page with no visible error.
 */
export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`Chart render error${this.props.label ? ` (${this.props.label})` : ""}:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4">
          <div className="rounded-full bg-hot-500/10 p-3 mb-3">
            <AlertTriangle size={18} className="text-hot-500" strokeWidth={1.75} />
          </div>
          <p className="text-ground-200 text-sm font-medium mb-1">
            {this.props.label ? `Couldn't render "${this.props.label}"` : "Couldn't render this chart"}
          </p>
          <p className="text-ground-500 text-xs max-w-xs leading-relaxed">
            {this.state.errorMessage ?? "An unexpected rendering error occurred."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
