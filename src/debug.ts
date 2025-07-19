// Debug utilities for Browser Investigator
import { logger } from "./utils/logger";

export const debugExtension = () => {
  logger.log("[Browser Investigator] Debug info:");
  logger.log("- Chrome available:", typeof chrome !== "undefined");
  logger.log(
    "- DevTools available:",
    typeof chrome !== "undefined" && !!chrome.devtools,
  );
  logger.log(
    "- DevTools network available:",
    typeof chrome !== "undefined" && !!chrome.devtools?.network,
  );
  logger.log(
    "- onRequestFinished available:",
    typeof chrome !== "undefined" &&
      !!chrome.devtools?.network?.onRequestFinished,
  );
  logger.log("- Location:", window.location.href);
  logger.log("- User agent:", navigator.userAgent);

  // Test if we can access chrome.devtools
  try {
    if (typeof chrome !== "undefined" && chrome.devtools) {
      logger.log("[Browser Investigator] DevTools object:", chrome.devtools);
      logger.log(
        "[Browser Investigator] Network object:",
        chrome.devtools.network,
      );
    }
  } catch (error) {
    logger.error("[Browser Investigator] Error accessing DevTools:", error);
  }
};

// Auto-run debug on load
debugExtension();
