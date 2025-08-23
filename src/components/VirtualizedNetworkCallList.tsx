import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { NetworkCall } from "../types";
import { detectUUIDs, copyUUIDToClipboard } from "../utils/uuid";
import { logger } from "../utils/logger";

interface VirtualizedNetworkCallListProps {
  calls: NetworkCall[];
  onCallClick?: (call: NetworkCall) => void;
  selectedCallId?: string | null;
}

const ITEM_HEIGHT = 120; // Approximate height of each network call item
const BUFFER_SIZE = 5; // Number of items to render outside visible area

const VirtualizedNetworkCallList: React.FC<VirtualizedNetworkCallListProps> = ({
  calls,
  onCallClick,
  selectedCallId,
}) => {
  const [containerHeight, setContainerHeight] = useState(400);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE,
    );
    const endIndex = Math.min(
      calls.length - 1,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE,
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, calls.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return calls.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [calls, visibleRange]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

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

  const copyAsCurl = useCallback(
    (call: NetworkCall, buttonElement: HTMLButtonElement) => {
      try {
        let curl = `curl -X ${call.method || "GET"} "${call.url || ""}"`;

        const headers = call.requestHeaders || {};

        if (Array.isArray(headers)) {
          headers.forEach((header: any) => {
            const name = header.name || header.key;
            const value = header.value;
            if (name && value) {
              curl += ` -H "${name}: ${value}"`;
            }
          });
        } else if (typeof headers === "object" && headers !== null) {
          Object.entries(headers).forEach(([key, value]) => {
            if (key && value) {
              const headerValue =
                typeof value === "object" && value !== null
                  ? (value as any).value ||
                    (value as any).name ||
                    JSON.stringify(value)
                  : String(value);
              curl += ` -H "${key}: ${headerValue}"`;
            }
          });
        }

        if (
          call.requestBody &&
          ["POST", "PUT", "PATCH"].includes(call.method || "")
        ) {
          const escapedBody = call.requestBody.replace(/'/g, "'\"'\"'");
          curl += ` -d '${escapedBody}'`;
        }

        // Copy to clipboard
        const textArea = document.createElement("textarea");
        textArea.value = curl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        let copied = false;
        try {
          copied = document.execCommand("copy");
        } catch (execError) {
          // Fallback: show in alert
          alert(`Copy this cURL command:\n\n${curl}`);
          copied = true;
        }

        document.body.removeChild(textArea);

        // Show feedback
        const originalText = buttonElement.textContent;
        buttonElement.textContent = "Copied!";
        buttonElement.style.background = "#4caf50";
        buttonElement.style.borderColor = "#4caf50";
        buttonElement.style.color = "white";

        setTimeout(() => {
          buttonElement.textContent = originalText;
          buttonElement.style.background = "white";
          buttonElement.style.borderColor = "#ddd";
          buttonElement.style.color = "#333";
        }, 2000);
      } catch (error) {
        logger.error("Error copying cURL:", error);

        const originalText = buttonElement.textContent;
        buttonElement.textContent = "Error!";
        buttonElement.style.background = "#f44336";
        buttonElement.style.borderColor = "#f44336";
        buttonElement.style.color = "white";

        setTimeout(() => {
          buttonElement.textContent = originalText;
          buttonElement.style.background = "white";
          buttonElement.style.borderColor = "#ddd";
          buttonElement.style.color = "#333";
        }, 2000);
      }
    },
    [],
  );

  const renderURLWithUUIDs = useCallback((url: string) => {
    const uuidMatches = detectUUIDs(url);

    if (uuidMatches.length === 0) {
      return <span>{url}</span>;
    }

    let lastIndex = 0;
    const parts: JSX.Element[] = [];

    uuidMatches.forEach((match, index) => {
      if (match.position > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {url.substring(lastIndex, match.position)}
          </span>,
        );
      }

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

    if (lastIndex < url.length) {
      parts.push(<span key="text-end">{url.substring(lastIndex)}</span>);
    }

    return <>{parts}</>;
  }, []);

  const totalHeight = calls.length * ITEM_HEIGHT;
  const offsetY = visibleRange.startIndex * ITEM_HEIGHT;

  return (
    <div
      className="network-call-list virtualized"
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: "100%",
        overflowY: "auto",
        position: "relative",
      }}
    >
      {calls.length === 0 ? (
        <div className="no-calls">
          <p>No network calls captured yet.</p>
          <p>Open DevTools and navigate to see network activity.</p>
        </div>
      ) : (
        <div style={{ height: totalHeight, position: "relative" }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map((call, index) => {
              const actualIndex = visibleRange.startIndex + index;
              return (
                <div
                  key={call.id}
                  className={`network-call-item ${selectedCallId === call.id ? 'selected' : ''}`}
                  onClick={() => onCallClick?.(call)}
                  style={{
                    height: ITEM_HEIGHT,
                    minHeight: ITEM_HEIGHT,
                    position: "relative",
                  }}
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualizedNetworkCallList;
