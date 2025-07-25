// Lazy-loaded utility imports for better performance
export const loadClipboardUtils = () => import("./clipboardUtils");
export const loadScreenshotUtils = () => import("./screenshotUtils");
export const loadUuidUtils = () => import("./uuid");

// Heavy utility functions loaded on demand
export const copyToClipboardLazy = async (text: string) => {
  const { copyToClipboard } = await loadClipboardUtils();
  return copyToClipboard(text);
};

export const takeScreenshotLazy = async () => {
  const { takeScreenshot } = await loadScreenshotUtils();
  return takeScreenshot();
};

export const detectUUIDsLazy = async (text: string) => {
  const { detectUUIDs } = await loadUuidUtils();
  return detectUUIDs(text);
};

// Note: highlightUUIDs function doesn't exist in uuid.ts, removing this export
