import {
  type AppErrorReport,
  reportCapturedError,
  subscribeErrorReports,
} from "@core/errors/reporter";
import { subscribeI18n, t } from "@core/i18n";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
  source: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    componentStack: "",
    source: null,
  };

  private unsubscribeReports: (() => void) | null = null;
  private unsubscribeI18n: (() => void) | null = null;

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error, source: "react" };
  }

  override componentDidMount(): void {
    this.unsubscribeReports = subscribeErrorReports((report) => this.showReport(report));
    this.unsubscribeI18n = subscribeI18n(() => this.forceUpdate());
    window.addEventListener("error", this.onWindowError);
    window.addEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  override componentWillUnmount(): void {
    this.unsubscribeReports?.();
    this.unsubscribeReports = null;
    this.unsubscribeI18n?.();
    this.unsubscribeI18n = null;
    window.removeEventListener("error", this.onWindowError);
    window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[granite] Caught error in ErrorBoundary:", error, info);
    reportCapturedError(error, {
      source: "react",
      componentStack: info.componentStack ?? "",
    });
    this.setState({ componentStack: info.componentStack ?? "" });
  }

  private showReport(report: AppErrorReport): void {
    this.setState({
      hasError: true,
      error: report.error,
      componentStack: report.componentStack ?? "",
      source: report.source,
    });
  }

  private onWindowError = (event: ErrorEvent): void => {
    if (
      event.message.includes(
        "There was an error during concurrent rendering but React was able to recover",
      )
    ) {
      return;
    }
    reportCapturedError(event.error ?? event.message, { source: "window" });
  };

  private onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    reportCapturedError(event.reason, { source: "promise" });
  };

  reset = (): void => {
    this.setState({ hasError: false, error: null, componentStack: "", source: null });
  };

  reload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    const message = this.state.error?.message ?? t("errorBoundary.unknown");
    return (
      <div
        role="alert"
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--size-4-8)",
          gap: "var(--size-4-3)",
          background: "var(--background-primary)",
          color: "var(--text-normal)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-ui-large)",
            fontWeight: "var(--font-semibold)",
            color: "var(--text-error)",
          }}
        >
          {t("errorBoundary.title", { source: this.state.source ? ` (${this.state.source})` : "" })}
        </div>
        <div
          style={{
            maxWidth: 600,
            color: "var(--text-muted)",
            fontFamily: "var(--font-monospace)",
            fontSize: "var(--font-ui-small)",
            background: "var(--background-primary-alt)",
            border: "1px solid var(--background-modifier-border)",
            borderRadius: "var(--radius-m)",
            padding: "var(--size-4-3)",
            whiteSpace: "pre-wrap",
            overflow: "auto",
            maxHeight: 300,
          }}
        >
          {message}
        </div>
        {this.state.componentStack && (
          <details
            style={{
              maxWidth: 600,
              fontSize: "var(--font-ui-smaller)",
              color: "var(--text-faint)",
              fontFamily: "var(--font-monospace)",
            }}
          >
            <summary style={{ cursor: "var(--cursor)" }}>
              {t("errorBoundary.componentStack")}
            </summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                margin: 0,
                marginTop: "var(--size-4-2)",
                textAlign: "left",
              }}
            >
              {this.state.componentStack}
            </pre>
          </details>
        )}
        <div style={{ display: "flex", gap: "var(--size-4-2)" }}>
          <button type="button" className="mod-cta" onClick={this.reload}>
            {t("errorBoundary.reload")}
          </button>
          <button type="button" onClick={this.reset}>
            {t("errorBoundary.dismiss")}
          </button>
        </div>
        <div style={{ color: "var(--text-faint)", fontSize: "var(--font-ui-smaller)" }}>
          {t("errorBoundary.vaultSafe")}
        </div>
      </div>
    );
  }
}
