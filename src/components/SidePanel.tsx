// Temporary: Use console.log directly to avoid import issues
// import { logger } from '../utils/logger';

console.log("[Browser Investigator] SidePanel script loading...");

import React, { useState, useCallback, Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { useNetworkCalls } from "../hooks/useNetworkCalls";
// Lazy load ALL non-critical components
const LazyNetworkCallList = lazy(() => import("./NetworkCallList"));
const LazyVirtualizedNetworkCallList = lazy(
  () => import("./VirtualizedNetworkCallList"),
);
const LazyFilterPanel = lazy(() => import("./FilterPanel"));
const LazySafeNetworkDetailTabs = lazy(() => import("./SafeNetworkDetailTabs"));
const LazyThemeToggle = lazy(() => import("./ThemeToggle"));
const LazyJsonViewer = lazy(() => import("./JsonViewer"));

// Keep only critical imports for initial render
import ErrorBoundary from "./ErrorBoundary";
import AppShell from "./AppShell";
import { ThemeProvider } from "../contexts/ThemeContext";
import { NetworkCall } from "../types";
import { MinimalSpinner } from "./LoadingSkeletons";

// Dynamically import heavy utilities and non-critical resources
const importDebugUtils = () => import("../debug");
// Note: CSS is now loaded via critical CSS injection instead of import
const importLazyUtils = () => import("../utils/lazyUtils");

// Load global CSS immediately for proper styling
// @ts-ignore
import("../styles/global.css");

// Load debug utils after initial render
requestIdleCallback(() => {
  importDebugUtils();
});

console.log("[Network Investigator] All imports loaded successfully");

const SidePanelContent: React.FC = () => {
  const {
    filteredCalls,
    filters,
    searchConfig,
    addFilter,
    updateFilter,
    removeFilter,
    setSearchConfig,
    clearNetworkCalls,
    clearAllFilters,
    resetSearchConfig,
    devtoolsError,
    isLoadingStorage,
  } = useNetworkCalls();

  const [selectedCall, setSelectedCall] = useState<NetworkCall | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleCallClick = useCallback((call: NetworkCall) => {
    setSelectedCall((prev) => (prev?.id === call.id ? null : call));
  }, []);

  const refreshCurrentPage = useCallback(async () => {
    try {
      // @ts-ignore
      if (chrome.tabs) {
        // @ts-ignore
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]) {
          // @ts-ignore
          await chrome.tabs.reload(tabs[0].id);
        }
      }
    } catch (error) {
      console.error("[Browser Investigator] Error refreshing page:", error);
    }
  }, []);

  const memoizedTakeScreenshot = useCallback(async () => {
    const { takeScreenshotLazy } = await importLazyUtils();
    return takeScreenshotLazy();
  }, []);

  // Use virtual scrolling for large lists (>50 items)
  const shouldUseVirtualScrolling = filteredCalls.length > 50;
  const NetworkCallComponent = shouldUseVirtualScrolling
    ? LazyVirtualizedNetworkCallList
    : LazyNetworkCallList;

  return (
    <div className="side-panel">
      <header className="panel-header">
        <h1 className="app-title">Network Investigator</h1>
        <div className="header-actions">
          <Suspense fallback={<MinimalSpinner />}>
            <LazyThemeToggle />
          </Suspense>
          <button
            className="clear-calls-btn"
            onClick={memoizedTakeScreenshot}
            style={{ background: "#3498db" }}
            title="Take screenshot of current page"
          >
            📸 Screenshot
          </button>
          <button
            className="clear-calls-btn"
            onClick={refreshCurrentPage}
            style={{ background: "#27ae60" }}
          >
            Refresh Page
          </button>
          <button className="clear-calls-btn" onClick={clearNetworkCalls}>
            Clear Calls
          </button>
        </div>
      </header>

      <div className="panel-body">
        {/* Left Sidebar - 1/3 width */}
        <div className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-title">
              {!sidebarCollapsed && (
                <>
                  <h3>Search & Filter</h3>
                  {filters.length > 0 && (
                    <span className="sidebar-filter-count">
                      ({filters.length} saved)
                    </span>
                  )}
                </>
              )}
            </div>
            <button
              className="collapse-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                position: "relative",
                background:
                  sidebarCollapsed && (searchConfig.query || filters.length > 0)
                    ? "#e3f2fd"
                    : "white",
              }}
            >
              {sidebarCollapsed ? "▶" : "◀"}
              {sidebarCollapsed &&
                (searchConfig.query || filters.length > 0) && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      width: "8px",
                      height: "8px",
                      background: "#2196f3",
                      borderRadius: "50%",
                      fontSize: "0",
                      border: "1px solid white",
                    }}
                  >
                    •
                  </span>
                )}
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search network calls..."
                  value={searchConfig.query}
                  onChange={(e) =>
                    setSearchConfig({ ...searchConfig, query: e.target.value })
                  }
                  className="search-input"
                />
                <div className="search-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={searchConfig.searchInHeaders}
                      onChange={(e) =>
                        setSearchConfig({
                          ...searchConfig,
                          searchInHeaders: e.target.checked,
                        })
                      }
                    />
                    Headers
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={searchConfig.searchInPayload}
                      onChange={(e) =>
                        setSearchConfig({
                          ...searchConfig,
                          searchInPayload: e.target.checked,
                        })
                      }
                    />
                    Payload
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={searchConfig.searchInResponse}
                      onChange={(e) =>
                        setSearchConfig({
                          ...searchConfig,
                          searchInResponse: e.target.checked,
                        })
                      }
                    />
                    Response
                  </label>
                </div>
              </div>

              <div className="filter-area-scrollable">
                <Suspense fallback={<MinimalSpinner />}>
                  <LazyFilterPanel
                    filters={filters}
                    onAddFilter={addFilter}
                    onUpdateFilter={updateFilter}
                    onRemoveFilter={removeFilter}
                  />
                </Suspense>
              </div>
            </>
          )}
        </div>

        {/* Right Content Area - 2/3 width */}
        <div className="main-content">
          {!selectedCall ? (
            // Show full network list when no call is selected
            <Suspense fallback={<MinimalSpinner />}>
              <NetworkCallComponent
                calls={filteredCalls}
                onCallClick={handleCallClick}
              />
            </Suspense>
          ) : (
            // Split view when a call is selected
            <div className="split-view">
              <div className="network-list-panel">
                <Suspense fallback={<MinimalSpinner />}>
                  <NetworkCallComponent
                    calls={filteredCalls}
                    onCallClick={handleCallClick}
                  />
                </Suspense>
              </div>
              <div className="network-detail-panel">
                <ErrorBoundary>
                  <Suspense fallback={<MinimalSpinner />}>
                    <LazySafeNetworkDetailTabs
                      selectedCall={selectedCall}
                      onClose={() => setSelectedCall(null)}
                      searchQuery={searchConfig.query}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SidePanel: React.FC = () => {
  // Quick check for devtools error without full hook initialization
  const [devtoolsError, setDevtoolsError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Quick devtools API check
    // @ts-ignore
    const devtoolsAvailable =
      typeof chrome !== "undefined" &&
      chrome.devtools &&
      chrome.devtools.network &&
      chrome.devtools.network.onRequestFinished;

    if (!devtoolsAvailable) {
      setDevtoolsError("This panel must be opened from Chrome/Edge DevTools.");
    }

    // Initialize immediately - no artificial delay
    setIsInitializing(false);
  }, []);

  return (
    <ErrorBoundary>
      <AppShell isLoading={isInitializing} error={devtoolsError}>
        <SidePanelContent />
      </AppShell>
    </ErrorBoundary>
  );
};

export default SidePanel;

// Import performance utilities
import {
  injectCriticalCSS,
  addResourceHints,
  initPerformanceMonitoring,
  preloadCriticalComponents,
  optimizeForReload,
} from "../utils/preloader";

// Initialize critical CSS immediately
injectCriticalCSS();

// Defer non-critical performance optimizations
requestIdleCallback(() => {
  addResourceHints();
  initPerformanceMonitoring();
  optimizeForReload();
});

// Mount the React app with optimizations
const mountApp = () => {
  console.log("[Network Investigator] Attempting to mount React app...");
  performance.mark("mount-start");

  const root = document.getElementById("root");
  if (root) {
    console.log("[Network Investigator] Root element found, mounting...");

    // Remove initial loader content
    root.innerHTML = "";

    // Create root and render with concurrent features
    const reactRoot = ReactDOM.createRoot(root);
    reactRoot.render(
      <ThemeProvider>
        <SidePanel />
      </ThemeProvider>,
    );

    // Mark body as React loaded
    document.body.classList.add("react-loaded");

    performance.mark("mount-end");
    performance.measure("mount-time", "mount-start", "mount-end");
    console.log("[Network Investigator] React app mounted successfully");

    // Start optimizations for future loads
    requestIdleCallback(() => {
      preloadCriticalComponents();
      optimizeForReload();
    });
  } else {
    console.error("[Network Investigator] Root element not found, retrying...");
    setTimeout(mountApp, 50); // Reduced retry time
  }
};

// Immediate mounting strategy
if (document.readyState === "loading") {
  // Use both DOMContentLoaded and a backup timer
  let mounted = false;

  const mount = () => {
    if (!mounted) {
      mounted = true;
      mountApp();
    }
  };

  document.addEventListener("DOMContentLoaded", mount);

  // Backup: mount after a short delay even if DOMContentLoaded hasn't fired
  setTimeout(mount, 100);
} else {
  mountApp();
}
