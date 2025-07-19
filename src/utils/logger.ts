// Production-safe logging utility
const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log("[Browser Investigator]", ...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error("[Browser Investigator]", ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn("[Browser Investigator]", ...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug("[Browser Investigator]", ...args);
    }
  },
};
