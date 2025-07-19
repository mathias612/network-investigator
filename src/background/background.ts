// Background script for Browser Investigator
// Minimal service worker for extension lifecycle

// Extension installation/startup
// @ts-ignore
chrome.runtime.onStartup?.addListener(() => {
  console.log("[Network Investigator] Extension started");
});

// @ts-ignore
chrome.runtime.onInstalled?.addListener(() => {
  console.log("[Network Investigator] Extension installed");
});

// Handle screenshot capture requests
// @ts-ignore
chrome.runtime.onMessage?.addListener((request, sender, sendResponse) => {
  if (request.action === "captureFullBrowser") {
    console.log("[Network Investigator] Capturing full browser screenshot");
    
    // Use tab capture for the visible tab (best available option)
    // @ts-ignore
    chrome.tabs.captureVisibleTab(
      null,
      { format: "png", quality: 100 },
      (dataUrl: string) => {
        if (dataUrl) {
          console.log("[Network Investigator] Screenshot captured successfully");
          sendResponse({ dataUrl: dataUrl });
        } else {
          console.error("[Network Investigator] Failed to capture screenshot");
          sendResponse({ error: "Failed to capture screenshot" });
        }
      }
    );
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

// Keep service worker alive (required for Manifest V3)
console.log("[Network Investigator] Background script loaded");
