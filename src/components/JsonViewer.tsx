import React, { useState, useCallback, useEffect, useRef } from "react";
import { detectUUIDs, copyUUIDToClipboard } from "../utils/uuid";
import { logger } from "../utils/logger";

interface JsonViewerProps {
  data: any;
  searchQuery?: string;
  currentSearchIndex?: number;
  searchResults?: Array<{ position: number; length: number; text: string }>;
  onSearchResultUpdate?: (element: HTMLElement | null) => void;
  searchDataAttribute?: string;
}

interface CollapsibleState {
  [key: string]: boolean;
}

const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  searchQuery = "",
  currentSearchIndex = 0,
  searchResults = [],
  onSearchResultUpdate,
  searchDataAttribute = "data-search-result-index",
}) => {
  const [collapsed, setCollapsed] = useState<CollapsibleState>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const currentResultRef = useRef<HTMLSpanElement>(null);

  const toggleCollapse = useCallback((path: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  }, []);

  const isCollapsed = useCallback(
    (path: string) => {
      return collapsed[path] || false;
    },
    [collapsed],
  );

  // Effect to scroll to current search result
  useEffect(() => {
    if (currentResultRef.current && searchResults.length > 0) {
      setTimeout(() => {
        currentResultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 100);
    }
  }, [currentSearchIndex, searchResults.length]);

  // Track search matches as we render
  const searchMatchCounter = useRef(0);

  const renderTextWithHighlights = useCallback(
    (text: string, path: string): React.ReactNode => {
      try {
        if (typeof text !== "string") {
          return String(text);
        }

        const uuidMatches = detectUUIDs(text);

        // Get search matches if search query provided
        const searchMatches: Array<{
          position: number;
          length: number;
          text: string;
          type: "search";
          localIndex: number;
        }> = [];
        if (searchQuery && searchQuery.trim()) {
          const searchRegex = new RegExp(
            searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "gi",
          );
          let match;
          let localIndex = 0;
          while ((match = searchRegex.exec(text)) !== null) {
            searchMatches.push({
              position: match.index,
              length: match[0].length,
              text: match[0],
              type: "search",
              localIndex: localIndex++,
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
            localIndex: -1,
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
            const beforeText = text.substring(lastIndex, match.position);
            if (beforeText) {
              parts.push(beforeText);
            }
          }

          // Add highlighted element
          if (match.type === "uuid") {
            parts.push(
              <span
                key={`uuid-${path}-${index}`}
                style={{
                  background: "var(--accent-blue)",
                  color: "var(--text-on-dark)",
                  padding: "1px 3px",
                  borderRadius: "2px",
                  cursor: "pointer",
                  fontWeight: "500",
                  border: "1px solid var(--accent-blue-hover)",
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
                  e.currentTarget.style.background = "var(--accent-blue-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--accent-blue)";
                }}
              >
                {match.text}
              </span>,
            );
          } else {
            const globalMatchIndex = searchMatchCounter.current++;
            const isCurrentResult = globalMatchIndex === currentSearchIndex;

            const element = (
              <span
                key={`search-${path}-${index}`}
                {...{ [searchDataAttribute]: globalMatchIndex }}
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
                title={
                  isCurrentResult ? "Current search result" : "Search match"
                }
                ref={(el) => {
                  if (isCurrentResult && el) {
                    (currentResultRef as any).current = el;
                    if (onSearchResultUpdate) {
                      onSearchResultUpdate(el);
                    }
                  }
                }}
              >
                {match.text}
              </span>
            );

            parts.push(element);
          }

          lastIndex = match.position + match.length;
        });

        // Add remaining text
        if (lastIndex < text.length) {
          const remainingText = text.substring(lastIndex);
          if (remainingText) {
            parts.push(remainingText);
          }
        }

        return parts;
      } catch (error) {
        logger.error("Error rendering text with highlights:", error);
        return String(text || "");
      }
    },
    [
      searchQuery,
      currentSearchIndex,
      searchDataAttribute,
      onSearchResultUpdate,
    ],
  );

  const renderValue = useCallback(
    (value: any, path: string, depth: number = 0): React.ReactNode => {
      // Reset counter at the start of rendering
      if (depth === 0) {
        searchMatchCounter.current = 0;
      }

      const indent = "  ".repeat(depth);

      if (value === null) {
        return <span style={{ color: "var(--text-muted)" }}>null</span>;
      }

      if (value === undefined) {
        return <span style={{ color: "var(--text-muted)" }}>undefined</span>;
      }

      if (typeof value === "boolean") {
        return (
          <span style={{ color: "var(--accent-blue)" }}>
            {value.toString()}
          </span>
        );
      }

      if (typeof value === "number") {
        return <span style={{ color: "var(--accent-green)" }}>{value}</span>;
      }

      if (typeof value === "string") {
        return (
          <span style={{ color: "var(--accent-green)" }}>
            "{renderTextWithHighlights(value, path)}"
          </span>
        );
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return <span>[]</span>;
        }

        const arrayPath = `${path}[]`;
        const isArrayCollapsed = isCollapsed(arrayPath);

        return (
          <div>
            <span>
              <button
                onClick={() => toggleCollapse(arrayPath)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 4px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
              >
                {isArrayCollapsed ? "▶" : "▼"}
              </button>
              <span style={{ color: "var(--text-secondary)" }}>
                Array({value.length})
              </span>
              {isArrayCollapsed && <span> [...] </span>}
            </span>
            {!isArrayCollapsed && (
              <div style={{ marginLeft: "16px" }}>
                <span style={{ color: "var(--text-secondary)" }}>[</span>
                {value.map((item, index) => (
                  <div 
                    key={index} 
                    className={depth > 0 ? "json-indentation-guide" : ""}
                    style={{ 
                      marginLeft: "16px",
                      paddingLeft: depth > 0 ? "15px" : "0"
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      {index}:{" "}
                    </span>
                    {renderValue(item, `${path}[${index}]`, depth + 1)}
                    {index < value.length - 1 && (
                      <span style={{ color: "var(--text-secondary)" }}>,</span>
                    )}
                  </div>
                ))}
                <span style={{ color: "var(--text-secondary)" }}>]</span>
              </div>
            )}
          </div>
        );
      }

      if (typeof value === "object") {
        const keys = Object.keys(value);
        if (keys.length === 0) {
          return <span>{"{}"}</span>;
        }

        const objectPath = `${path}{}`;
        const isObjectCollapsed = isCollapsed(objectPath);

        return (
          <div>
            <span>
              <button
                onClick={() => toggleCollapse(objectPath)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 4px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
              >
                {isObjectCollapsed ? "▶" : "▼"}
              </button>
              <span style={{ color: "var(--text-secondary)" }}>
                Object({keys.length})
              </span>
              {isObjectCollapsed && <span> {"{...}"} </span>}
            </span>
            {!isObjectCollapsed && (
              <div style={{ marginLeft: "16px" }}>
                <span style={{ color: "var(--text-secondary)" }}>{"{"}</span>
                {keys.map((key, index) => (
                  <div 
                    key={key} 
                    className={depth > 0 ? "json-indentation-guide" : ""}
                    style={{ 
                      marginLeft: "16px",
                      paddingLeft: depth > 0 ? "15px" : "0"
                    }}
                  >
                    <span style={{ color: "var(--accent-red)" }}>"{key}"</span>
                    <span style={{ color: "var(--text-secondary)" }}>: </span>
                    {renderValue(value[key], `${path}.${key}`, depth + 1)}
                    {index < keys.length - 1 && (
                      <span style={{ color: "var(--text-secondary)" }}>,</span>
                    )}
                  </div>
                ))}
                <span style={{ color: "var(--text-secondary)" }}>{"}"}</span>
              </div>
            )}
          </div>
        );
      }

      return <span>{String(value)}</span>;
    },
    [isCollapsed, toggleCollapse, renderTextWithHighlights],
  );

  try {
    return (
      <div
        ref={containerRef}
        style={{
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: "1.4",
          color: "var(--text-primary)",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        {renderValue(data, "root")}
      </div>
    );
  } catch (error) {
    logger.error("Error rendering JSON:", error);
    return (
      <div style={{ color: "var(--accent-red)", padding: "8px" }}>
        Error rendering JSON data
      </div>
    );
  }
};

export default JsonViewer;
