import React from "react";
import { NetworkCall } from "../types";
import { logger } from "../utils/logger";

interface SimpleNetworkDetailsProps {
  selectedCall: NetworkCall;
  onClose: () => void;
}

const SimpleNetworkDetails: React.FC<SimpleNetworkDetailsProps> = ({
  selectedCall,
  onClose,
}) => {
  logger.log("[SimpleNetworkDetails] Rendering with call:", selectedCall?.id);

  // Absolutely bulletproof safety check
  if (!selectedCall) {
    logger.log("[SimpleNetworkDetails] No selectedCall, showing fallback");
    return (
      <div style={{ padding: "16px", border: "1px solid #ccc" }}>
        <p>No network call selected</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  try {
    logger.log(
      "[SimpleNetworkDetails] Rendering details for:",
      selectedCall.id,
    );

    return (
      <div
        style={{
          padding: "16px",
          border: "1px solid #e0e0e0",
          borderRadius: "6px",
          background: "#fff",
          height: "100%",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            borderBottom: "1px solid #eee",
            paddingBottom: "8px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px" }}>Network Call Details</h3>
          <button
            onClick={onClose}
            style={{
              padding: "4px 8px",
              background: "#e74c3c",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
          <div style={{ marginBottom: "12px" }}>
            <strong>ID:</strong> {selectedCall.id || "N/A"}
          </div>

          <div style={{ marginBottom: "12px" }}>
            <strong>Method:</strong> {selectedCall.method || "N/A"}
          </div>

          <div style={{ marginBottom: "12px" }}>
            <strong>Status:</strong> {selectedCall.status || "N/A"}{" "}
            {selectedCall.statusText || ""}
          </div>

          <div style={{ marginBottom: "12px" }}>
            <strong>URL:</strong>
            <div
              style={{
                wordBreak: "break-all",
                background: "#f8f9fa",
                padding: "4px",
                marginTop: "4px",
                borderRadius: "2px",
                fontSize: "12px",
              }}
            >
              {selectedCall.url || "N/A"}
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <strong>Duration:</strong> {selectedCall.duration || 0}ms
          </div>

          <div style={{ marginBottom: "12px" }}>
            <strong>Timestamp:</strong>{" "}
            {selectedCall.timestamp
              ? new Date(selectedCall.timestamp).toLocaleString()
              : "N/A"}
          </div>

          {selectedCall.error && (
            <div style={{ marginBottom: "12px" }}>
              <strong>Error:</strong>
              <div
                style={{
                  color: "#d32f2f",
                  background: "#ffebee",
                  padding: "4px",
                  marginTop: "4px",
                  borderRadius: "2px",
                  fontSize: "12px",
                }}
              >
                {selectedCall.error}
              </div>
            </div>
          )}

          <div style={{ marginTop: "20px" }}>
            <h4 style={{ marginBottom: "8px", fontSize: "14px" }}>
              Request Headers
            </h4>
            <div
              style={{
                background: "#f8f9fa",
                padding: "8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontFamily: "monospace",
                maxHeight: "150px",
                overflow: "auto",
              }}
            >
              {selectedCall.requestHeaders
                ? JSON.stringify(selectedCall.requestHeaders, null, 2)
                : "No headers"}
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <h4 style={{ marginBottom: "8px", fontSize: "14px" }}>
              Response Headers
            </h4>
            <div
              style={{
                background: "#f8f9fa",
                padding: "8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontFamily: "monospace",
                maxHeight: "150px",
                overflow: "auto",
              }}
            >
              {selectedCall.responseHeaders
                ? JSON.stringify(selectedCall.responseHeaders, null, 2)
                : "No headers"}
            </div>
          </div>

          {selectedCall.requestBody && (
            <div style={{ marginTop: "20px" }}>
              <h4 style={{ marginBottom: "8px", fontSize: "14px" }}>
                Request Body
              </h4>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  maxHeight: "150px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedCall.requestBody}
              </div>
            </div>
          )}

          {selectedCall.responseBody && (
            <div style={{ marginTop: "20px" }}>
              <h4 style={{ marginBottom: "8px", fontSize: "14px" }}>
                Response Body
              </h4>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  maxHeight: "200px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedCall.responseBody}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    logger.error("[SimpleNetworkDetails] Render error:", error);
    return (
      <div
        style={{
          padding: "16px",
          background: "#ffebee",
          border: "1px solid #f44336",
        }}
      >
        <h4 style={{ color: "#d32f2f" }}>Error displaying network details</h4>
        <p style={{ fontSize: "12px" }}>
          There was an error rendering the network call details.
        </p>
        <pre style={{ fontSize: "10px", background: "#fff", padding: "8px" }}>
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
};

export default SimpleNetworkDetails;
