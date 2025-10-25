import { useState, useEffect, useMemo, useCallback } from "react";
import { NetworkCall, NetworkFilter, SearchConfig } from "../types";
import { logger } from "../utils/logger";
import { loadHistoricalNetworkData, HistoricalLoadResult, loadHistoricalResponseContent } from "../utils/historicalNetworkLoader";

const STORAGE_KEYS = {
  FILTERS: "browser-investigator-filters",
  SEARCH_CONFIG: "browser-investigator-search-config",
};

// Helper functions for localStorage with async operations
const saveToStorage = async (key: string, data: any) => {
  return new Promise<void>((resolve) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      logger.log(`[Browser Investigator] Saved ${key} to localStorage:`, data);
      resolve();
    } catch (error) {
      logger.error(
        `[Browser Investigator] Failed to save ${key} to localStorage:`,
        error,
      );
      resolve();
    }
  });
};

const loadFromStorage = async <T>(key: string, defaultValue: T): Promise<T> => {
  return new Promise((resolve) => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        logger.log(
          `[Browser Investigator] Loaded ${key} from localStorage:`,
          parsed,
        );
        resolve(parsed);
      } else {
        resolve(defaultValue);
      }
    } catch (error) {
      logger.error(
        `[Browser Investigator] Failed to load ${key} from localStorage:`,
        error,
      );
      resolve(defaultValue);
    }
  });
};

const loadFromStorageSync = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
  } catch (error) {
    logger.error(
      `[Browser Investigator] Failed to load ${key} from localStorage:`,
      error,
    );
  }
  return defaultValue;
};

