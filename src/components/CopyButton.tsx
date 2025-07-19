import React, { useState } from "react";
import { copyToClipboard } from "../utils/clipboardUtils";
import { logger } from "../utils/logger";

interface CopyButtonProps {
  data: any;
  dataType: "json" | "headers" | "text";
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

const CopyButton: React.FC<CopyButtonProps> = ({
  data,
  dataType,
  title = "Copy to clipboard",
  className = "",
  style = {},
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState<boolean | null>(null);

  const handleCopy = async () => {
    if (isLoading) return;

    logger.log(
      "[CopyButton] Copy button clicked, dataType:",
      dataType,
      "data:",
      data,
    );

    setIsLoading(true);

    try {
      let success = false;

      switch (dataType) {
        case "json":
          if (typeof data === "string") {
            // Try to parse as JSON first, then copy as formatted JSON
            try {
              const parsed = JSON.parse(data);
              success = await copyToClipboard(JSON.stringify(parsed, null, 2));
            } catch {
              // If not valid JSON, copy as raw text
              success = await copyToClipboard(data);
            }
          } else {
            // Data is already an object
            success = await copyToClipboard(JSON.stringify(data, null, 2));
          }
          break;

        case "headers":
          if (Array.isArray(data)) {
            // Handle array format: [{name: 'Content-Type', value: 'application/json'}, ...]
            const headerText = data
              .map(
                (header) =>
                  `${header.name || header.key || String(header)}: ${header.value || String(header)}`,
              )
              .join("\n");
            success = await copyToClipboard(headerText);
          } else if (typeof data === "object" && data !== null) {
            // Handle object format: {'Content-Type': 'application/json', ...}
            const headerText = Object.entries(data)
              .map(([key, value]) => {
                const headerValue =
                  typeof value === "object" && value !== null
                    ? (value as any).value ||
                      (value as any).name ||
                      JSON.stringify(value)
                    : String(value || "");
                return `${key}: ${headerValue}`;
              })
              .join("\n");
            success = await copyToClipboard(headerText);
          } else {
            success = await copyToClipboard(String(data || ""));
          }
          break;

        case "text":
        default:
          success = await copyToClipboard(String(data || ""));
          break;
      }

      logger.log("[CopyButton] Copy operation result:", success);

      if (success) {
        setIsCopied(true);
        setCopySuccess(true);
        setTimeout(() => {
          setIsCopied(false);
          setCopySuccess(null);
        }, 2000); // Reset after 2 seconds
      } else {
        logger.error("[CopyButton] Copy operation failed");
        // Show a brief error state
        setIsCopied(true);
        setCopySuccess(false);
        setTimeout(() => {
          setIsCopied(false);
          setCopySuccess(null);
        }, 1000);
      }
    } catch (error) {
      logger.error("Failed to copy data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={isLoading}
      title={title}
      className={`copy-button ${className} ${isCopied ? (copySuccess ? "copied" : "error") : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px",
        border: "1px solid var(--border-color)",
        borderRadius: "4px",
        background: isCopied
          ? copySuccess
            ? "var(--success-color, #4caf50)"
            : "var(--accent-red, #e74c3c)"
          : "var(--bg-primary)",
        color: isCopied ? "white" : "var(--text-primary)",
        cursor: isLoading ? "not-allowed" : "pointer",
        fontSize: "14px",
        transition: "all 0.2s ease",
        minWidth: "32px",
        height: "32px",
        ...style,
      }}
    >
      {isLoading ? (
        <span style={{ fontSize: "12px" }}>⏳</span>
      ) : isCopied ? (
        <span style={{ fontSize: "14px" }}>{copySuccess ? "✓" : "✗"}</span>
      ) : (
        <span style={{ fontSize: "14px" }}>📋</span>
      )}
    </button>
  );
};

export default CopyButton;
