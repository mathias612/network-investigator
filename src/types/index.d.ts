// Network call data structure
export interface NetworkCall {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timestamp: number;
  duration: number;
  error?: string;
}

// Filter types
export interface NetworkFilter {
  id: string;
  name: string;
  method?: string;
  urlPattern?: string;
  includeHeaders?: boolean;
  includePayload?: boolean;
  includeResponse?: boolean;
  includeErrors?: boolean;
  responseCodeFilter?: string[]; // Array of response code patterns like '2XX', '3XX', '4XX', '5XX', or specific codes like '200', '404'
  isActive: boolean;
  isExclude?: boolean; // When true, filter excludes matching items instead of including them
}

// Search configuration
export interface SearchConfig {
  query: string;
  searchInHeaders: boolean;
  searchInPayload: boolean;
  searchInResponse: boolean;
  searchInErrors: boolean;
  useVoiceSearch: boolean;
}

// UUID detection
export interface UUIDMatch {
  uuid: string;
  position: number;
  context: string;
}

// Shipwell API integration
export interface ShipwellApiDoc {
  endpoint: string;
  method: string;
  documentationUrl: string;
  description: string;
}
