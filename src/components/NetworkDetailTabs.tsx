import React, { useState } from "react";
import { NetworkCall } from "../types";
import { detectUUIDs, copyUUIDToClipboard } from "../utils/uuid";
import JsonViewer from "./JsonViewer";
import { logger } from "../utils/logger";
import { enhancedJsonSearch } from "../utils/jsonSearch";

interface NetworkDetailTabsProps {
  selectedCall: NetworkCall;
  onClose: () => void;
  searchQuery?: string;
}

type TabType =
  | "headers"
  | "payload"
  | "preview"
  | "response"
  | "initiator"
  | "timing";

const NetworkDetailTabs: React.FC<NetworkDetailTabsProps> = ({
  selectedCall,
  onClose,
  searchQuery = "",
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("headers");
  const [responseSearchQuery, setResponseSearchQuery] = useState(searchQuery);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<
    Array<{ position: number; length: number; text: string }>
  >([]);

  // Payload search state
  const [payloadSearchQuery, setPayloadSearchQuery] = useState(searchQuery);
  const [currentPayloadSearchIndex, setCurrentPayloadSearchIndex] = useState(0);
  const [payloadSearchResults, setPayloadSearchResults] = useState<
    Array<{ position: number; length: number; text: string }>
  >([]);

  // Update search queries when searchQuery prop changes
  React.useEffect(() => {
    setResponseSearchQuery(searchQuery);
    setPayloadSearchQuery(searchQuery);
  }, [searchQuery]);

  // Update search results when search query changes
  React.useEffect(() => {
    if (
      responseSearchQuery &&
      responseSearchQuery.trim() &&
      selectedCall.responseBody
    ) {
      // Use enhanced JSON search for better results with structured data
      const results = enhancedJsonSearch(
        selectedCall.responseBody,
        responseSearchQuery,
        false // case insensitive by default
      );
      
      setSearchResults(results);
      setCurrentSearchIndex(0);

      // Scroll to first result if there are results
      if (results.length > 0) {
        scrollToResult(0);
      }
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }
  }, [responseSearchQuery, selectedCall.responseBody]);

  // Update payload search results when search query changes
  React.useEffect(() => {
    if (
      payloadSearchQuery &&
      payloadSearchQuery.trim() &&
      selectedCall.requestBody
    ) {
      // Use enhanced JSON search for better results with structured data
      const results = enhancedJsonSearch(
        selectedCall.requestBody,
        payloadSearchQuery,
        false // case insensitive by default
      );
      
      setPayloadSearchResults(results);
      setCurrentPayloadSearchIndex(0);

      // Scroll to first result if there are results
      if (results.length > 0) {
        scrollToPayloadResult(0);
      }
    } else {
      setPayloadSearchResults([]);
      setCurrentPayloadSearchIndex(0);
    }
  }, [payloadSearchQuery, selectedCall.requestBody]);

  const scrollToResult = (index: number) => {
    // Use setTimeout to ensure the DOM has been updated with the new highlighting
    setTimeout(() => {
      const resultElement = document.querySelector(
        `[data-search-result-index="${index}"]`,
      ) as HTMLElement;
      if (resultElement) {
        resultElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }, 150);
  };

  const navigateToNextResult = () => {
    if (searchResults.length > 1) {
      const newIndex = (currentSearchIndex + 1) % searchResults.length;
      setCurrentSearchIndex(newIndex);
      scrollToResult(newIndex);
    }
  };

  const navigateToPrevResult = () => {
    if (searchResults.length > 1) {
      const newIndex =
        (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
      setCurrentSearchIndex(newIndex);
      scrollToResult(newIndex);
    }
  };

  // Payload search navigation functions
  const scrollToPayloadResult = (index: number) => {
    // Use setTimeout to ensure the DOM has been updated with the new highlighting
    setTimeout(() => {
      const resultElement = document.querySelector(
        `[data-payload-search-result-index="${index}"]`,
      ) as HTMLElement;
      if (resultElement) {
        resultElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }, 150);
  };

  const navigateToNextPayloadResult = () => {
    if (payloadSearchResults.length > 1) {
      const newIndex =
        (currentPayloadSearchIndex + 1) % payloadSearchResults.length;
      setCurrentPayloadSearchIndex(newIndex);
      scrollToPayloadResult(newIndex);
    }
  };

  const navigateToPrevPayloadResult = () => {
    if (payloadSearchResults.length > 1) {
      const newIndex =
        (currentPayloadSearchIndex - 1 + payloadSearchResults.length) %
        payloadSearchResults.length;
      setCurrentPayloadSearchIndex(newIndex);
      scrollToPayloadResult(newIndex);
    }
  };

  // Safety check
  if (!selectedCall) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <p>No network call selected</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  const renderTextWithHighlights = (text: string, searchText?: string) => {
    try {
      const uuidMatches = detectUUIDs(text);

      // Get search matches if search text provided
      const searchMatches: Array<{
        position: number;
        length: number;
        text: string;
        type: "search";
        matchIndex: number;
      }> = [];
      if (searchText && searchText.trim()) {
        const searchRegex = new RegExp(
          searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "gi",
        );
        let match;
        let matchIndex = 0;
        while ((match = searchRegex.exec(text)) !== null) {
          searchMatches.push({
            position: match.index,
            length: match[0].length,
            text: match[0],
            type: "search",
            matchIndex: matchIndex++,
          });
        }
      }

      // Combine and sort all matches by position
      const allMatches = [
        ...uuidMatches.map((m) => ({
          position: m.position,
          length: m.uuid.length,
          text: m.uuid,
          type: "uuid" as const,
          matchIndex: -1,
        })),
        ...searchMatches,
      ].sort((a, b) => a.position - b.position);

      if (allMatches.length === 0) return text;

      let lastIndex = 0;
      const parts: React.ReactNode[] = [];

      allMatches.forEach((match, index) => {
        // Skip overlapping matches (prioritize earlier ones)
        if (match.position < lastIndex) return;

        // Add text before match
        if (match.position > lastIndex) {
          parts.push(text.substring(lastIndex, match.position));
        }

        // Add highlighted element
        if (match.type === "uuid") {
          parts.push(
            <span
              key={`uuid-${index}`}
              className="uuid-highlight"
              onClick={() => copyUUIDToClipboard(match.text)}
              title="Click to copy UUID"
            >
              {match.text}
            </span>,
          );
        } else {
          // Check if this is the current active search result
          const isCurrentResult = match.matchIndex === currentSearchIndex;
          parts.push(
            <span
              key={`search-${index}`}
              data-search-result-index={match.matchIndex}
              style={{
                background: isCurrentResult ? "#ff6b35" : "var(--bg-accent)",
                color: isCurrentResult ? "#ffffff" : "var(--text-primary)",
                padding: "2px 4px",
                borderRadius: "3px",
                fontWeight: isCurrentResult ? "bold" : "500",
                border: isCurrentResult
                  ? "2px solid #e55a2b"
                  : "1px solid var(--border-accent)",
                boxShadow: isCurrentResult
                  ? "0 0 8px rgba(255, 107, 53, 0.6)"
                  : "none",
                outline: isCurrentResult
                  ? "2px solid rgba(255, 107, 53, 0.3)"
                  : "none",
                outlineOffset: isCurrentResult ? "1px" : "0",
              }}
              title={isCurrentResult ? "Current search result" : "Search match"}
            >
              {match.text}
            </span>,
          );
        }

        lastIndex = match.position + match.length;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts;
    } catch (error) {
      logger.error(
        "[NetworkDetailTabs] Error in renderTextWithHighlights:",
        error,
      );
      return text; // Fallback to plain text
    }
  };

  const renderUUIDs = (text: string) => {
    return renderTextWithHighlights(text);
  };

  const renderPayloadWithHighlights = (text: string, searchText?: string) => {
    try {
      const uuidMatches = detectUUIDs(text);

      // Get search matches if search text provided
      const searchMatches: Array<{
        position: number;
        length: number;
        text: string;
        type: "search";
        matchIndex: number;
      }> = [];
      if (searchText && searchText.trim()) {
        const searchRegex = new RegExp(
          searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "gi",
        );
        let match;
        let matchIndex = 0;
        while ((match = searchRegex.exec(text)) !== null) {
          searchMatches.push({
            position: match.index,
            length: match[0].length,
            text: match[0],
            type: "search",
            matchIndex: matchIndex++,
          });
        }
      }

      // Combine and sort all matches by position
      const allMatches = [
        ...uuidMatches.map((m) => ({
          position: m.position,
          length: m.uuid.length,
          text: m.uuid,
          type: "uuid" as const,
          matchIndex: -1,
        })),
        ...searchMatches,
      ].sort((a, b) => a.position - b.position);

      if (allMatches.length === 0) return text;

      let lastIndex = 0;
      const parts: React.ReactNode[] = [];

      allMatches.forEach((match, index) => {
        // Skip overlapping matches (prioritize earlier ones)
        if (match.position < lastIndex) return;

        // Add text before match
        if (match.position > lastIndex) {
          parts.push(text.substring(lastIndex, match.position));
        }

        // Add highlighted element
        if (match.type === "uuid") {
          parts.push(
            <span
              key={`uuid-${index}`}
              className="uuid-highlight"
              onClick={() => copyUUIDToClipboard(match.text)}
              title="Click to copy UUID"
            >
              {match.text}
            </span>,
          );
        } else {
          // Check if this is the current active search result
          const isCurrentResult =
            match.matchIndex === currentPayloadSearchIndex;
          parts.push(
            <span
              key={`search-${index}`}
              data-payload-search-result-index={match.matchIndex}
              style={{
                background: isCurrentResult ? "#ff6b35" : "var(--bg-accent)",
                color: isCurrentResult ? "#ffffff" : "var(--text-primary)",
                padding: "2px 4px",
                borderRadius: "3px",
                fontWeight: isCurrentResult ? "bold" : "500",
                border: isCurrentResult
                  ? "2px solid #e55a2b"
                  : "1px solid var(--border-accent)",
                boxShadow: isCurrentResult
                  ? "0 0 8px rgba(255, 107, 53, 0.6)"
                  : "none",
                outline: isCurrentResult
                  ? "2px solid rgba(255, 107, 53, 0.3)"
                  : "none",
                outlineOffset: isCurrentResult ? "1px" : "0",
              }}
              title={isCurrentResult ? "Current search result" : "Search match"}
            >
              {match.text}
            </span>,
          );
        }

        lastIndex = match.position + match.length;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts;
    } catch (error) {
      logger.error(
        "[NetworkDetailTabs] Error in renderPayloadWithHighlights:",
        error,
      );
      return text; // Fallback to plain text
    }
  };

  const renderJsonWithUUIDs = (obj: any) => {
    try {
      const jsonString = JSON.stringify(obj, null, 2);
      return <pre>{renderUUIDs(jsonString)}</pre>;
    } catch (error) {
      logger.error("[NetworkDetailTabs] Error in renderJsonWithUUIDs:", error);
      return <pre>{String(obj)}</pre>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const copyAsCurl = () => {
    let curl = `curl -X ${selectedCall.method} "${selectedCall.url}"`;

    Object.entries(selectedCall.requestHeaders).forEach(([key, value]) => {
      curl += ` -H "${key}: ${value}"`;
    });

    if (
      selectedCall.requestBody &&
      ["POST", "PUT", "PATCH"].includes(selectedCall.method)
    ) {
      curl += ` -d '${selectedCall.requestBody}'`;
    }

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
      logger.log("[NetworkDetailTabs] cURL copied using execCommand");
    } catch (execError) {
      logger.log("[NetworkDetailTabs] execCommand failed:", execError);
    }

    document.body.removeChild(textArea);

    // If execCommand failed, show the cURL in an alert as fallback
    if (!copied) {
      logger.log(
        "[NetworkDetailTabs] execCommand failed, showing cURL in alert",
      );
      alert(`Copy this cURL command:\n\n${curl}`);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "headers":
        return (
          <div className="tab-content">
            <div className="headers-section">
              <h4>Request Headers</h4>
              <div className="headers-table">
                {Object.entries(selectedCall.requestHeaders).map(
                  ([key, value]) => (
                    <div key={key} className="header-row">
                      <span className="header-name">{key}:</span>
                      <span className="header-value">{renderUUIDs(value)}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="headers-section">
              <h4>Response Headers</h4>
              <div className="headers-table">
                {Object.entries(selectedCall.responseHeaders).map(
                  ([key, value]) => (
                    <div key={key} className="header-row">
                      <span className="header-name">{key}:</span>
                      <span className="header-value">{renderUUIDs(value)}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        );

      case "payload":
        return (
          <div className="tab-content">
            {selectedCall.requestBody ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <div
                  className="response-header"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backgroundColor: "var(--bg-primary)",
                    borderBottom: "1px solid var(--border-color)",
                    padding: "12px",
                    marginBottom: "0",
                  }}
                >
                  <h4 style={{ margin: "0 0 8px 0" }}>Request Payload</h4>
                  <div className="response-search">
                    <input
                      type="text"
                      placeholder="Search in payload..."
                      value={payloadSearchQuery}
                      onChange={(e) => setPayloadSearchQuery(e.target.value)}
                      className="response-search-input"
                    />
                    {payloadSearchResults.length > 0 && (
                      <div className="search-navigation">
                        <span className="search-result-count">
                          {currentPayloadSearchIndex + 1} of{" "}
                          {payloadSearchResults.length}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigateToPrevPayloadResult();
                          }}
                          disabled={payloadSearchResults.length <= 1}
                          className="search-nav-button"
                          title="Previous result"
                          type="button"
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigateToNextPayloadResult();
                          }}
                          disabled={payloadSearchResults.length <= 1}
                          className="search-nav-button"
                          title="Next result"
                          type="button"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "8px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    backgroundColor: "var(--bg-tertiary)",
                    margin: "0 12px 12px 12px",
                  }}
                >
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedCall.requestBody);
                      return (
                        <JsonViewer
                          data={parsed}
                          searchQuery={payloadSearchQuery}
                          currentSearchIndex={currentPayloadSearchIndex}
                          searchResults={payloadSearchResults}
                          searchDataAttribute="data-payload-search-result-index"
                        />
                      );
                    } catch {
                      return (
                        <pre>
                          {renderPayloadWithHighlights(
                            selectedCall.requestBody,
                            payloadSearchQuery,
                          )}
                        </pre>
                      );
                    }
                  })()}
                </div>
              </div>
            ) : (
              <div className="empty-state">No request payload</div>
            )}
          </div>
        );

      case "preview":
        return (
          <div className="tab-content">
            {selectedCall.responseBody ? (
              <div>
                <h4>Response Preview</h4>
                <div className="response-preview">
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedCall.responseBody);
                      return renderJsonWithUUIDs(parsed);
                    } catch {
                      return (
                        <pre>{renderUUIDs(selectedCall.responseBody)}</pre>
                      );
                    }
                  })()}
                </div>
              </div>
            ) : (
              <div className="empty-state">No response preview available</div>
            )}
          </div>
        );

      case "response":
        return (
          <div className="tab-content">
            {selectedCall.responseBody ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <div
                  className="response-header"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backgroundColor: "var(--bg-primary)",
                    borderBottom: "1px solid var(--border-color)",
                    padding: "12px",
                    marginBottom: "0",
                  }}
                >
                  <h4 style={{ margin: "0 0 8px 0" }}>Response</h4>
                  <div className="response-search">
                    <input
                      type="text"
                      placeholder="Search in response..."
                      value={responseSearchQuery}
                      onChange={(e) => setResponseSearchQuery(e.target.value)}
                      className="response-search-input"
                    />
                    {searchResults.length > 0 && (
                      <div className="search-navigation">
                        <span className="search-result-count">
                          {currentSearchIndex + 1} of {searchResults.length}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigateToPrevResult();
                          }}
                          disabled={searchResults.length <= 1}
                          className="search-nav-button"
                          title="Previous result"
                          type="button"
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigateToNextResult();
                          }}
                          disabled={searchResults.length <= 1}
                          className="search-nav-button"
                          title="Next result"
                          type="button"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "8px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    backgroundColor: "var(--bg-tertiary)",
                    margin: "0 12px 12px 12px",
                  }}
                >
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedCall.responseBody);
                      return (
                        <JsonViewer
                          data={parsed}
                          searchQuery={responseSearchQuery}
                          currentSearchIndex={currentSearchIndex}
                          searchResults={searchResults}
                          searchDataAttribute="data-search-result-index"
                        />
                      );
                    } catch {
                      return (
                        <pre>
                          {renderTextWithHighlights(
                            selectedCall.responseBody,
                            responseSearchQuery,
                          )}
                        </pre>
                      );
                    }
                  })()}
                </div>
              </div>
            ) : (
              <div className="empty-state">No response body</div>
            )}
          </div>
        );

      case "initiator":
        return (
          <div className="tab-content">
            <div className="initiator-info">
              <h4>Request Information</h4>
              <div className="info-row">
                <span className="info-label">URL:</span>
                <span className="info-value">
                  {renderUUIDs(selectedCall.url)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Method:</span>
                <span className="info-value">{selectedCall.method}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status:</span>
                <span className="info-value">
                  {selectedCall.status} {selectedCall.statusText}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Timestamp:</span>
                <span className="info-value">
                  {new Date(selectedCall.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );

      case "timing":
        return (
          <div className="tab-content">
            <div className="timing-info">
              <h4>Timing Information</h4>
              <div className="info-row">
                <span className="info-label">Duration:</span>
                <span className="info-value">{selectedCall.duration}ms</span>
              </div>
              <div className="info-row">
                <span className="info-label">Started:</span>
                <span className="info-value">
                  {new Date(selectedCall.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Finished:</span>
                <span className="info-value">
                  {new Date(
                    selectedCall.timestamp + selectedCall.duration,
                  ).toLocaleString()}
                </span>
              </div>
              {selectedCall.requestBody && (
                <div className="info-row">
                  <span className="info-label">Request Size:</span>
                  <span className="info-value">
                    {formatBytes(
                      new TextEncoder().encode(selectedCall.requestBody).length,
                    )}
                  </span>
                </div>
              )}
              {selectedCall.responseBody && (
                <div className="info-row">
                  <span className="info-label">Response Size:</span>
                  <span className="info-value">
                    {formatBytes(
                      new TextEncoder().encode(selectedCall.responseBody)
                        .length,
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="network-detail-tabs">
      <div className="tabs-header">
        <div className="tabs-nav">
          <button
            className={`tab-button ${activeTab === "headers" ? "active" : ""}`}
            onClick={() => setActiveTab("headers")}
          >
            Headers
          </button>
          <button
            className={`tab-button ${activeTab === "payload" ? "active" : ""}`}
            onClick={() => setActiveTab("payload")}
          >
            Payload
          </button>
          <button
            className={`tab-button ${activeTab === "preview" ? "active" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            Preview
          </button>
          <button
            className={`tab-button ${activeTab === "response" ? "active" : ""}`}
            onClick={() => setActiveTab("response")}
          >
            Response
          </button>
          <button
            className={`tab-button ${activeTab === "initiator" ? "active" : ""}`}
            onClick={() => setActiveTab("initiator")}
          >
            Initiator
          </button>
          <button
            className={`tab-button ${activeTab === "timing" ? "active" : ""}`}
            onClick={() => setActiveTab("timing")}
          >
            Timing
          </button>
        </div>
        <div className="tabs-actions">
          <button onClick={copyAsCurl} className="action-button">
            Copy as cURL
          </button>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>
      </div>
      <div className="tabs-body">{renderTabContent()}</div>
    </div>
  );
};

export default NetworkDetailTabs;
