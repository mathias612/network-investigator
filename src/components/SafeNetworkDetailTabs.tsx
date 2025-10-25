import React, { useState } from "react";
import { NetworkCall } from "../types";
import { detectUUIDs, copyUUIDToClipboard } from "../utils/uuid";
import JsonViewer from "./JsonViewer";
import CopyButton from "./CopyButton";
import SimpleCopyButton from "./SimpleCopyButton";
import { logger } from "../utils/logger";
import { enhancedJsonSearch } from "../utils/jsonSearch";
import { useNetworkCalls } from "../hooks/useNetworkCalls";

interface SafeNetworkDetailTabsProps {
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

const SafeNetworkDetailTabs: React.FC<SafeNetworkDetailTabsProps> = ({
  selectedCall,
  onClose,
  searchQuery = "",
}) => {
  const { refreshResponseBody } = useNetworkCalls();
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


  // JSON expand/collapse state
  const [jsonExpandAll, setJsonExpandAll] = useState(false);
  const [jsonCollapseAll, setJsonCollapseAll] = useState(false);

  // Copy button feedback state
  const [isCopied, setIsCopied] = useState(false);
  const [copySuccess, setCopySuccess] = useState<boolean | null>(null);
  
  // Loading state for response body
  const [isLoadingResponseBody, setIsLoadingResponseBody] = useState(false);
  const [responseBodyLoadTimeout, setResponseBodyLoadTimeout] = useState(false);

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
  }, [searchQuery]);

  // Set timeout for response body loading
  React.useEffect(() => {
    if (selectedCall.responseBody === undefined && selectedCall.status >= 200 && selectedCall.status < 300) {
      setResponseBodyLoadTimeout(false);
      const timeout = setTimeout(() => {
        setResponseBodyLoadTimeout(true);
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timeout);
    } else {
      setResponseBodyLoadTimeout(false);
    }
  }, [selectedCall.responseBody, selectedCall.status]);

  // Update search results when search query changes
  React.useEffect(() => {
    if (
      responseSearchQuery &&
      responseSearchQuery.trim() &&
      selectedCall.responseBody
    ) {
      const results: Array<{ position: number; length: number; text: string }> =
        [];
      const searchRegex = new RegExp(
        responseSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi",
      );
      let match;
      while ((match = searchRegex.exec(selectedCall.responseBody)) !== null) {
        results.push({
          position: match.index,
          length: match[0].length,
          text: match[0],
        });
      }
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
      const results: Array<{ position: number; length: number; text: string }> =
        [];
      const searchRegex = new RegExp(
        payloadSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi",
      );
      let match;
      while ((match = searchRegex.exec(selectedCall.requestBody)) !== null) {
        results.push({
          position: match.index,
          length: match[0].length,
          text: match[0],
        });
      }
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


  // Safety check
  if (!selectedCall) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <p>No network call selected</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  const safeStringify = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return String(obj) || "Unable to display data";
    }
  };

  const renderTextWithHighlights = (
    text: string,
    searchText?: string,
  ): React.ReactNode => {
    try {
      // Ensure text is actually a string
      if (typeof text !== "string") {
        return String(text);
      }

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

        // Add text before match - ensure it's a string
        if (match.position > lastIndex) {
          const beforeText = text.substring(lastIndex, match.position);
          if (beforeText) {
            parts.push(beforeText);
          }
        }

        // Add highlighted element
        if (match.type === "uuid") {
          parts.push(
            <span
              key={`uuid-${index}`}
              style={{
                background: "#fff3cd",
                color: "#856404",
                padding: "1px 3px",
                borderRadius: "2px",
                cursor: "pointer",
                fontWeight: "500",
                border: "1px solid #ffeaa7",
              }}
              onClick={() => {
                try {
                  copyUUIDToClipboard(match.text);
                } catch (error) {
                  logger.error("Error copying UUID:", error);
                }
              }}
              title="Click to copy UUID"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ffeaa7";
                e.currentTarget.style.borderColor = "#ffd93d";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff3cd";
                e.currentTarget.style.borderColor = "#ffeaa7";
              }}
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

      // Add remaining text - ensure it's a string
      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        if (remainingText) {
          parts.push(remainingText);
        }
      }

      return parts;
    } catch (error) {
      logger.error("Error rendering text with highlights:", error);
      return String(text || ""); // Fallback to string conversion
    }
  };

  const renderWithUUIDs = (text: string): React.ReactNode => {
    return renderTextWithHighlights(text);
  };

  const renderPayloadWithHighlights = (
    text: string,
    searchText?: string,
  ): React.ReactNode => {
    try {
      // Ensure text is actually a string
      if (typeof text !== "string") {
        return String(text);
      }

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

        // Add text before match - ensure it's a string
        if (match.position > lastIndex) {
          const beforeText = text.substring(lastIndex, match.position);
          if (beforeText) {
            parts.push(beforeText);
          }
        }

        // Add highlighted element
        if (match.type === "uuid") {
          parts.push(
            <span
              key={`uuid-${index}`}
              style={{
                background: "#fff3cd",
                color: "#856404",
                padding: "1px 3px",
                borderRadius: "2px",
                cursor: "pointer",
                fontWeight: "500",
                border: "1px solid #ffeaa7",
              }}
              onClick={() => {
                try {
                  copyUUIDToClipboard(match.text);
                } catch (error) {
                  logger.error("Error copying UUID:", error);
                }
              }}
              title="Click to copy UUID"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ffeaa7";
                e.currentTarget.style.borderColor = "#ffd93d";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff3cd";
                e.currentTarget.style.borderColor = "#ffeaa7";
              }}
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

      // Add remaining text - ensure it's a string
      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        if (remainingText) {
          parts.push(remainingText);
        }
      }

      return parts;
    } catch (error) {
      logger.error("Error rendering payload with highlights:", error);
      return String(text || ""); // Fallback to string conversion
    }
  };

  const formatBytes = (bytes: number): string => {
    try {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    } catch (error) {
      return "0 B";
    }
  };

  const renderHeadersTable = (headers: any, title: string) => {
    try {
      logger.log(`[SafeNetworkDetailTabs] Rendering ${title}:`, headers);

      if (!headers) {
        return <div className="empty-state">No {title.toLowerCase()}</div>;
      }

      let headerEntries: [string, string][] = [];

      // Handle different header formats
      if (Array.isArray(headers)) {
        // Handle array format: [{name: 'Content-Type', value: 'application/json'}, ...]
        headerEntries = headers.map((header) => [
          header.name || header.key || String(header),
          header.value || String(header),
        ]);
      } else if (typeof headers === "object") {
        // Handle object format: {'Content-Type': 'application/json', ...}
        headerEntries = Object.entries(headers).map(([key, value]) => [
          key,
          typeof value === "object" && value !== null
            ? (value as any).value ||
              (value as any).name ||
              JSON.stringify(value)
            : String(value || ""),
        ]);
      } else {
        // Handle other formats
        return (
          <div className="empty-state">
            Unable to display {title.toLowerCase()}
          </div>
        );
      }

      if (headerEntries.length === 0) {
        return <div className="empty-state">No {title.toLowerCase()}</div>;
      }

      return (
        <div className="headers-table">
          {headerEntries.map(([name, value], index) => (
            <div key={`${name}-${index}`} className="header-row">
              <div className="header-name">{name}</div>
              <div className="header-value">
                {renderWithUUIDs(String(value))}
              </div>
            </div>
          ))}
        </div>
      );
    } catch (error) {
      logger.error(`[SafeNetworkDetailTabs] Error rendering ${title}:`, error);
      return (
        <div
          style={{
            padding: "16px",
            background: "#ffebee",
            border: "1px solid #f44336",
            borderRadius: "4px",
          }}
        >
          <p style={{ color: "#d32f2f", margin: 0 }}>
            Error displaying {title.toLowerCase()}
          </p>
        </div>
      );
    }
  };

  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case "headers":
          return (
            <div className="tab-content">
                              <div className="headers-section">
                  <h4>General</h4>
                  <div className="headers-table">
                    <div className="header-row">
                      <span className="header-name">Request URL:</span>
                      <span className="header-value">{renderWithUUIDs(selectedCall.url)}</span>
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <h4 style={{ margin: 0 }}>Request Headers</h4>
                  <CopyButton
                    data={selectedCall.requestHeaders}
                    dataType="headers"
                    title="Copy request headers"
                  />
                </div>
                {renderHeadersTable(
                  selectedCall.requestHeaders,
                  "Request Headers",
                )}
              </div>

              <div className="headers-section">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <h4 style={{ margin: 0 }}>Response Headers</h4>
                  <CopyButton
                    data={selectedCall.responseHeaders}
                    dataType="headers"
                    title="Copy response headers"
                  />
                </div>
                {renderHeadersTable(
                  selectedCall.responseHeaders,
                  "Response Headers",
                )}
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
                    margin: "0 12px 12px 12px",
                  }}
                >
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedCall.requestBody);
                      return (
                        (() => {
                          logger.log("[SafeNetworkDetailTabs] Rendering JsonViewer for payload");
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
                        })()
                      );
                    } catch {
                      return (
                        <pre>
                          {renderPayloadWithHighlights(
                            String(selectedCall.requestBody || ""),
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
                    <pre>
                      {(() => {
                        try {
                          const parsed = JSON.parse(selectedCall.responseBody);
                          return renderWithUUIDs(safeStringify(parsed));
                        } catch {
                          return renderWithUUIDs(
                            String(selectedCall.responseBody || ""),
                          );
                        }
                      })()}
                    </pre>
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
                    margin: "0 12px 12px 12px",
                  }}
                >
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedCall.responseBody);
                      return (
                        (() => {
                          logger.log("[SafeNetworkDetailTabs] Rendering JsonViewer for response");
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
                        })()
                      );
                    } catch {
                      return (
                        <pre>
                          {renderTextWithHighlights(
                            String(selectedCall.responseBody || ""),
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
                    // Check if this is a case where response should be available but isn't
                    (selectedCall.status >= 200 && selectedCall.status < 300 && !responseBodyLoadTimeout) ? (
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
                      "Failed to load response data"
                    )
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
                  <div className="info-label">URL:</div>
                  <div className="info-value">
                    {renderWithUUIDs(String(selectedCall.url || "N/A"))}
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-label">Method:</div>
                  <div className="info-value">
                    {selectedCall.method || "N/A"}
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-label">Status:</div>
                  <div className="info-value">
                    {selectedCall.status || "N/A"}{" "}
                    {selectedCall.statusText || ""}
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-label">Timestamp:</div>
                  <div className="info-value">
                    {selectedCall.timestamp
                      ? new Date(selectedCall.timestamp).toLocaleString()
                      : "N/A"}
                  </div>
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
                  <div className="info-label">Duration:</div>
                  <div className="info-value">
                    {selectedCall.duration || 0}ms
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-label">Started:</div>
                  <div className="info-value">
                    {selectedCall.timestamp
                      ? new Date(selectedCall.timestamp).toLocaleString()
                      : "N/A"}
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-label">Finished:</div>
                  <div className="info-value">
                    {selectedCall.timestamp && selectedCall.duration
                      ? new Date(
                          selectedCall.timestamp + selectedCall.duration,
                        ).toLocaleString()
                      : "N/A"}
                  </div>
                </div>

                {selectedCall.requestBody && (
                  <div className="info-row">
                    <div className="info-label">Request Size:</div>
                    <div className="info-value">
                      {formatBytes(
                        new TextEncoder().encode(selectedCall.requestBody)
                          .length,
                      )}
                    </div>
                  </div>
                )}

                {selectedCall.responseBody && (
                  <div className="info-row">
                    <div className="info-label">Response Size:</div>
                    <div className="info-value">
                      {formatBytes(
                        new TextEncoder().encode(selectedCall.responseBody)
                          .length,
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );

        default:
          return (
            <div
              style={{ padding: "16px", textAlign: "center", color: "#666" }}
            >
              Tab content not available
            </div>
          );
      }
    } catch (error) {
      logger.error("Error rendering tab content:", error);
      return (
        <div
          style={{
            padding: "16px",
            background: "#ffebee",
            border: "1px solid #f44336",
            borderRadius: "4px",
          }}
        >
          <h4 style={{ color: "#d32f2f" }}>Error displaying content</h4>
          <p style={{ fontSize: "12px" }}>
            There was an error rendering this tab.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="network-detail-tabs">
      {/* Tab Header */}
      <div className="tabs-header">
        <div className="tabs-nav">
          {(
            [
              "headers",
              "payload",
              "preview",
              "response",
              "initiator",
              "timing",
            ] as TabType[]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-button ${activeTab === tab ? "active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="tabs-actions">
          <div className="search-container">
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
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="expand-collapse-button"
                title="Collapse all JSON nodes"
              >
                Collapse All
              </button>
            </>
          )}
          {(!selectedCall.responseBody && selectedCall.status >= 200 && selectedCall.status < 300) && (
            <button 
              onClick={async () => {
                if (isLoadingResponseBody) return; // Prevent multiple clicks
                
                setIsLoadingResponseBody(true);
                logger.log("[SafeNetworkDetailTabs] Manual refresh requested for:", selectedCall.url);
                
                try {
                  const success = await refreshResponseBody(selectedCall.id);
                  if (success) {
                    logger.log("[SafeNetworkDetailTabs] Manual refresh successful for:", selectedCall.url);
                  } else {
                    logger.warn("[SafeNetworkDetailTabs] Manual refresh failed for:", selectedCall.url);
                  }
                } finally {
                  setIsLoadingResponseBody(false);
                }
              }}
              className={`refresh-button ${isLoadingResponseBody ? 'loading' : ''}`}
              title={isLoadingResponseBody ? "Loading response content..." : "Refresh response content"}
              disabled={isLoadingResponseBody}
            >
              {isLoadingResponseBody ? (
                <div className="loading-spinner" style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid var(--border-color)',
                  borderTop: '2px solid var(--accent-blue)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              ) : (
                '↻'
              )}
            </button>
          )}
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tabs-body">{renderTabContent()}</div>
    </div>
  );
};

export default SafeNetworkDetailTabs;
