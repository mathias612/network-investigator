import React from "react";
import { logger } from "../utils/logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    logger.error("[ErrorBoundary] Caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("[ErrorBoundary] Component error:", error);
    logger.error("[ErrorBoundary] Error info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: "16px",
            background: "#ffebee",
            border: "1px solid #f44336",
            borderRadius: "4px",
            margin: "8px",
          }}
        >
          <h4 style={{ color: "#d32f2f", marginBottom: "8px" }}>
            Something went wrong
          </h4>
          <p style={{ fontSize: "12px", marginBottom: "8px" }}>
            An error occurred while rendering this component.
          </p>
          {this.state.error && (
            <details style={{ fontSize: "11px" }}>
              <summary>Error details</summary>
              <pre
                style={{
                  background: "#fff",
                  padding: "8px",
                  borderRadius: "2px",
                  marginTop: "8px",
                  overflow: "auto",
                }}
              >
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              marginTop: "8px",
              padding: "4px 8px",
              background: "#2196f3",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
