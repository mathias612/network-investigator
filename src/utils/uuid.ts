import { UUIDMatch } from "../types";
import { logger } from "./logger";

// UUID regex pattern (matches standard UUID format)
const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Detect UUIDs in a given string
 * @param text The text to search for UUIDs
 * @returns Array of UUID matches with position and context
 */
export const detectUUIDs = (text: string): UUIDMatch[] => {
  const matches: UUIDMatch[] = [];
  let match;

  while ((match = UUID_REGEX.exec(text)) !== null) {
    matches.push({
      uuid: match[0],
      position: match.index,
      context: text.substring(Math.max(0, match.index - 20), match.index + 40),
    });
  }

  return matches;
};

/**
 * Extract UUIDs from a URL
 * @param url The URL to extract UUIDs from
 * @returns Array of UUIDs found in the URL
 */
export const extractUUIDsFromURL = (url: string): string[] => {
  const matches = detectUUIDs(url);
  return matches.map((match) => match.uuid);
};

/**
 * Check if a string is a valid UUID
 * @param uuid The string to validate
 * @returns True if the string is a valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  return UUID_REGEX.test(uuid);
};

/**
 * Format UUID for display (adds hyphens if missing)
 * @param uuid The UUID string to format
 * @returns Properly formatted UUID
 */
export const formatUUID = (uuid: string): string => {
  // Remove any existing hyphens and convert to lowercase
  const clean = uuid.replace(/-/g, "").toLowerCase();

  if (clean.length !== 32) {
    return uuid; // Return original if not 32 characters
  }

  // Add hyphens in standard UUID format
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
};

/**
 * Copy UUID to clipboard
 * @param uuid The UUID to copy
 */
export const copyUUIDToClipboard = (uuid: string): void => {
  try {
    // Use execCommand to copy text - more reliable in extensions
    let copied = false;

    // Create a temporary textarea element
    const textArea = document.createElement("textarea");
    textArea.value = uuid;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      copied = document.execCommand("copy");
      logger.log("[UUID] UUID copied using execCommand");
    } catch (execError) {
      logger.log("[UUID] execCommand failed:", execError);
    }

    document.body.removeChild(textArea);

    // If execCommand failed, show the UUID in an alert as fallback
    if (!copied) {
      logger.log("[UUID] execCommand failed, showing UUID in alert");
      alert(`Copy this UUID:\n\n${uuid}`);
    }
  } catch (error) {
    logger.error("Failed to copy UUID to clipboard:", error);
  }
};

/**
 * Insert UUID into a text input
 * @param inputElement The input element to insert the UUID into
 * @param uuid The UUID to insert
 */
export const insertUUIDIntoInput = (
  inputElement: HTMLInputElement,
  uuid: string,
): void => {
  const start = inputElement.selectionStart || 0;
  const end = inputElement.selectionEnd || 0;
  const value = inputElement.value;

  const newValue = value.substring(0, start) + uuid + value.substring(end);
  inputElement.value = newValue;

  // Set cursor position after the inserted UUID
  const newPosition = start + uuid.length;
  inputElement.setSelectionRange(newPosition, newPosition);

  // Trigger change event
  inputElement.dispatchEvent(new Event("input", { bubbles: true }));
};

/**
 * Generate a random UUID (v4)
 * @returns A randomly generated UUID
 */
export const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
