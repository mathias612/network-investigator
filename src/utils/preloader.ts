// Preloading utilities for better performance
import { logger } from "./logger";

export const preloadComponent = (componentLoader: () => Promise<any>) => {
  // Preload on requestIdleCallback or setTimeout fallback
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => {
      componentLoader().catch(() => {
        // Silently fail - component will load normally when needed
      });
    });
  } else {
    setTimeout(() => {
      componentLoader().catch(() => {
        // Silently fail
      });
    }, 2000);
  }
};

export const preloadCriticalComponents = () => {
  // Preload heavy components after initial render
  preloadComponent(() => import("../components/FilterPanel"));
  preloadComponent(() => import("../components/SafeNetworkDetailTabs"));
};

// Load critical CSS from external file
export const loadCriticalCSS = async () => {
  try {
    // @ts-ignore
    const response = await fetch(chrome.runtime.getURL("dist/critical.css"));
    return await response.text();
  } catch {
    // Fallback critical styles
    return `
      .side-panel { font-family: system-ui; height: 100vh; display: flex; flex-direction: column; }
      .panel-header { height: 70px; padding: 15px 20px; border-bottom: 1px solid #dee2e6; }
      .skeleton { background: #f0f0f0; border-radius: 4px; }
    `;
  }
};

// Inject critical CSS immediately - synchronous for instant loading
export const injectCriticalCSS = () => {
  if (
    typeof document !== "undefined" &&
    !document.getElementById("critical-css")
  ) {
    const style = document.createElement("style");
    style.id = "critical-css";
    // Load critical CSS synchronously from the file we copied
    style.textContent = `
      /* Critical CSS loaded inline for instant rendering */
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body, html { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      .side-panel { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; background: #fff; color: #333; overflow: hidden; font-size: 14px; }
      .panel-header { height: 70px; padding: 15px 20px; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; justify-content: space-between; background: #f8f9fa; flex-shrink: 0; }
      .panel-header h1 { margin: 0; font-size: 20px; font-weight: 600; color: #212529; }
      .header-actions { display: flex; gap: 10px; align-items: center; }
      .panel-body { display: flex; flex: 1; overflow: hidden; }
      .sidebar { width: 33%; background: #f8f9fa; border-right: 1px solid #dee2e6; display: flex; flex-direction: column; transition: width 0.3s ease; overflow-y: auto; }
      .sidebar.collapsed { width: 40px; }
      .main-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
      button { padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: #fff; color: #333; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s ease; }
      button:hover { background: #f8f9fa; border-color: #adb5bd; }
      .clear-calls-btn { background: #dc3545; color: white; border-color: #dc3545; }
      .clear-calls-btn:hover { background: #c82333; border-color: #bd2130; }
      .network-call-item { padding: 12px 16px; border-bottom: 1px solid #e0e0e0; cursor: pointer; transition: background-color 0.2s ease; }
      .network-call-item:hover { background-color: #f8f9fa; }
      .network-call-item.selected { background-color: #e3f2fd; border-left: 3px solid #2196f3; }
      .split-view { display: flex; height: 100%; }
      .network-list-panel { flex: 1; border-right: 1px solid #dee2e6; overflow-y: auto; }
      .network-detail-panel { flex: 1; overflow-y: auto; }
      .sidebar-header { padding: 16px; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; justify-content: space-between; }
      .sidebar-title h3 { margin: 0; font-size: 16px; font-weight: 600; }
      .collapse-toggle { background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px; }
      .sidebar-filter-count { font-size: 12px; color: #666; margin-left: 8px; }
      .call-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
      .call-info-left { display: flex; align-items: center; gap: 8px; }
      .call-url { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px; color: #666; word-break: break-all; line-height: 1.4; margin-left: 0; margin-right: 0; }
      .call-error { font-size: 11px; color: #f44336; margin-top: 4px; font-weight: 500; }
      .method-badge { padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase; color: white; }
      .status-badge { padding: 3px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; color: white; }
      .duration { font-size: 11px; color: #666; font-weight: 500; }
      .timestamp { font-size: 11px; color: #666; font-weight: 400; }
      .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200px 100%; animation: shimmer 1.5s infinite linear; border-radius: 4px; }
      @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } }
    `;
    document.head.insertBefore(style, document.head.firstChild);
  }
};

// Resource hints for better performance
export const addResourceHints = () => {
  if (typeof document === "undefined") return;

  // Preconnect to potential API endpoints (if any)
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = "https://fonts.googleapis.com";
  document.head.appendChild(preconnect);

  // DNS prefetch for common domains
  const dnsPrefetch = document.createElement("link");
  dnsPrefetch.rel = "dns-prefetch";
  dnsPrefetch.href = "//fonts.gstatic.com";
  document.head.appendChild(dnsPrefetch);
};

// Performance observer to track loading metrics
export const initPerformanceMonitoring = () => {
  if (typeof window === "undefined" || !("PerformanceObserver" in window))
    return;

  try {
    // Monitor largest contentful paint
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        logger.log(`[Performance] ${entry.entryType}:`, entry);
      });
    });

    observer.observe({
      entryTypes: ["largest-contentful-paint", "first-input", "layout-shift"],
    });

    // Track custom timing
    performance.mark("browser-investigator-start");

    window.addEventListener("load", () => {
      performance.mark("browser-investigator-loaded");
      performance.measure(
        "browser-investigator-load-time",
        "browser-investigator-start",
        "browser-investigator-loaded",
      );
    });
  } catch (error) {
    logger.log("[Performance] Monitoring not available:", error);
  }
};

// Optimize for faster subsequent loads
export const optimizeForReload = () => {
  // Cache frequently used data
  if (typeof localStorage !== "undefined") {
    const cacheKey = "browser-investigator-preload-cache";
    const cacheData = {
      timestamp: Date.now(),
      version: "1.0.0",
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  }

  // Prefetch next likely actions (already handled in SidePanel)
  preloadCriticalComponents();
};
