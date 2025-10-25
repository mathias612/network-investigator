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
import CopyDropdown from "./CopyDropdown";

interface VirtualizedNetworkCallListProps {
  calls: NetworkCall[];
  onCallClick?: (call: NetworkCall) => void;
  selectedCallId?: string | null;
}

const ITEM_HEIGHT = 24; // Single row table height
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


  const renderURLWithUUIDs = useCallback((url: string) => {
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

    return (
      <span title={url} className="truncated-url">
        {parts}
      </span>
    );
  }, []);

  const totalHeight = calls.length * ITEM_HEIGHT;
  const offsetY = visibleRange.startIndex * ITEM_HEIGHT;

  return (
    <div className="network-call-list virtualized" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {calls.length === 0 ? (
        <div className="no-calls">
          <p>No network calls captured yet.</p>
          <p>Open DevTools and navigate to see network activity.</p>
        </div>
      ) : (
        <>
          {/* Fixed Header - Never Scrolls */}
          <div className="fixed-header" style={{ flexShrink: 0, zIndex: 10 }}>
            <div className="table-header-row">
              <div className="table-cell method">Method</div>
              <div className="table-cell status">Status</div>
              <div className="table-cell url">URL</div>
              <div className="table-cell actions">Actions</div>
              <div className="table-cell duration">Duration</div>
              <div className="table-cell time">Time</div>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflowY: "auto",
              position: "relative",
            }}
          >
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
                      className={`table-row ${selectedCallId === call.id ? 'selected' : ''}`}
                      onClick={() => onCallClick?.(call)}
                      style={{
                        height: ITEM_HEIGHT,
                        minHeight: ITEM_HEIGHT,
                        display: "flex",
                        alignItems: "center",
                        borderBottom: "1px solid var(--border-light)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div className="table-cell method">
                        <span
                          className="method-badge"
                          style={{ backgroundColor: getMethodColor(call.method) }}
                        >
                          {call.method}
                        </span>
                      </div>
                      <div className="table-cell status">
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(call.status) }}
                        >
                          {call.status}
                        </span>
                      </div>
                      <div className="table-cell url" title={call.url}>
                        {renderURLWithUUIDs(call.url)}
                      </div>
                      <div className="table-cell actions">
                        <CopyDropdown
                          call={call}
                          allCalls={calls}
                        />
                      </div>
                      <div className="table-cell duration">
                        {formatDuration(call.duration)}
                      </div>
                      <div className="table-cell time" title={formatTimestamp(call.timestamp)}>
                        {formatTimestamp(call.timestamp)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VirtualizedNetworkCallList;
