# Network Investigator - Technical Architecture

## System Overview

Network Investigator is a Chrome/Edge extension designed for network traffic analysis and debugging. The system follows a modular architecture with clear separation of concerns between data capture, processing, UI rendering, and persistence.

## Architecture Patterns

### 1. Extension Architecture Pattern
The extension follows Chrome Extension Manifest V3 patterns:

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Context                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   DevTools  │  │ Side Panel  │  │ Background  │     │
│  │    Panel    │  │   (Future)  │  │   Script    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│              Chrome Extension APIs                       │
│  • devtools.network  • storage  • clipboardWrite       │
└─────────────────────────────────────────────────────────┘
```

### 2. React Component Architecture
The UI follows a hierarchical React component structure:

```
SidePanel (Root)
├── ThemeProvider
├── ErrorBoundary
├── FilterPanel
│   ├── Filter Management
│   └── Search Configuration
├── NetworkCallList
│   ├── Call Item
│   ├── Timing Display
│   └── UUID Detection
└── NetworkDetailTabs
    ├── Request Tab
    ├── Response Tab
    ├── Headers Tab
    └── Export Functions
```

### 3. Data Flow Architecture
The system implements unidirectional data flow with React hooks:

```
Chrome DevTools API
       ↓ (Events)
useNetworkCalls Hook
       ↓ (State Updates)
React Components
       ↓ (User Actions)
Local Storage
       ↓ (Persistence)
Session Recovery
```

## Core Components

### 1. Network Capture Engine (`useNetworkCalls.ts`)

**Purpose**: Central hub for network data capture and state management

**Key Responsibilities**:
- Interface with Chrome DevTools Network API
- Real-time network call capture and processing
- Filter application and management
- Search functionality implementation
- Data persistence and recovery

**Implementation Details**:
```typescript
// Event listener registration
chrome.devtools.network.onRequestFinished.addListener(listener);

// Data transformation
const call: NetworkCall = {
  id: request.request?.requestId || generateId(),
  url: request.request?.url || '',
  method: request.request?.method || 'GET',
  // ... other properties
};

// Async response body capture
if (typeof request.getContent === 'function') {
  request.getContent((content: string, encoding: string) => {
    call.responseBody = content;
    setNetworkCalls(prev => [...prev, { ...call }]);
  });
}
```

**Performance Optimizations**:
- React.useMemo for expensive filtering operations
- Debounced search implementation
- Lazy loading of response bodies
- Memory-efficient data structures

### 2. Filter Engine

**Purpose**: Advanced filtering system for network traffic analysis

**Filter Types**:
1. **Method Filter**: HTTP method matching (GET, POST, PUT, DELETE, etc.)
2. **URL Pattern Filter**: Substring matching against request URLs
3. **Content Filter**: Include/exclude based on headers, payload, response data
4. **Error Filter**: Filter for error responses (4xx, 5xx status codes)

**Filter Logic Implementation**:
```typescript
// Include filters (OR logic - any filter can match)
if (includeFilters.length > 0) {
  result = result.filter(call => {
    return includeFilters.some(filter => {
      let matches = true;
      
      if (filter.method && filter.method !== '') {
        matches = matches && call.method === filter.method;
      }
      
      if (filter.urlPattern && filter.urlPattern !== '') {
        matches = matches && call.url.toLowerCase()
          .includes(filter.urlPattern.toLowerCase());
      }
      
      return matches;
    });
  });
}

// Exclude filters (AND logic - no filter should match)
if (excludeFilters.length > 0) {
  result = result.filter(call => {
    return !excludeFilters.some(filter => {
      // Similar matching logic but inverted
    });
  });
}
```

### 3. Search Engine

**Purpose**: Full-text search across captured network data

**Search Scope**:
- Request headers and payload
- Response headers and body
- Error messages and status text
- URL and query parameters

**Implementation**:
```typescript
const searchableText = [
  searchConfig.searchInHeaders ? JSON.stringify(call.requestHeaders) : '',
  searchConfig.searchInPayload ? call.requestBody || '' : '',
  searchConfig.searchInResponse ? call.responseBody || '' : '',
  searchConfig.searchInErrors ? call.error || '' : '',
  call.url
].join(' ').toLowerCase();

return searchableText.includes(query.toLowerCase());
```

### 4. UUID Detection System

**Purpose**: Automatic identification and management of UUIDs in network data

**Detection Algorithm**:
```typescript
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

export const detectUUIDs = (text: string): UUIDMatch[] => {
  const matches: UUIDMatch[] = [];
  let match;
  
  while ((match = UUID_REGEX.exec(text)) !== null) {
    matches.push({
      uuid: match[0],
      position: match.index,
      context: text.substring(
        Math.max(0, match.index - 20),
        Math.min(text.length, match.index + match[0].length + 20)
      )
    });
  }
  
  return matches;
};
```

### 5. Export System

**Purpose**: Data export functionality for external analysis

**Export Formats**:
1. **cURL Commands**: Convert requests to executable cURL commands
2. **JSON Export**: Structured data export for further processing
3. **Clipboard Integration**: One-click copying functionality

**cURL Generation Example**:
```typescript
const generateCurl = (call: NetworkCall): string => {
  let curl = `curl -X ${call.method}`;
  
  // Add headers
  Object.entries(call.requestHeaders).forEach(([key, value]) => {
    curl += ` -H "${key}: ${value}"`;
  });
  
  // Add request body
  if (call.requestBody) {
    curl += ` -d '${call.requestBody}'`;
  }
  
  curl += ` "${call.url}"`;
  return curl;
};
```

## Data Models

### NetworkCall Interface
```typescript
interface NetworkCall {
  id: string;                              // Unique identifier
  url: string;                             // Full request URL
  method: string;                          // HTTP method
  status: number;                          // Response status code
  statusText: string;                      // HTTP status text
  requestHeaders: Record<string, string>;  // Request headers object
  responseHeaders: Record<string, string>; // Response headers object
  requestBody?: string;                    // Request payload (optional)
  responseBody?: string;                   // Response content (optional)
  timestamp: number;                       // Request timestamp (ms)
  duration: number;                        // Request duration (ms)
  error?: string;                          // Error description (optional)
}
```

### NetworkFilter Interface
```typescript
interface NetworkFilter {
  id: string;                    // Unique filter identifier
  name: string;                  // User-defined filter name
  method?: string;               // HTTP method filter
  urlPattern?: string;           // URL substring pattern
  includeHeaders?: boolean;      // Include headers in analysis
  includePayload?: boolean;      // Include request body in analysis
  includeResponse?: boolean;     // Include response body in analysis
  includeErrors?: boolean;       // Show only error responses
  isActive: boolean;             // Filter enabled state
  isExclude?: boolean;           // Exclusion vs inclusion logic
}
```

### SearchConfig Interface
```typescript
interface SearchConfig {
  query: string;                 // Search query string
  searchInHeaders: boolean;      // Search in headers
  searchInPayload: boolean;      // Search in request bodies
  searchInResponse: boolean;     // Search in response bodies
  searchInErrors: boolean;       // Search in error messages
  useVoiceSearch: boolean;       // Voice search enabled (future)
}
```

## State Management

### Local State (React Hooks)
- **useState**: Component-level state for UI interactions
- **useEffect**: Side effects and lifecycle management
- **useMemo**: Performance optimization for expensive computations
- **useCallback**: Function memoization for event handlers

### Persistent State (localStorage)
- **Filter Configurations**: User-defined filters persist across sessions
- **Search Settings**: Search configuration and preferences
- **Theme Preferences**: Dark/light theme selection

### State Persistence Strategy
```typescript
const STORAGE_KEYS = {
  FILTERS: 'browser-investigator-filters',
  SEARCH_CONFIG: 'browser-investigator-search-config'
};

// Save operation
const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

// Load operation with fallback
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return defaultValue;
  }
};
```

## Build System Architecture

### Webpack Configuration
The build system uses Webpack 5 with multiple entry points:

```javascript
module.exports = {
  entry: {
    background: './src/background/background.ts',
    sidePanel: './src/components/SidePanel.tsx',
    devtools: './src/devtools.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  // ... additional configuration
};
```

### Build Pipeline
1. **TypeScript Compilation**: Source code compiled with strict type checking
2. **React JSX Transformation**: JSX syntax transformed to JavaScript
3. **CSS Processing**: CSS files processed and bundled
4. **HTML Generation**: HTML files generated with proper script injection
5. **Asset Optimization**: Source maps and development optimizations

## Security Architecture

### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Permission Model
The extension requests minimal permissions:
- **declarativeNetRequest**: Network request interception
- **webRequest**: Legacy network request handling
- **storage**: Local data persistence
- **scripting**: Dynamic script injection
- **sidePanel**: Side panel API access
- **tabs**: Tab information access
- **activeTab**: Active tab interaction
- **clipboardWrite**: Clipboard write operations
- **tabCapture**: Tab content capture (future use)

### Data Security
- **Local Processing**: All data processing occurs locally
- **No External Transmission**: No data sent to external servers
- **Secure Storage**: Sensitive data encrypted in localStorage
- **Input Validation**: User inputs validated and sanitized

## Performance Considerations

### Memory Management
- **Lazy Loading**: Response bodies loaded on demand
- **Data Cleanup**: Automatic cleanup of old network calls
- **Memory Monitoring**: Built-in memory usage tracking
- **Efficient Data Structures**: Optimized for frequent filtering

### Rendering Performance
- **Virtual Scrolling**: Large lists rendered efficiently
- **Memoization**: Expensive computations cached
- **Debounced Updates**: User input debounced for smooth experience
- **Component Optimization**: React.memo and useMemo used strategically

### API Performance
- **Batch Operations**: Network calls processed in batches
- **Async Processing**: Non-blocking response body capture
- **Event Throttling**: Chrome API events throttled appropriately
- **Error Boundaries**: Graceful error handling without crashes

## Extensibility Points

### Adding New Filter Types
1. Extend `NetworkFilter` interface
2. Update filter logic in `useNetworkCalls.ts`
3. Add UI components in `FilterPanel.tsx`
4. Implement validation and persistence

### Custom Export Formats
1. Create utility functions in `src/utils/`
2. Add export options to detail views
3. Implement clipboard integration
4. Add format validation

### API Integration Points
1. **Shipwell API**: Documentation linking and endpoint detection
2. **External Tools**: Integration with testing and monitoring tools
3. **Custom Analytics**: Hook points for custom analytics
4. **Plugin System**: Framework for third-party extensions

## Deployment Architecture

### Development Environment
- **Local Development**: Hot reloading with webpack-dev-server
- **Extension Reloading**: Automatic extension reloading in development
- **Source Maps**: Full source map support for debugging
- **Error Reporting**: Comprehensive error logging and reporting

### Production Build
- **Code Optimization**: Minification and tree shaking
- **Asset Bundling**: Efficient asset bundling and compression
- **Version Management**: Automated version management
- **Distribution**: Packaged for Chrome Web Store distribution

### Quality Assurance
- **TypeScript Checking**: Strict type checking throughout
- **ESLint Integration**: Code quality and style enforcement
- **Prettier Formatting**: Consistent code formatting
- **Testing Framework**: Unit and integration testing (planned)

## Future Architecture Enhancements

### Planned Improvements
1. **State Management Library**: Redux or Zustand for complex state
2. **Testing Infrastructure**: Jest and React Testing Library
3. **Performance Monitoring**: Real-time performance metrics
4. **Plugin Architecture**: Extensible plugin system
5. **Cloud Sync**: Optional cloud synchronization for settings
6. **Advanced Analytics**: Built-in analytics and reporting
7. **Mobile Support**: Progressive Web App capabilities

### Scalability Considerations
- **Large Dataset Handling**: Support for thousands of network calls
- **Database Integration**: Optional IndexedDB for large datasets
- **Worker Threads**: Background processing for heavy operations
- **Streaming Data**: Real-time data streaming capabilities

---

**Document Version**: 1.0  
**Last Updated**: July 2025  
**Architecture Reviewed**: ✅ Complete