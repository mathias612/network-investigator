import { logger } from "./logger";

export const takeScreenshot = async () => {
  logger.log(
    "[Network Investigator] Taking browser window screenshot...",
  );

  try {
    // Use Chrome's DevTools protocol to capture the entire browser
    // @ts-ignore - Chrome DevTools API
    if (chrome.runtime && chrome.runtime.sendMessage) {
      // Send message to background script to capture screenshot
      // @ts-ignore
      chrome.runtime.sendMessage(
        { action: "captureFullBrowser" }
      ).then((response: any) => {
        if (response && response.dataUrl) {
          processScreenshot(response.dataUrl);
        } else {
          // Fallback to tab capture if full browser capture fails
          fallbackTabCapture();
        }
      }).catch(() => {
        // Fallback to tab capture if messaging fails
        fallbackTabCapture();
      });
    } else {
      // Direct fallback if runtime messaging not available
      fallbackTabCapture();
    }
  } catch (error) {
    logger.error("[Network Investigator] Error taking screenshot:", error);
    // Final fallback
    fallbackTabCapture();
  }
};

const fallbackTabCapture = () => {
  try {
    // @ts-ignore
    if (chrome.tabs && chrome.tabs.captureVisibleTab) {
      // @ts-ignore
      chrome.tabs.captureVisibleTab(
        null,
        { format: "png", quality: 100 },
        (dataUrl: string) => {
          if (dataUrl) {
            processScreenshot(dataUrl);
          } else {
            logger.error(
              "[Network Investigator] Failed to capture tab screenshot",
            );
          }
        },
      );
    } else {
      logger.error(
        "[Network Investigator] Chrome tabs capture API not available",
      );
    }
  } catch (error) {
    logger.error("[Network Investigator] Error in fallback capture:", error);
  }
};

// Removed complex drawing functions - now using direct tab capture

const processScreenshot = async (dataUrl: string) => {
  try {
    // Create download link to save as PNG
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `network-investigator-screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2ecc71;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    notification.textContent = "📸 Screenshot saved to Downloads folder";
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);

    // Try to copy to clipboard as a bonus (optional)
    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        logger.log("[Network Investigator] Screenshot also copied to clipboard");
      }
    } catch (clipboardError) {
      // Silently fail clipboard copy - download is the primary action
      logger.log("[Network Investigator] Clipboard copy failed (expected), screenshot downloaded");
    }

    logger.log("[Network Investigator] Screenshot captured and downloaded successfully");
  } catch (error) {
    logger.error("[Network Investigator] Error processing screenshot:", error);
  }
};