export const useNetworkCalls = () => {
  const [networkCalls, setNetworkCalls] = useState<NetworkCall[]>([]);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [historicalLoadResult, setHistoricalLoadResult] = useState<HistoricalLoadResult | null>(null);

  // Manual refresh function for response bodies
  const refreshResponseBody = useCallback(async (callId: string) => {
    logger.log("[Browser Investigator] Manual refresh requested for call:", callId);
    
    try {
      // Try HAR data first
      const responseContent = await loadHistoricalResponseContent(callId);
      if (responseContent) {
        setNetworkCalls((prev) =>
          prev.map((existingCall) =>
            existingCall.id === callId
              ? { ...existingCall, responseBody: responseContent }
              : existingCall
          )
        );
        logger.log("[Browser Investigator] Manual refresh SUCCESS: Response body loaded for:", callId);
        return true;
      } else {
        logger.warn("[Browser Investigator] Manual refresh FAILED: No response content found for:", callId);
        return false;
      }
    } catch (error) {
      logger.error("[Browser Investigator] Manual refresh ERROR for:", callId, error);
      return false;
    }
  }, []);

  // Initialize with localStorage data synchronously for faster startup
  const [filters, setFilters] = useState<NetworkFilter[]>(
    loadFromStorageSync(STORAGE_KEYS.FILTERS, [] as NetworkFilter[]),
  );
  const [searchConfig, setSearchConfig] = useState<SearchConfig>(
    loadFromStorageSync(STORAGE_KEYS.SEARCH_CONFIG, {
      query: "",
      searchInHeaders: true,
      searchInPayload: true,
      searchInResponse: true,
      searchInErrors: true,
      useVoiceSearch: false,
    }),
  );

  const [devtoolsError, setDevtoolsError] = useState<string | null>(null);

  // Set loading to false immediately since we load synchronously
  useEffect(() => {
    setIsLoadingStorage(false);
  }, []);

  // Debounced save for filters to prevent excessive localStorage writes
  useEffect(() => {
    if (!isLoadingStorage) {
      const timeoutId = setTimeout(() => {
        saveToStorage(STORAGE_KEYS.FILTERS, filters);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [filters, isLoadingStorage]);

  // Debounced save for search config to prevent excessive localStorage writes
  useEffect(() => {
    if (!isLoadingStorage) {
      const timeoutId = setTimeout(() => {
        saveToStorage(STORAGE_KEYS.SEARCH_CONFIG, searchConfig);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchConfig, isLoadingStorage]);

  // Debug logging for DevTools API availability
  useEffect(() => {
    // @ts-ignore
    const devtoolsAvailable =
      typeof chrome !== "undefined" &&
      chrome.devtools &&
      chrome.devtools.network &&
      chrome.devtools.network.onRequestFinished;
    // eslint-disable-next-line no-console
    logger.log(
      "[Browser Investigator] DevTools API available:",
      !!devtoolsAvailable,
      chrome?.devtools,
    );
  }, []);

  // Load historical network data when the hook is first initialized
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (isLoadingHistorical) return; // Prevent multiple loads
      
      setIsLoadingHistorical(true);
      logger.log('[useNetworkCalls] Loading historical network data...');
      
      try {
        const result = await loadHistoricalNetworkData();
        setHistoricalLoadResult(result);
        
        if (result.calls.length > 0) {
          logger.log(`[useNetworkCalls] Successfully loaded ${result.calls.length} historical network calls`);
          // Add historical calls to the beginning of the array (older requests first)
          setNetworkCalls(prevCalls => [...result.calls, ...prevCalls]);
        } else {
          logger.log('[useNetworkCalls] No historical network data available');
        }
        
        if (result.errors.length > 0) {
          logger.warn('[useNetworkCalls] Historical data loading warnings:', result.errors);
        }
      } catch (error) {
        logger.error('[useNetworkCalls] Error loading historical data:', error);
      } finally {
        setIsLoadingHistorical(false);
      }
    };

    // Only load historical data once when the component mounts
    // and storage loading is complete
    if (!isLoadingStorage && !isLoadingHistorical && !historicalLoadResult) {
      // Small delay to ensure DevTools API is ready
      const timeoutId = setTimeout(loadHistoricalData, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isLoadingStorage, isLoadingHistorical, historicalLoadResult]);

  // Capture network calls using the DevTools API
  useEffect(() => {
    // @ts-ignore
    if (
      typeof chrome === "undefined" ||
      !chrome.devtools ||
      !chrome.devtools.network ||
      !chrome.devtools.network.onRequestFinished
    ) {
      setDevtoolsError("This panel must be opened from Chrome/Edge DevTools.");
      // eslint-disable-next-line no-console
      logger.error("[Browser Investigator] DevTools API not available.");
      return;
    }
    // @ts-ignore
    const listener = (request: any) => {
      // eslint-disable-next-line no-console
      logger.log("[Browser Investigator] Network call captured:", request);
      logger.log("[Browser Investigator] Full request object:", JSON.stringify(request, null, 2));

      // Headers might be in different formats, let's normalize them
      const requestHeaders = request.request?.headers || {};
      const responseHeaders = request.response?.headers || {};

      logger.log("[Browser Investigator] Raw request headers:", requestHeaders);
      logger.log(
        "[Browser Investigator] Raw response headers:",
        responseHeaders,
      );

      // Check if response body is available immediately from various locations
      const immediateResponseBody = request.response?.content?.text || 
                                   request.response?.body || 
                                   request.response?.content?.text ||
                                   request.response?.content?.body ||
                                   request.response?.text ||
                                   request.response?.data;
      
      logger.log("[Browser Investigator] Immediate response body available:", !!immediateResponseBody);
      if (immediateResponseBody) {
        logger.log("[Browser Investigator] Response body length:", immediateResponseBody.length);
        logger.log("[Browser Investigator] Response body preview:", immediateResponseBody.substring(0, 100));
      } else {
        logger.log("[Browser Investigator] No immediate response body found. Available response properties:", Object.keys(request.response || {}));
        if (request.response?.content) {
          logger.log("[Browser Investigator] Response content properties:", Object.keys(request.response.content));
        }
      }

      const call: NetworkCall = {
        id:
          request.request?.requestId ||
          Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url: request.request?.url || "",
        method: request.request?.method || "GET",
        status: request.response?.status || 0,
        statusText: request.response?.statusText || "",
        requestHeaders,
        responseHeaders,
        requestBody: request.request?.postData?.text,
        responseBody: immediateResponseBody || undefined,
        timestamp: Date.parse(request.startedDateTime) || Date.now(),
        duration: request.time || 0,
        error:
          request.response?.status >= 400
            ? `HTTP ${request.response.status}`
            : undefined,
      };

      // Add call immediately with response body if available
      setNetworkCalls((prev) => [...prev, { ...call }]);

      // If we don't have immediate response body, try multiple fallback strategies
      if (!immediateResponseBody) {
        logger.log("[Browser Investigator] No immediate response body, trying fallback strategies for:", call.url);
        
        // Strategy 1: Try HAR data immediately (fastest)
        setTimeout(async () => {
          try {
            logger.log("[Browser Investigator] Strategy 1: Attempting immediate HAR load for:", call.url);
            const responseContent = await loadHistoricalResponseContent(call.id);
            if (responseContent) {
              setNetworkCalls((prev) =>
                prev.map((existingCall) =>
                  existingCall.id === call.id
                    ? { ...existingCall, responseBody: responseContent }
                    : existingCall
                )
              );
              logger.log(
                "[Browser Investigator] Strategy 1 SUCCESS: Response body loaded from HAR immediately for:",
                call.url,
                "Length:",
                responseContent.length
              );
              return; // Exit early if successful
            }
          } catch (error) {
            logger.error(
              "[Browser Investigator] Strategy 1 FAILED: Error loading response content from HAR immediately for:",
              call.url,
              error
            );
          }
        }, 50); // Very short delay

        // Strategy 2: Try getContent method (if available)
        if (typeof request.getContent === "function") {
          setTimeout(() => {
            logger.log("[Browser Investigator] Strategy 2: Attempting getContent for:", call.url);
            request.getContent((content: string, encoding: string) => {
              if (content) {
                setNetworkCalls((prev) =>
                  prev.map((existingCall) =>
                    existingCall.id === call.id
                      ? { ...existingCall, responseBody: content }
                      : existingCall
                  )
                );
                logger.log(
                  "[Browser Investigator] Strategy 2 SUCCESS: Response body loaded via getContent for:",
                  call.url,
                  "Length:",
                  content.length
                );
              } else {
                logger.warn("[Browser Investigator] Strategy 2 FAILED: getContent returned empty for:", call.url);
              }
            });
          }, 200); // Slightly longer delay for getContent
        }

        // Strategy 3: Final HAR fallback with longer delay
        setTimeout(async () => {
          try {
            logger.log("[Browser Investigator] Strategy 3: Final HAR fallback for:", call.url);
            const responseContent = await loadHistoricalResponseContent(call.id);
            if (responseContent) {
              setNetworkCalls((prev) =>
                prev.map((existingCall) =>
                  existingCall.id === call.id
                    ? { ...existingCall, responseBody: responseContent }
                    : existingCall
                )
              );
              logger.log(
                "[Browser Investigator] Strategy 3 SUCCESS: Response body loaded from HAR fallback for:",
                call.url,
                "Length:",
                responseContent.length
              );
            } else {
              logger.warn("[Browser Investigator] Strategy 3 FAILED: No response content found in HAR for:", call.url);
            }
          } catch (error) {
            logger.error(
              "[Browser Investigator] Strategy 3 FAILED: Error in final HAR fallback for:",
              call.url,
              error
            );
          }
        }, 1000); // Final fallback with 1 second delay
      }

      // Note: All async loading is now handled by the strategy system above
    };
    // @ts-ignore
    chrome.devtools.network.onRequestFinished.addListener(listener);
    // eslint-disable-next-line no-console
    logger.log("[Browser Investigator] Listener added for network calls.");
    return () => {
      // @ts-ignore
      chrome.devtools.network.onRequestFinished.removeListener(listener);
      // eslint-disable-next-line no-console
      logger.log("[Browser Investigator] Listener removed for network calls.");
    };
  }, []);

  // Memoized active filters calculation
  const activeFilters = useMemo(
    () => filters.filter((f) => f.isActive),
    [filters],
  );
  const includeFilters = useMemo(
    () => activeFilters.filter((f) => !f.isExclude),
    [activeFilters],
  );
  const excludeFilters = useMemo(
    () => activeFilters.filter((f) => f.isExclude),
    [activeFilters],
  );

  // Memoized search query processing
  const normalizedQuery = useMemo(
    () => searchConfig.query?.toLowerCase().trim(),
    [searchConfig.query],
  );

  // Helper function to check if status code matches pattern
  const matchesResponseCode = useCallback(
    (status: number, patterns: string[]): boolean => {
      return patterns.some((pattern) => {
        if (pattern.endsWith("XX")) {
          const prefix = pattern.charAt(0);
          const statusStr = status.toString();
          return statusStr.startsWith(prefix) && statusStr.length === 3;
        } else {
          return status.toString() === pattern;
        }
      });
    },
    [],
  );

  // Optimized filtering with better memoization
  const filteredCalls = useMemo(() => {
    let result = networkCalls;

    // Apply include filters (ALL must match if any exist)
    if (includeFilters.length > 0) {
      logger.log("[Browser Investigator] Applying include filters:", includeFilters.length, "active filters");
      result = result.filter((call) => {
        const filterResults = includeFilters.map((filter) => {
          let matches = true;
          let filterMatchDetails = {};

          // Handle both single method (legacy) and multiple methods (new)
          if (filter.method && filter.method !== "") {
            const methodMatch = call.method === filter.method;
            matches = matches && methodMatch;
            filterMatchDetails = { ...filterMatchDetails, method: { required: filter.method, actual: call.method, match: methodMatch } };
          } else if (filter.methods && filter.methods.length > 0) {
            const methodMatch = filter.methods.includes(call.method);
            matches = matches && methodMatch;
            filterMatchDetails = { ...filterMatchDetails, methods: { required: filter.methods, actual: call.method, match: methodMatch } };
          }

          if (filter.urlPattern && filter.urlPattern !== "") {
            const urlMatch = call.url.toLowerCase().includes(filter.urlPattern.toLowerCase());
            matches = matches && urlMatch;
            filterMatchDetails = { ...filterMatchDetails, url: { required: filter.urlPattern, actual: call.url, match: urlMatch } };
          }

          if (filter.includeErrors) {
            const errorMatch = !!call.error || call.status >= 400;
            matches = matches && errorMatch;
            filterMatchDetails = { ...filterMatchDetails, errors: { required: true, actual: { hasError: !!call.error, status: call.status }, match: errorMatch } };
          }

          if (
            filter.responseCodeFilter &&
            filter.responseCodeFilter.length > 0
          ) {
            const responseCodeMatch = matchesResponseCode(call.status, filter.responseCodeFilter);
            matches = matches && responseCodeMatch;
            filterMatchDetails = { ...filterMatchDetails, responseCode: { required: filter.responseCodeFilter, actual: call.status, match: responseCodeMatch } };
          }

          return { filter: filter.name, matches, details: filterMatchDetails };
        });

        const allFiltersMatch = filterResults.every(r => r.matches);
        
        if (!allFiltersMatch) {
          logger.log(`[Browser Investigator] Call ${call.url} (${call.status}) did not match all filters:`, filterResults);
        }

        return allFiltersMatch;
      });
      logger.log(`[Browser Investigator] After include filters: ${result.length} calls remaining out of ${networkCalls.length} total`);
    }

    // Apply exclude filters (none must match)
    if (excludeFilters.length > 0) {
      result = result.filter((call) => {
        return !excludeFilters.some((filter) => {
          let matches = true;

          // Handle both single method (legacy) and multiple methods (new)
          if (filter.method && filter.method !== "") {
            matches = matches && call.method === filter.method;
          } else if (filter.methods && filter.methods.length > 0) {
            matches = matches && filter.methods.includes(call.method);
          }

          if (filter.urlPattern && filter.urlPattern !== "") {
            matches =
              matches &&
              call.url.toLowerCase().includes(filter.urlPattern.toLowerCase());
          }

          if (filter.includeErrors) {
            matches = matches && (!!call.error || call.status >= 400);
          }

          if (
            filter.responseCodeFilter &&
            filter.responseCodeFilter.length > 0
          ) {
            matches =
              matches &&
              matchesResponseCode(call.status, filter.responseCodeFilter);
          }

          return matches;
        });
      });
    }

    // Apply search filter with optimized text building
    if (normalizedQuery) {
      logger.log("[Browser Investigator] Applying search filter:", normalizedQuery);
      result = result.filter((call) => {
        // Check URL
        if (call.url.toLowerCase().includes(normalizedQuery)) {
          logger.log("[Browser Investigator] Match found in URL:", call.url);
          return true;
        }

        // Check errors
        if (
          searchConfig.searchInErrors &&
          call.error?.toLowerCase().includes(normalizedQuery)
        ) {
          logger.log("[Browser Investigator] Match found in error:", call.error);
          return true;
        }

        // Check headers
        if (searchConfig.searchInHeaders) {
          const headersText = JSON.stringify(call.requestHeaders).toLowerCase();
          if (headersText.includes(normalizedQuery)) {
            logger.log("[Browser Investigator] Match found in headers for:", call.url);
            return true;
          }
        }

        // Check payload
        if (searchConfig.searchInPayload && call.requestBody) {
          if (call.requestBody.toLowerCase().includes(normalizedQuery)) {
            logger.log("[Browser Investigator] Match found in payload for:", call.url);
            return true;
          }
        }

        // Check response body
        if (searchConfig.searchInResponse && call.responseBody) {
          if (call.responseBody.toLowerCase().includes(normalizedQuery)) {
            logger.log("[Browser Investigator] Match found in response for:", call.url);
            return true;
          }
        }

        return false;
      });
      logger.log("[Browser Investigator] Search results count:", result.length);
    }

    return result;
  }, [
    networkCalls,
    includeFilters,
    excludeFilters,
    normalizedQuery,
    searchConfig.searchInHeaders,
    searchConfig.searchInPayload,
    searchConfig.searchInResponse,
    searchConfig.searchInErrors,
    isLoadingStorage,
  ]);

  const addFilter = (filter: Omit<NetworkFilter, "id">) => {
    const newFilter: NetworkFilter = {
      ...filter,
      id: Date.now().toString(),
      isActive: true,
    };
    logger.log("[Browser Investigator] Adding filter:", newFilter);
    setFilters([...filters, newFilter]);
  };
  const updateFilter = (id: string, updates: Partial<NetworkFilter>) => {
    logger.log("[Browser Investigator] Updating filter:", id, updates);
    setFilters(
      filters.map((filter) =>
        filter.id === id ? { ...filter, ...updates } : filter,
      ),
    );
  };
  const removeFilter = (id: string) => {
    setFilters(filters.filter((filter) => filter.id !== id));
  };

  const clearNetworkCalls = async () => {
    setNetworkCalls([]);
  };

  const clearAllFilters = () => {
    logger.log("[Browser Investigator] Clearing all filters and localStorage");
    setFilters([]);
    localStorage.removeItem(STORAGE_KEYS.FILTERS);
  };

  const resetSearchConfig = () => {
    logger.log("[Browser Investigator] Resetting search config");
    const defaultConfig = {
      query: "",
      searchInHeaders: true,
      searchInPayload: true,
      searchInResponse: true,
      searchInErrors: true,
      useVoiceSearch: false,
    };
    setSearchConfig(defaultConfig);
  };

  return {
    networkCalls,
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
    refreshResponseBody,
  };
};
