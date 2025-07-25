import { useState, useEffect, useMemo, useCallback } from "react";
import { NetworkCall, NetworkFilter, SearchConfig } from "../types";
import { logger } from "../utils/logger";

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

      // Headers might be in different formats, let's normalize them
      const requestHeaders = request.request?.headers || {};
      const responseHeaders = request.response?.headers || {};

      logger.log("[Browser Investigator] Raw request headers:", requestHeaders);
      logger.log(
        "[Browser Investigator] Raw response headers:",
        responseHeaders,
      );

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
        responseBody: undefined,
        timestamp: Date.parse(request.startedDateTime) || Date.now(),
        duration: request.time || 0,
        error:
          request.response?.status >= 400
            ? `HTTP ${request.response.status}`
            : undefined,
      };

      // Get response content asynchronously
      if (typeof request.getContent === "function") {
        request.getContent((content: string, encoding: string) => {
          call.responseBody = content;
          setNetworkCalls((prev) => [...prev, { ...call }]);
          // eslint-disable-next-line no-console
          logger.log(
            "[Browser Investigator] Response body captured for:",
            call.url,
          );
        });
      } else {
        // Add call without response body if getContent not available
        setNetworkCalls((prev) => [...prev, { ...call }]);
      }
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

    // Apply include filters (at least one must match if any exist)
    if (includeFilters.length > 0) {
      result = result.filter((call) => {
        return includeFilters.some((filter) => {
          let matches = true;

          if (filter.method && filter.method !== "") {
            matches = matches && call.method === filter.method;
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

    // Apply exclude filters (none must match)
    if (excludeFilters.length > 0) {
      result = result.filter((call) => {
        return !excludeFilters.some((filter) => {
          let matches = true;

          if (filter.method && filter.method !== "") {
            matches = matches && call.method === filter.method;
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
      result = result.filter((call) => {
        if (call.url.toLowerCase().includes(normalizedQuery)) return true;

        if (
          searchConfig.searchInErrors &&
          call.error?.toLowerCase().includes(normalizedQuery)
        )
          return true;

        if (searchConfig.searchInHeaders) {
          const headersText = JSON.stringify(call.requestHeaders).toLowerCase();
          if (headersText.includes(normalizedQuery)) return true;
        }

        if (searchConfig.searchInPayload && call.requestBody) {
          if (call.requestBody.toLowerCase().includes(normalizedQuery))
            return true;
        }

        if (searchConfig.searchInResponse && call.responseBody) {
          if (call.responseBody.toLowerCase().includes(normalizedQuery))
            return true;
        }

        return false;
      });
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
  };
};
