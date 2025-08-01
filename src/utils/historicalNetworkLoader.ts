import { logger } from "./logger";
import { NetworkCall } from "../types";

export interface HistoricalLoadResult {
  calls: NetworkCall[];
  loadTime: number;
  totalRequests: number;
  errors: string[];
}

/**
 * Converts HAR entry to NetworkCall format
 */
function convertHarEntryToNetworkCall(entry: any): NetworkCall | null {
  try {
    const request = entry.request;
    const response = entry.response;
    
    if (!request || !response) {
      logger.warn('Invalid HAR entry - missing request or response:', entry);
      return null;
    }

    // Convert headers arrays to objects
    const requestHeaders: Record<string, string> = {};
    if (request.headers && Array.isArray(request.headers)) {
      request.headers.forEach((header: any) => {
        if (header.name && header.value) {
          requestHeaders[header.name] = header.value;
        }
      });
    }

    const responseHeaders: Record<string, string> = {};
    if (response.headers && Array.isArray(response.headers)) {
      response.headers.forEach((header: any) => {
        if (header.name && header.value) {
          responseHeaders[header.name] = header.value;
        }
      });
    }

    // Create NetworkCall object
    const call: NetworkCall = {
      id: entry._requestId || `historical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: request.url || '',
      method: request.method || 'GET',
      status: response.status || 0,
      statusText: response.statusText || '',
      requestHeaders,
      responseHeaders,
      requestBody: request.postData?.text,
      responseBody: undefined, // Will be loaded asynchronously if needed
      timestamp: entry.startedDateTime ? new Date(entry.startedDateTime).getTime() : Date.now(),
      duration: entry.time || 0,
      error: response.status >= 400 ? `HTTP ${response.status}` : undefined,
    };

    return call;
  } catch (error) {
    logger.error('Error converting HAR entry to NetworkCall:', error, entry);
    return null;
  }
}

/**
 * Loads existing network data from Chrome DevTools using getHAR()
 * This function is designed to be fast and non-blocking
 */
export async function loadHistoricalNetworkData(): Promise<HistoricalLoadResult> {
  const startTime = performance.now();
  const result: HistoricalLoadResult = {
    calls: [],
    loadTime: 0,
    totalRequests: 0,
    errors: []
  };

  try {
    // Check if DevTools API is available
    // @ts-ignore
    if (
      typeof chrome === "undefined" ||
      !chrome.devtools ||
      !chrome.devtools.network ||
      // @ts-ignore
      !chrome.devtools.network.getHAR
    ) {
      const error = 'Chrome DevTools network.getHAR API not available';
      logger.warn(error);
      result.errors.push(error);
      return result;
    }

    logger.log('[Historical Loader] Loading existing network data...');

    // Get HAR data from DevTools
    // @ts-ignore
    const harLog: any = await new Promise((resolve, reject) => {
      // @ts-ignore
      chrome.devtools.network.getHAR((harLog: any) => {
        // @ts-ignore
        if (chrome.runtime.lastError) {
          // @ts-ignore
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(harLog);
        }
      });
    });

    if (!harLog || !harLog.entries || !Array.isArray(harLog.entries)) {
      const error = 'Invalid HAR data received from DevTools';
      logger.warn(error, harLog);
      result.errors.push(error);
      return result;
    }

    result.totalRequests = harLog.entries.length;
    logger.log(`[Historical Loader] Found ${result.totalRequests} existing network requests`);

    // Convert HAR entries to NetworkCall objects
    // Process in chunks to avoid blocking the UI
    const chunkSize = 50; // Process 50 requests at a time
    const chunks = [];
    
    for (let i = 0; i < harLog.entries.length; i += chunkSize) {
      chunks.push(harLog.entries.slice(i, i + chunkSize));
    }

    // Process chunks with small delays to keep UI responsive
    for (const [chunkIndex, chunk] of chunks.entries()) {
      // Add a small delay between chunks for large datasets
      if (chunkIndex > 0 && chunks.length > 10) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const chunkCalls = chunk
        .map((entry: any) => convertHarEntryToNetworkCall(entry))
        .filter((call: NetworkCall | null): call is NetworkCall => call !== null);
      
      result.calls.push(...chunkCalls);
      
      // Log progress for large datasets
      if (chunks.length > 5) {
        logger.log(`[Historical Loader] Processed chunk ${chunkIndex + 1}/${chunks.length} (${result.calls.length} valid calls)`);
      }
    }

    result.loadTime = performance.now() - startTime;
    logger.log(`[Historical Loader] Successfully loaded ${result.calls.length} network calls in ${result.loadTime.toFixed(2)}ms`);

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error loading historical data';
    logger.error('[Historical Loader] Error loading historical network data:', error);
    result.errors.push(errorMessage);
    result.loadTime = performance.now() - startTime;
    return result;
  }
}

/**
 * Loads response content for a historical network call
 * This is done on-demand to avoid loading all response bodies upfront
 */
export async function loadHistoricalResponseContent(requestId: string): Promise<string | undefined> {
  try {
    // @ts-ignore
    if (
      typeof chrome === "undefined" ||
      !chrome.devtools ||
      !chrome.devtools.network ||
      // @ts-ignore
      !chrome.devtools.network.getHAR
    ) {
      logger.warn('DevTools API not available for loading response content');
      return undefined;
    }

    // Get fresh HAR data to find the specific request
    // @ts-ignore
    const harLog: any = await new Promise((resolve, reject) => {
      // @ts-ignore
      chrome.devtools.network.getHAR((harLog: any) => {
        // @ts-ignore
        if (chrome.runtime.lastError) {
          // @ts-ignore
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(harLog);
        }
      });
    });

    if (!harLog || !harLog.entries) {
      return undefined;
    }

    // Find the specific entry
    const entry = harLog.entries.find((e: any) => e._requestId === requestId);
    if (!entry) {
      logger.warn(`Request with ID ${requestId} not found in HAR data`);
      return undefined;
    }

    // Get response content if available
    if (entry.response && entry.response.content && entry.response.content.text) {
      return entry.response.content.text;
    }

    logger.log(`No response content available for request ${requestId}`);
    return undefined;

  } catch (error) {
    logger.error('Error loading historical response content:', error);
    return undefined;
  }
}

/**
 * Performance-aware loader that provides progress updates
 */
export function loadHistoricalNetworkDataWithProgress(
  onProgress?: (loaded: number, total: number, currentCall?: NetworkCall) => void
): Promise<HistoricalLoadResult> {
  return new Promise(async (resolve) => {
    try {
      const startTime = performance.now();
      const result: HistoricalLoadResult = {
        calls: [],
        loadTime: 0,
        totalRequests: 0,
        errors: []
      };

      // @ts-ignore
      if (!chrome?.devtools?.network?.getHAR) {
        result.errors.push('DevTools API not available');
        resolve(result);
        return;
      }

      // @ts-ignore
      chrome.devtools.network.getHAR(async (harLog: any) => {
        try {
          if (!harLog?.entries?.length) {
            result.errors.push('No network data available');
            resolve(result);
            return;
          }

          result.totalRequests = harLog.entries.length;
          onProgress?.(0, result.totalRequests);

          // Process entries with progress updates
          for (let i = 0; i < harLog.entries.length; i++) {
            const entry = harLog.entries[i];
            const call = convertHarEntryToNetworkCall(entry);
            
            if (call) {
              result.calls.push(call);
              onProgress?.(i + 1, result.totalRequests, call);
            }

            // Yield control occasionally for large datasets
            if (i % 100 === 0 && i > 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }

          result.loadTime = performance.now() - startTime;
          logger.log(`[Historical Loader] Loaded ${result.calls.length} calls with progress tracking in ${result.loadTime.toFixed(2)}ms`);
          resolve(result);

        } catch (error) {
          logger.error('Error processing historical data with progress:', error);
          result.errors.push('Error processing historical data');
          resolve(result);
        }
      });

    } catch (error) {
      logger.error('Error in loadHistoricalNetworkDataWithProgress:', error);
      resolve({
        calls: [],
        loadTime: 0,
        totalRequests: 0,
        errors: ['Failed to start historical data loading']
      });
    }
  });
}