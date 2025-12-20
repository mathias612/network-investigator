import React, { useState } from "react";
import { NetworkCall } from "../types";
import { detectUUIDs, copyUUIDToClipboard } from "../utils/uuid";
import JsonViewer from "./JsonViewer";
import { logger } from "../utils/logger";
import { enhancedJsonSearch } from "../utils/jsonSearch";
import SimpleCopyButton from "./SimpleCopyButton";

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

  // Headers search state
  const [headersSearchQuery, setHeadersSearchQuery] = useState(searchQuery);
  const [currentHeadersSearchIndex, setCurrentHeadersSearchIndex] = useState(0);
  const [headersSearchResults, setHeadersSearchResults] = useState<
    Array<{ position: number; length: number; text: string }>
  >([]);


  // JSON expand/collapse state
  const [jsonExpandAll, setJsonExpandAll] = useState(false);
  const [jsonCollapseAll, setJsonCollapseAll] = useState(false);

  // Copy button feedback state
  const [isCopied, setIsCopied] = useState(false);
  const [copySuccess, setCopySuccess] = useState<boolean | null>(null);

  // Handle expand all JSON
  const handleExpandAll = () => {
    setJsonExpandAll(true);
    setJsonCollapseAll(false);
    // Reset after a short delay to allow the JsonViewer to process
    setTimeout(() => setJsonExpandAll(false), 100);
  };

  // Handle collapse all JSON
  const handleCollapseAll = () => {
    setJsonCollapseAll(true);
    setJsonExpandAll(false);
    // Reset after a short delay to allow the JsonViewer to process
    setTimeout(() => setJsonCollapseAll(false), 100);
  };

  // Get content to copy based on active tab with proper formatting
  const getContentToCopy = () => {
    switch (activeTab) {
      case "headers":
        return JSON.stringify(selectedCall.responseHeaders, null, 2);
      case "payload":
        // Try to format as JSON if it's valid JSON, otherwise return as-is
        try {
          const parsed = JSON.parse(selectedCall.requestBody || "");
          return JSON.stringify(parsed, null, 2);
        } catch {
          return selectedCall.requestBody || "";
        }
      case "response":
        // Try to format as JSON if it's valid JSON, otherwise return as-is
        try {
          const parsed = JSON.parse(selectedCall.responseBody || "");
          return JSON.stringify(parsed, null, 2);
        } catch {
          return selectedCall.responseBody || "";
        }
      case "preview":
        // Try to format as JSON if it's valid JSON, otherwise return as-is
        try {
          const parsed = JSON.parse(selectedCall.responseBody || "");
          return JSON.stringify(parsed, null, 2);
        } catch {
          return selectedCall.responseBody || "";
        }
      case "initiator":
        return (selectedCall as any).stackTrace || "";
      case "timing":
        return JSON.stringify({
          duration: selectedCall.duration,
          timestamp: selectedCall.timestamp,
          startTime: (selectedCall as any).startTime,
          endTime: (selectedCall as any).endTime
        }, null, 2);
      default:
        return selectedCall.url;
    }
  };

  // Handle copy button click - copy tab content
  const handleCopy = async () => {
    try {
      const content = getContentToCopy();
      const { copyToClipboard } = await import("../utils/clipboardUtils");
      const success = await copyToClipboard(content);
      
      if (success) {
        setIsCopied(true);
        setCopySuccess(true);
        setTimeout(() => {
          setIsCopied(false);
          setCopySuccess(null);
        }, 2000); // Reset after 2 seconds
        console.log("Content copied successfully");
      } else {
        setIsCopied(true);
        setCopySuccess(false);
        setTimeout(() => {
          setIsCopied(false);
          setCopySuccess(null);
        }, 1000);
        console.error("Failed to copy content");
      }
    } catch (error) {
      setIsCopied(true);
      setCopySuccess(false);
      setTimeout(() => {
        setIsCopied(false);
        setCopySuccess(null);
      }, 1000);
      console.error("Failed to copy content:", error);
    }
  };

  // Update search queries when searchQuery prop changes
  React.useEffect(() => {
    setResponseSearchQuery(searchQuery);
    setPayloadSearchQuery(searchQuery);
    setHeadersSearchQuery(searchQuery); // Also update headers search query
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

  // Update headers search results when search query changes
  React.useEffect(() => {
    if (
      headersSearchQuery &&
      headersSearchQuery.trim()
    ) {
      // Combine General section data, request headers, and response headers into a single string for search
      const generalData = [
        selectedCall.url,
        selectedCall.method,
        selectedCall.status.toString(),
        selectedCall.statusText
      ].join(" ");
      
      const requestHeadersData = Object.entries(selectedCall.requestHeaders)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" ");
      
      const responseHeadersData = Object.entries(selectedCall.responseHeaders)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" ");
      
      const allHeadersData = `${generalData} ${requestHeadersData} ${responseHeadersData}`;
      
      const results = enhancedJsonSearch(
        allHeadersData,
        headersSearchQuery,
        false // case insensitive by default
      );
      
      setHeadersSearchResults(results);
      setCurrentHeadersSearchIndex(0);

      // Scroll to first result if there are results
      if (results.length > 0) {
        scrollToHeadersResult(0);
      }
    } else {
      setHeadersSearchResults([]);
      setCurrentHeadersSearchIndex(0);
    }
  }, [headersSearchQuery, selectedCall]);

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


  // Headers search navigation functions
  const scrollToHeadersResult = (index: number) => {
    // Use setTimeout to ensure the DOM has been updated with the new highlighting
    setTimeout(() => {
      const resultElement = document.querySelector(
        `[data-headers-search-result-index="${index}"]`,
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

  const navigateToNextHeadersResult = () => {
    if (headersSearchResults.length > 1) {
      const newIndex =
        (currentHeadersSearchIndex + 1) % headersSearchResults.length;
      setCurrentHeadersSearchIndex(newIndex);
      scrollToHeadersResult(newIndex);
    }
  };

  const navigateToPrevHeadersResult = () => {
    if (headersSearchResults.length > 1) {
      const newIndex =
        (currentHeadersSearchIndex - 1 + headersSearchResults.length) %
        headersSearchResults.length;
      setCurrentHeadersSearchIndex(newIndex);
      scrollToHeadersResult(newIndex);
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


  const renderTabContent = () => {
    switch (activeTab) {
      case "headers":
        return (
          <div className="tab-content">
            <div
              className="response-header"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                backgroundColor: "var(--bg-primary)",
                borderBottom: "1px solid var(--border-color)",
                padding: "12px",
                marginBottom: "16px",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0" }}>Headers</h4>
            </div>
                          <div className="headers-section">
                <h4>General</h4>
                <div className="headers-table">
                  <div className="header-row">
                    <span className="header-name">Request URL:</span>
                    <span className="header-value">{renderUUIDs(selectedCall.url)}</span>
                  </div>
                  <div className="header-row">
                    <span className="header-name">Request Method:</span>
                    <span className="header-value">{selectedCall.method}</span>
                  </div>
                  <div className="header-row">
                    <span className="header-name">Status Code:</span>
                    <span className="header-value">
                      <span className="status-indicator" style={{ 
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: selectedCall.status >= 200 && selectedCall.status < 300 ? '#4caf50' : 
                                     selectedCall.status >= 300 && selectedCall.status < 400 ? '#ff9800' : 
                                     selectedCall.status >= 400 ? '#f44336' : '#9e9e9e',
                        marginRight: '8px'
                      }}></span>
                      {selectedCall.status} {selectedCall.statusText}
                    </span>
                  </div>
                  <div className="header-row">
                    <span className="header-name">Remote Address:</span>
                    <span className="header-value">N/A</span>
                  </div>
                  <div className="header-row">
                    <span className="header-name">Referrer Policy:</span>
                    <span className="header-value">N/A</span>
                  </div>
                </div>
              </div>
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
                  flex: 1,
                  padding: "8px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  backgroundColor: "var(--bg-tertiary)",
                  margin: "0 0 12px 0",
                  width: "100%",
                  boxSizing: "border-box",
                  overflow: "visible",
                  marginRight: "0",
                  paddingRight: "8px",
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
                        onExpandAll={handleExpandAll}
                        onCollapseAll={handleCollapseAll}
                        jsonExpandAll={jsonExpandAll}
                        jsonCollapseAll={jsonCollapseAll}
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
            ) : (
              <div className="empty-state">
                {selectedCall.requestBody === undefined ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="loading-spinner" style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid var(--border-color)',
                      borderTop: '2px solid var(--accent-blue)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Loading request payload...
                  </div>
                ) : (
                  "No request payload"
                )}
              </div>
            )}
          </div>
        );

      case "preview":
        return (
          <div className="tab-content">
            {selectedCall.responseBody ? (
              <div>
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
                  flex: 1,
                  padding: "8px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  backgroundColor: "var(--bg-tertiary)",
                  margin: "0 0 12px 0",
                  width: "100%",
                  boxSizing: "border-box",
                  overflow: "visible",
                  marginRight: "0",
                  paddingRight: "8px",
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
                        onExpandAll={handleExpandAll}
                        onCollapseAll={handleCollapseAll}
                        jsonExpandAll={jsonExpandAll}
                        jsonCollapseAll={jsonCollapseAll}
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
            ) : (
              <div className="empty-state">
                {selectedCall.responseBody === undefined ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="loading-spinner" style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid var(--border-color)',
                      borderTop: '2px solid var(--accent-blue)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Loading response body...
                  </div>
                ) : (
                  "No response body"
                )}
              </div>
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
          <div className="search-container">
            {activeTab === "headers" && (
              <>
                <input
                  type="text"
                  placeholder="Search in headers..."
                  value={headersSearchQuery}
                  onChange={(e) => setHeadersSearchQuery(e.target.value)}
                  className="unified-search-input"
                />
                {headersSearchResults.length > 0 && (
                  <div className="search-navigation">
                    <button
                      onClick={() => {
                        const newIndex = (currentHeadersSearchIndex - 1 + headersSearchResults.length) % headersSearchResults.length;
                        setCurrentHeadersSearchIndex(newIndex);
                        scrollToHeadersResult(newIndex);
                      }}
                      className="search-nav-button"
                      title="Previous result"
                    >
                      ↑
                    </button>
                    <span className="search-results-count">
                      {currentHeadersSearchIndex + 1}/{headersSearchResults.length}
                    </span>
                    <button
                      onClick={() => {
                        const newIndex = (currentHeadersSearchIndex + 1) % headersSearchResults.length;
                        setCurrentHeadersSearchIndex(newIndex);
                        scrollToHeadersResult(newIndex);
                      }}
                      className="search-nav-button"
                      title="Next result"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </>
            )}
            {activeTab === "payload" && (
              <>
                <input
                  type="text"
                  placeholder="Search in payload..."
                  value={payloadSearchQuery}
                  onChange={(e) => setPayloadSearchQuery(e.target.value)}
                  className="unified-search-input"
                />
                {payloadSearchResults.length > 0 && (
                  <div className="search-navigation">
                    <button
                      onClick={() => {
                        const newIndex = (currentPayloadSearchIndex - 1 + payloadSearchResults.length) % payloadSearchResults.length;
                        setCurrentPayloadSearchIndex(newIndex);
                        scrollToPayloadResult(newIndex);
                      }}
                      className="search-nav-button"
                      title="Previous result"
                    >
                      ↑
                    </button>
                    <span className="search-results-count">
                      {currentPayloadSearchIndex + 1}/{payloadSearchResults.length}
                    </span>
                    <button
                      onClick={() => {
                        const newIndex = (currentPayloadSearchIndex + 1) % payloadSearchResults.length;
                        setCurrentPayloadSearchIndex(newIndex);
                        scrollToPayloadResult(newIndex);
                      }}
                      className="search-nav-button"
                      title="Next result"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </>
            )}
            {(activeTab === "response" || activeTab === "preview") && (
              <>
                <input
                  type="text"
                  placeholder="Search in response..."
                  value={responseSearchQuery}
                  onChange={(e) => setResponseSearchQuery(e.target.value)}
                  className="unified-search-input"
                />
                {searchResults.length > 0 && (
                  <div className="search-navigation">
                    <button
                      onClick={() => {
                        const newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
                        setCurrentSearchIndex(newIndex);
                        scrollToResult(newIndex);
                      }}
                      className="search-nav-button"
                      title="Previous result"
                    >
                      ↑
                    </button>
                    <span className="search-results-count">
                      {currentSearchIndex + 1}/{searchResults.length}
                    </span>
                    <button
                      onClick={() => {
                        const newIndex = (currentSearchIndex + 1) % searchResults.length;
                        setCurrentSearchIndex(newIndex);
                        scrollToResult(newIndex);
                      }}
                      className="search-nav-button"
                      title="Next result"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="copy-content-button"
            title={isCopied ? (copySuccess ? "Copied!" : "Failed to copy") : `Copy ${activeTab} content`}
            style={{
              background: isCopied
                ? copySuccess
                  ? "#4caf50"
                  : "#e74c3c"
                : undefined,
              color: isCopied ? "white" : undefined,
            }}
          >
            {isCopied ? (
              copySuccess ? "✓ Copied!" : "✗ Failed"
            ) : (
              "Copy"
            )}
          </button>
          {(activeTab === "response" || activeTab === "payload") && (
            <>
              <button
                onClick={handleExpandAll}
                className="expand-collapse-button"
                title="Expand all JSON nodes"
              >
                Expand
              </button>
              <button
                onClick={handleCollapseAll}
                className="expand-collapse-button"
                title="Collapse all JSON nodes"
              >
                Collapse
              </button>
            </>
          )}
          {(!selectedCall.responseBody && selectedCall.status >= 200 && selectedCall.status < 300) && (
            <button 
              onClick={() => {
                // Trigger a manual refresh of response content
                logger.log("[NetworkDetailTabs] Manual refresh requested for:", selectedCall.url);
                // This will be handled by the parent component or we can add a callback
              }}
              className="refresh-button"
              title="Refresh response content"
            >
              ↻
            </button>
          )}
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
