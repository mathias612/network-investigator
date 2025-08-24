import React from "react";
import { NetworkCall } from "../types";
import { detectUUIDs, copyUUIDToClipboard } from "../utils/uuid";
import { logger } from "../utils/logger";

interface NetworkCallListProps {
  calls: NetworkCall[];
  onCallClick?: (call: NetworkCall) => void;
  selectedCallId?: string | null;
}

const NetworkCallList: React.FC<NetworkCallListProps> = ({
  calls,
  onCallClick,
  selectedCallId,
}) => {
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "#61dafb";
      case "POST":
        return "#4caf50";
      case "PUT":
        return "#ff9800";
      case "DELETE":
        return "#f44336";
      default:
        return "#9e9e9e";
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "#4caf50";
    if (status >= 300 && status < 400) return "#ff9800";
    if (status >= 400) return "#f44336";
    return "#9e9e9e";
  };

  const formatDuration = (duration: number) => {
    // Remove decimals and add commas for readability
    const roundedDuration = Math.round(duration);
    return `${roundedDuration.toLocaleString()}ms`;
  };

  const formatTimestamp = (timestamp: number) => {
    // Format with AM/PM on same line
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const copyAsCurl = (call: NetworkCall, buttonElement: HTMLButtonElement) => {
    logger.log("[NetworkCallList] copyAsCurl called with:", call);
    logger.log("[NetworkCallList] Button element:", buttonElement);

    try {
      // Start building the cURL command
      let curl = `curl -X ${call.method || "GET"} "${call.url || ""}"`;
      logger.log("[NetworkCallList] Initial cURL:", curl);

      // Handle headers - they might be in different formats
      const headers = call.requestHeaders || {};
      logger.log("[NetworkCallList] Headers data:", headers);
      logger.log("[NetworkCallList] Headers type:", typeof headers);
      logger.log("[NetworkCallList] Is headers array?", Array.isArray(headers));

      if (Array.isArray(headers)) {
        logger.log("[NetworkCallList] Processing headers as array");
        // Handle array format: [{name: 'Content-Type', value: 'application/json'}, ...]
        headers.forEach((header: any, index: number) => {
          logger.log(`[NetworkCallList] Header ${index}:`, header);
          const name = header.name || header.key;
          const value = header.value;
          if (name && value) {
            curl += ` -H "${name}: ${value}"`;
            logger.log(`[NetworkCallList] Added header: ${name}: ${value}`);
          }
        });
      } else if (typeof headers === "object" && headers !== null) {
        logger.log("[NetworkCallList] Processing headers as object");
        // Handle object format: {'Content-Type': 'application/json', ...}
        Object.entries(headers).forEach(([key, value]) => {
          logger.log(`[NetworkCallList] Header entry:`, key, value);
          if (key && value) {
            // Handle nested value objects
            const headerValue =
              typeof value === "object" && value !== null
                ? (value as any).value ||
                  (value as any).name ||
                  JSON.stringify(value)
                : String(value);
            curl += ` -H "${key}: ${headerValue}"`;
            logger.log(
              `[NetworkCallList] Added header: ${key}: ${headerValue}`,
            );
          }
        });
      }

      // Add request body for appropriate methods
      if (
        call.requestBody &&
        ["POST", "PUT", "PATCH"].includes(call.method || "")
      ) {
        logger.log("[NetworkCallList] Adding request body:", call.requestBody);
        // Escape single quotes in the request body
        const escapedBody = call.requestBody.replace(/'/g, "'\"'\"'");
        curl += ` -d '${escapedBody}'`;
      }

      logger.log("[NetworkCallList] Final cURL command:", curl);

      // Use execCommand to copy text - more reliable in extensions
      let copied = false;

      // Create a temporary textarea element
      const textArea = document.createElement("textarea");
      textArea.value = curl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        copied = document.execCommand("copy");
        logger.log("[NetworkCallList] cURL copied using execCommand");
      } catch (execError) {
        logger.log("[NetworkCallList] execCommand failed:", execError);
      }

      document.body.removeChild(textArea);

      // If execCommand failed, show the cURL in an alert as fallback
      if (!copied) {
        logger.log(
          "[NetworkCallList] execCommand failed, showing cURL in alert",
        );
        alert(`Copy this cURL command:\n\n${curl}`);
        copied = true; // Consider it "copied" since user can manually copy from alert
      }

      // Show success feedback
      const originalText = buttonElement.textContent;
      logger.log("[NetworkCallList] Original button text:", originalText);
      buttonElement.textContent = "Copied!";
      buttonElement.style.background = "#4caf50";
      buttonElement.style.borderColor = "#4caf50";
      buttonElement.style.color = "white";
      logger.log("[NetworkCallList] Button feedback applied");

      // Reset button after 2 seconds
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.style.background = "white";
        buttonElement.style.borderColor = "#ddd";
        buttonElement.style.color = "#333";
        logger.log("[NetworkCallList] Button reset to original state");
      }, 2000);
    } catch (error) {
      logger.error("[NetworkCallList] Error in copyAsCurl:", error);

      // Show error feedback
      const originalText = buttonElement.textContent;
      buttonElement.textContent = "Error!";
      buttonElement.style.background = "#f44336";
      buttonElement.style.borderColor = "#f44336";
      buttonElement.style.color = "white";
      logger.log("[NetworkCallList] Error feedback applied");

      // Reset button after 2 seconds
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.style.background = "white";
        buttonElement.style.borderColor = "#ddd";
        buttonElement.style.color = "#333";
        logger.log("[NetworkCallList] Button reset after error");
      }, 2000);
    }
  };

  const renderURLWithUUIDs = (url: string) => {
    const uuidMatches = detectUUIDs(url);

    if (uuidMatches.length === 0) {
      return (
        <span title={url} className="truncated-url">
          {url}
        </span>
      );
    }

    let lastIndex = 0;
    const parts: JSX.Element[] = [];

    uuidMatches.forEach((match, index) => {
      // Add text before UUID
      if (match.position > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {url.substring(lastIndex, match.position)}
          </span>,
        );
      }

      // Add clickable UUID
      parts.push(
        <span
          key={`uuid-${index}`}
          className="uuid-highlight"
          onClick={(e) => {
            e.stopPropagation();
            copyUUIDToClipboard(match.uuid);
          }}
          title="Click to copy UUID"
        >
          {match.uuid}
        </span>,
      );

      lastIndex = match.position + match.uuid.length;
    });

    // Add remaining text
    if (lastIndex < url.length) {
      parts.push(<span key="text-end">{url.substring(lastIndex)}</span>);
    }

    return (
      <span title={url} className="truncated-url">
        {parts}
      </span>
    );
  };

  return (
    <div className="network-call-list">
      {calls.length === 0 ? (
        <div className="no-calls">
          <p>No network calls captured yet.</p>
          <p>Open DevTools and navigate to see network activity.</p>
        </div>
      ) : (
        calls.map((call) => (
          <div
            key={call.id}
            className={`network-call-item ${selectedCallId === call.id ? 'selected' : ''}`}
            onClick={() => onCallClick?.(call)}
          >
            {/* First row: Method, Status, Duration, Time, Copy cURL */}
            <div className="call-header">
              <div className="call-info-left">
                <span
                  className="method-badge"
                  style={{ backgroundColor: getMethodColor(call.method) }}
                >
                  {call.method}
                </span>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(call.status) }}
                >
                  {call.status}
                </span>
                <span className="duration">
                  {formatDuration(call.duration)}
                </span>
                <span className="timestamp">
                  {formatTimestamp(call.timestamp)}
                </span>
              </div>
              <button
                className="copy-curl-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  copyAsCurl(call, e.currentTarget);
                }}
                title="Copy as cURL"
                style={{
                  padding: "4px 8px",
                  border: "1px solid #ddd",
                  borderRadius: "3px",
                  background: "white",
                  color: "#333",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f0f0";
                  e.currentTarget.style.borderColor = "#bbb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.borderColor = "#ddd";
                }}
              >
                Copy cURL
              </button>
            </div>

            {/* Second row: URL with full width and wrapping */}
            <div className="call-url">{renderURLWithUUIDs(call.url)}</div>
          </div>
        ))
      )}
    </div>
  );
};

export default NetworkCallList;
