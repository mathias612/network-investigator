import React from "react";
import { NetworkCall } from "../types";
import { detectUUIDs, copyUUIDToClipboard } from "../utils/uuid";
import { logger } from "../utils/logger";
import CopyDropdown from "./CopyDropdown";

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
        <table className="network-call-table">
          <thead className="table-header">
            <tr>
              <th className="table-cell method">Method</th>
              <th className="table-cell status">Status</th>
              <th className="table-cell url">URL</th>
              <th className="table-cell actions">Actions</th>
              <th className="table-cell duration">Duration</th>
              <th className="table-cell time">Time</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr
                key={call.id}
                className={`table-row ${selectedCallId === call.id ? 'selected' : ''}`}
                onClick={() => onCallClick?.(call)}
              >
                <td className="table-cell method">
                  <span
                    className="method-badge"
                    style={{ backgroundColor: getMethodColor(call.method) }}
                  >
                    {call.method}
                  </span>
                </td>
                <td className="table-cell status">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(call.status) }}
                  >
                    {call.status}
                  </span>
                </td>
                <td className="table-cell url" title={call.url}>
                  {renderURLWithUUIDs(call.url)}
                </td>
                <td className="table-cell actions">
                  <CopyDropdown
                    call={call}
                    allCalls={calls}
                  />
                </td>
                <td className="table-cell duration">
                  {formatDuration(call.duration)}
                </td>
                <td className="table-cell time" title={formatTimestamp(call.timestamp)}>
                  {formatTimestamp(call.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default NetworkCallList;
