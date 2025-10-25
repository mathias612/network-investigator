// Temporary: Use console.log directly to avoid import issues
// import { logger } from '../utils/logger';

console.log("[Browser Investigator] SidePanel script loading...");

import React, { useState, useCallback, Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { useNetworkCalls } from "../hooks/useNetworkCalls";
import { CopyFormatProvider } from "../contexts/CopyFormatContext";
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
    isLoadingHistorical,
    historicalLoadResult,
  } = useNetworkCalls();

  const [selectedCall, setSelectedCall] = useState<NetworkCall | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterBarCollapsed, setFilterBarCollapsed] = useState(false);
  const [showHistoricalNotification, setShowHistoricalNotification] = useState(true);
  const [splitViewMode, setSplitViewMode] = useState<'full' | 'minimized' | 'details'>('full');
  const [showInactiveFilters, setShowInactiveFilters] = useState(false);
  const [networkTrafficCollapsed, setNetworkTrafficCollapsed] = useState(false);

  const handleCallClick = useCallback((call: NetworkCall) => {
    setSelectedCall((prev) => (prev?.id === call.id ? null : call));
    // Automatically set to minimized view (40/60) when a call is selected
    if (selectedCall?.id !== call.id) {
      setSplitViewMode('minimized');
    }
  }, [selectedCall]);


  // Close inactive filters dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showInactiveFilters) {
        const target = event.target as Element;
        if (!target.closest('.inactive-filters')) {
          setShowInactiveFilters(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showInactiveFilters]);

  // Auto-hide historical notification after 2 seconds when loading is complete
  useEffect(() => {
    if (historicalLoadResult && !isLoadingHistorical && historicalLoadResult.calls.length > 0 && showHistoricalNotification) {
      const timeoutId = setTimeout(() => {
        setShowHistoricalNotification(false);
      }, 2000); // Hide after 2 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [historicalLoadResult, isLoadingHistorical, showHistoricalNotification]);

  // Removed refresh and screenshot functionality to comply with Chrome Web Store requirements

  // Use virtual scrolling for large lists (>50 items)
  const shouldUseVirtualScrolling = filteredCalls.length > 50;
  const NetworkCallComponent = shouldUseVirtualScrolling
    ? LazyVirtualizedNetworkCallList
    : LazyNetworkCallList;

  return (
    <div className="side-panel">
      <header className="panel-header">
        <div className="header-left">
          <h1 className="app-title">Network Investigator</h1>
          
          {/* Filter Bar in Header */}
          <div className={`header-filter-bar ${filterBarCollapsed ? "collapsed" : ""}`}>
            <button
              className="filter-toggle-btn"
              onClick={() => setFilterBarCollapsed(!filterBarCollapsed)}
              title={filterBarCollapsed ? "Show filters" : "Hide filters"}
            >
              🔍 {filterBarCollapsed ? "" : "Search & Filter"}
            </button>
            
            {!filterBarCollapsed && (
              <div className="header-filter-content">
                <input
                  type="text"
                  placeholder="Search network calls..."
                  value={searchConfig.query}
                  onChange={(e) => {
                    const newQuery = e.target.value;
                    console.log("[Browser Investigator] Search query changed:", newQuery);
                    setSearchConfig({ ...searchConfig, query: newQuery });
                  }}
                  className="header-search-input"
                />
                <div className="header-search-options">
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
                <div className="header-filter-chips">
                  {filters.filter(f => f.isActive).map((filter) => (
                    <div
                      key={filter.id}
                      className="filter-chip active"
                      onClick={() => updateFilter(filter.id, { isActive: !filter.isActive })}
                    >
                      {filter.name}
                      <button
                        className="filter-chip-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFilter(filter.id, { isActive: false });
                        }}
                        title="Deactivate filter"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {filters.filter(f => !f.isActive).length > 0 && (
                    <div className="inactive-filters">
                      <button
                        className="show-inactive-btn"
                        onClick={() => setShowInactiveFilters(!showInactiveFilters)}
                        title="Show inactive filters"
                      >
                        + {filters.filter(f => !f.isActive).length} inactive
                      </button>
                      {showInactiveFilters && (
                        <div className="inactive-filters-dropdown">
                          {filters.filter(f => !f.isActive).map((filter) => (
                            <div
                              key={filter.id}
                              className="inactive-filter-item"
                              onClick={() => updateFilter(filter.id, { isActive: true })}
                            >
                              {filter.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    className="add-filter-btn"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    + Add Filter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          <Suspense fallback={<MinimalSpinner />}>
            <LazyThemeToggle />
          </Suspense>
          {/* Network Traffic collapse/expand button - only show when a call is selected */}
          {selectedCall && (
            <button 
              className="collapse-network-btn"
              onClick={() => setNetworkTrafficCollapsed(!networkTrafficCollapsed)}
              title={networkTrafficCollapsed ? "Show Network Traffic" : "Hide Network Traffic"}
            >
              {networkTrafficCollapsed ? "▶" : "▼"}
            </button>
          )}
          {/* Removed screenshot and refresh buttons to comply with Chrome Web Store requirements */}
          <button className="clear-calls-btn" onClick={clearNetworkCalls}>
            Clear Calls
          </button>
        </div>
      </header>

      {/* Filter Modal */}
      {showFilters && (
        <div className="filter-modal-overlay">
          <div className="filter-modal">
            <div className="filter-modal-header">
              <h3>Add Filter</h3>
              <button
                className="close-button"
                onClick={() => setShowFilters(false)}
              >
                ×
              </button>
            </div>
            <div className="filter-modal-content">
              <Suspense fallback={<MinimalSpinner />}>
                <LazyFilterPanel
                  filters={filters}
                  onAddFilter={(filter) => {
                    addFilter(filter);
                    setShowFilters(false);
                  }}
                  onUpdateFilter={updateFilter}
                  onRemoveFilter={removeFilter}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      <div className="panel-body">
        {/* Main Content Area - Full width */}
        <div className="main-content">
          {/* Historical data loading notification */}
          {isLoadingHistorical && (
            <div 
              style={{
                background: "#e3f2fd",
                border: "1px solid #2196f3",
                borderRadius: "4px",
                padding: "8px 12px",
                margin: "8px",
                fontSize: "12px",
                color: "#1976d2",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <div 
                style={{
                  width: "12px",
                  height: "12px",
                  border: "2px solid #e3f2fd",
                  borderTop: "2px solid #2196f3",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}
              />
              Loading existing network traffic...
            </div>
          )}
          
          {/* Historical data load result notification */}
          {historicalLoadResult && !isLoadingHistorical && historicalLoadResult.calls.length > 0 && showHistoricalNotification && (
            <div 
              style={{
                background: "#e8f5e8",
                border: "1px solid #4caf50",
                borderRadius: "4px",
                padding: "8px 12px",
                margin: "8px",
                fontSize: "12px",
                color: "#2e7d32",
                opacity: 0.8,
                transition: "opacity 0.3s ease-out",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <span>
                ✓ Loaded {historicalLoadResult.calls.length} existing network requests 
                ({historicalLoadResult.loadTime.toFixed(0)}ms)
              </span>
              <button
                onClick={() => setShowHistoricalNotification(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2e7d32",
                  cursor: "pointer",
                  padding: "0 4px",
                  fontSize: "12px",
                  marginLeft: "8px",
                  opacity: 0.7
                }}
                title="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
          
          {!selectedCall ? (
            // Show full network list when no call is selected
            <Suspense fallback={<MinimalSpinner />}>
              <NetworkCallComponent
                calls={filteredCalls}
                onCallClick={handleCallClick}
                selectedCallId={null}
              />
            </Suspense>
          ) : (
            // Split view when a call is selected
            <div className={`split-view split-view-${networkTrafficCollapsed ? 'details' : splitViewMode} ${networkTrafficCollapsed ? 'network-collapsed' : ''}`}>
              {splitViewMode !== 'details' && !networkTrafficCollapsed && (
                <div className={`network-list-panel ${splitViewMode === 'minimized' ? 'minimized' : ''}`}>
                  <Suspense fallback={<MinimalSpinner />}>
                    <NetworkCallComponent
                      calls={filteredCalls}
                      onCallClick={handleCallClick}
                      selectedCallId={selectedCall.id}
                    />
                  </Suspense>
                </div>
              )}
              {splitViewMode !== 'full' && (
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
              )}
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
        <CopyFormatProvider>
          <SidePanel />
        </CopyFormatProvider>
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
