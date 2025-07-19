/**
 * Utility functions for clipboard operations
 */
import { logger } from "./logger";

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    logger.log(
      "[ClipboardUtils] Attempting to copy text:",
      text.substring(0, 100) + (text.length > 100 ? "..." : ""),
    );
    logger.log("[ClipboardUtils] Text length:", text.length);
    logger.log("[ClipboardUtils] Is secure context:", window.isSecureContext);
    logger.log(
      "[ClipboardUtils] Navigator clipboard available:",
      !!navigator.clipboard,
    );

    // Try modern clipboard API first (works in some extension contexts)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        logger.log("[ClipboardUtils] Modern clipboard API succeeded");
        return true;
      } catch (clipboardError) {
        logger.log(
          "[ClipboardUtils] Modern clipboard API failed, falling back to execCommand:",
          clipboardError,
        );
      }
    }

    // Fallback to execCommand for Chrome extensions
    logger.log("[ClipboardUtils] Using execCommand fallback");
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    textArea.style.zIndex = "-1000";
    textArea.setAttribute("readonly", "");
    textArea.setAttribute("tabindex", "-1");

    document.body.appendChild(textArea);
    logger.log("[ClipboardUtils] Textarea added to DOM");

    // Focus and select the text
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    logger.log("[ClipboardUtils] Text selected, attempting copy...");

    // Try to copy
    const successful = document.execCommand("copy");

    // Clean up
    document.body.removeChild(textArea);
    logger.log("[ClipboardUtils] Textarea removed from DOM");

    logger.log("[ClipboardUtils] execCommand copy result:", successful);
    return successful;
  } catch (error) {
    logger.error("[ClipboardUtils] Failed to copy to clipboard:", error);
    return false;
  }
};

/**
 * Copy JSON data with proper formatting
 */
export const copyJsonToClipboard = async (data: any): Promise<boolean> => {
  try {
    const formattedJson = JSON.stringify(data, null, 2);
    return await copyToClipboard(formattedJson);
  } catch (error) {
    logger.error("Failed to copy JSON to clipboard:", error);
    return false;
  }
};

/**
 * Copy headers in a readable format
 */
export const copyHeadersToClipboard = async (
  headers: any,
): Promise<boolean> => {
  try {
    let headerText = "";

    if (Array.isArray(headers)) {
      // Handle array format: [{name: 'Content-Type', value: 'application/json'}, ...]
      headerText = headers
        .map(
          (header) =>
            `${header.name || header.key || String(header)}: ${header.value || String(header)}`,
        )
        .join("\n");
    } else if (typeof headers === "object" && headers !== null) {
      // Handle object format: {'Content-Type': 'application/json', ...}
      headerText = Object.entries(headers)
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
    } else {
      headerText = String(headers || "");
    }

    return await copyToClipboard(headerText);
  } catch (error) {
    logger.error("Failed to copy headers to clipboard:", error);
    return false;
  }
};

/**
 * Copy raw text data
 */
export const copyRawTextToClipboard = async (
  text: string,
): Promise<boolean> => {
  return await copyToClipboard(text);
};
