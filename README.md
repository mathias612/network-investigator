# Network Investigator

## Overview

Network Investigator is a Chrome/Edge extension that provides advanced network traffic analysis capabilities for developers and security professionals. It extends browser DevTools with sophisticated filtering, searching, and analysis features for HTTP/HTTPS requests and responses.

### Purpose
This tool helps engineers and security analysts investigate web application behavior by providing:
- Real-time network traffic capture and analysis
- Advanced filtering and search capabilities across request/response data
- UUID detection and management
- Export functionality for further analysis
- Integration with API documentation systems

## Core Capabilities

### 🔍 Network Traffic Analysis
- **Real-time Capture**: Automatically captures all HTTP/HTTPS requests using Chrome DevTools APIs
- **Comprehensive Data**: Captures headers, payloads, responses, timing information, and error states
- **Persistent Storage**: Maintains filter configurations and search settings across sessions

### 🎯 Advanced Filtering System
- **Multi-criteria Filtering**: Filter by HTTP method, URL patterns, headers, payloads, responses, and errors
- **Include/Exclude Logic**: Support for both positive and negative filtering rules
- **Filter Management**: Create, edit, delete, and toggle filters with persistent storage
- **Real-time Application**: Filters applied instantly as network traffic flows

### 🔎 Intelligent Search
- **Multi-target Search**: Search across headers, request payloads, response bodies, and error messages
- **Case-insensitive Matching**: Flexible text matching across all captured data
- **Configurable Scope**: Enable/disable search in specific data categories
- **Real-time Results**: Search results update as you type with debouncing

### 🔗 UUID Detection & Management
- **Automatic Detection**: Identifies UUIDs in URLs and request data
- **One-click Copy**: Click any detected UUID to copy to clipboard
- **Visual Highlighting**: UUIDs are visually distinguished in the interface
- **Validation**: Proper UUID format validation and handling

### 📤 Export & Integration
- **cURL Export**: Convert any request to a cURL command for testing
- **JSON Export**: Export request/response data in structured format
- **Clipboard Integration**: One-click copying of various data formats
- **API Documentation Links**: Integration points for external documentation systems

## Technical Architecture

### Core Technologies
- **Frontend**: React 18 + TypeScript for robust UI development
- **Build System**: Webpack 5 with TypeScript loader and CSS processing
- **Browser APIs**: Chrome DevTools Network API, Storage API, Clipboard API
- **State Management**: React hooks with localStorage persistence
- **Styling**: CSS modules with theme support

### Extension Architecture

```
Browser Extension
├── DevTools Panel (Primary Interface)
│   ├── Network Traffic Capture
│   ├── Filter Management
│   ├── Search Interface
│   └── Export Functions
├── Side Panel (Secondary Interface)
│   └── Simplified View
├── Background Script (Service Worker)
│   └── Extension Lifecycle Management
└── Content Scripts
    └── (None - uses DevTools APIs)
```

### Data Flow Architecture

```
Chrome DevTools Network API
    ↓ (Real-time events)
useNetworkCalls Hook
    ↓ (State management)
Filter Engine → Search Engine
    ↓ (Processed data)
React Components
    ↓ (User interactions)
Local Storage (Persistence)
```

### Key Components

#### `useNetworkCalls` Hook (`src/hooks/useNetworkCalls.ts`)
- **Purpose**: Central state management for network data and user configurations
- **Responsibilities**:
  - Network traffic capture via `chrome.devtools.network.onRequestFinished`
  - Filter application and management
  - Search functionality implementation
  - localStorage persistence for user settings
  - Real-time data processing and memoization

#### Filter System (`src/types/index.d.ts`)
```typescript
interface NetworkFilter {
  id: string;
  name: string;
  method?: string;          // HTTP method filter
  urlPattern?: string;      // URL substring matching
  includeHeaders?: boolean; // Include header data in analysis
  includePayload?: boolean; // Include request body in analysis
  includeResponse?: boolean;// Include response body in analysis
  includeErrors?: boolean;  // Include only error responses
  isActive: boolean;        // Filter enabled state
  isExclude?: boolean;      // Exclusion vs inclusion logic
}
```

#### Network Data Model (`src/types/index.d.ts`)
```typescript
interface NetworkCall {
  id: string;                              // Unique identifier
  url: string;                             // Request URL
  method: string;                          // HTTP method
  status: number;                          // Response status code
  statusText: string;                      // Status text
  requestHeaders: Record<string, string>;  // Request headers
  responseHeaders: Record<string, string>; // Response headers
  requestBody?: string;                    // Request payload
  responseBody?: string;                   // Response content
  timestamp: number;                       // Request timestamp
  duration: number;                        // Request duration (ms)
  error?: string;                          // Error information
}
```

### Build System Configuration

The project uses Webpack 5 with multiple entry points:
- **DevTools Panel**: Main interface loaded in Chrome DevTools
- **Side Panel**: Alternative interface for Chrome's side panel API
- **Background Script**: Service worker for extension lifecycle

### Security Considerations

- **Content Security Policy**: Strict CSP prevents XSS attacks
- **Minimal Permissions**: Only requests necessary browser permissions
- **Data Isolation**: All data processing happens locally within the extension
- **No External Requests**: No data transmitted to external services

## Project Structure

```
src/
├── background/
│   └── background.ts           # Service worker (minimal logic)
├── components/
│   ├── ErrorBoundary.tsx       # React error handling
│   ├── FilterPanel.tsx         # Filter management UI
│   ├── JsonViewer.tsx          # JSON response viewer
│   ├── NetworkCallList.tsx     # Network traffic list
│   ├── NetworkDetailTabs.tsx   # Detailed call view
│   ├── SafeNetworkDetailTabs.tsx # Error-safe detail view
│   ├── SidePanel.tsx           # Main application component
│   ├── SimpleNetworkDetails.tsx # Simplified detail view
│   └── ThemeToggle.tsx         # Dark/light theme toggle
├── contexts/
│   └── ThemeContext.tsx        # Theme state management
├── hooks/
│   └── useNetworkCalls.ts      # Core data management hook
├── services/
│   └── shipwellApi.ts          # API documentation integration
├── styles/
│   └── global.css              # Global styling
├── types/
│   ├── chrome.d.ts             # Chrome API type definitions
│   └── index.d.ts              # Core application types
├── utils/
│   └── uuid.ts                 # UUID detection utilities
├── debug.ts                    # Debug logging utilities
├── devtools.ts                 # DevTools panel registration
└── extension/
    └── index.ts                # Extension entry point
```

## Installation & Development

### Prerequisites
- Node.js 16+ and npm
- Chrome or Edge browser
- TypeScript knowledge for development

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd network-investigator

# Install dependencies
npm install

# Build the extension
npm run build

# For development (watch mode)
npm run start
```

### Loading the Extension
1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project directory
4. Open DevTools (F12) and look for "Network Investigator" tab

### Development Commands
- `npm run build`: Production build
- `npm run start`: Development build with watch mode
- `npm run lint`: ESLint code analysis
- `npm run format`: Prettier code formatting

## Maintenance Guide for Engineers

### Understanding the Codebase

#### Entry Points
1. **DevTools Panel**: `src/devtools.ts` → `src/components/SidePanel.tsx`
2. **Background Script**: `src/background/background.ts` (minimal)
3. **Build Configuration**: `webpack.config.js`

#### Critical Dependencies
- **React/ReactDOM**: UI framework
- **TypeScript**: Type safety and development experience
- **Webpack**: Build system and bundling
- **Chrome Extension APIs**: Core functionality

#### Key Debugging Tools
- **Debug Logging**: Comprehensive console logging throughout the application
- **Error Boundaries**: React error boundaries prevent UI crashes
- **DevTools Error Handling**: Graceful degradation when DevTools APIs unavailable

### Common Maintenance Tasks

#### Adding New Filter Types
1. Update `NetworkFilter` interface in `src/types/index.d.ts`
2. Modify filter logic in `useNetworkCalls.ts` (line 135-215)
3. Update `FilterPanel.tsx` UI components
4. Test with various network scenarios

#### Extending Search Capabilities
1. Modify `SearchConfig` interface in `src/types/index.d.ts`
2. Update search logic in `useNetworkCalls.ts` (line 201-214)
3. Add UI controls in relevant components
4. Consider performance implications for large datasets

#### Adding New Export Formats
1. Create utility functions in `src/utils/`
2. Add export buttons to detail view components
3. Implement clipboard integration
4. Test with various data types and sizes

### Performance Considerations

#### Memory Management
- **Large Datasets**: The extension stores all captured network calls in memory
- **Cleanup**: Implement periodic cleanup for old network calls
- **Filtering**: Filters are applied in real-time using React useMemo

#### Browser API Limitations
- **DevTools API**: Only available when DevTools is open
- **Content Scripts**: Not used to minimize performance impact
- **Storage API**: localStorage used for persistence (has size limits)

### Troubleshooting Common Issues

#### Extension Not Loading
1. Check `manifest.json` syntax
2. Verify all files are present in `dist/` after build
3. Check Chrome extension errors in `chrome://extensions/`

#### Network Calls Not Captured
1. Ensure DevTools is open when visiting pages
2. Verify Chrome DevTools Network API availability
3. Check console for API availability errors
4. Test on different types of websites (not chrome:// pages)

#### Performance Issues
1. Monitor memory usage with large numbers of calls
2. Implement call limit or auto-cleanup
3. Consider pagination for large datasets
4. Profile React re-renders with React DevTools

### Security Maintenance

#### Regular Security Reviews
- **Dependencies**: Regularly update npm dependencies
- **Permissions**: Minimize requested browser permissions
- **CSP**: Maintain strict Content Security Policy
- **Data Handling**: Ensure no sensitive data logging

#### Code Review Checklist
- No hardcoded secrets or API keys
- Proper input validation for user-generated filters
- Safe handling of network response data
- No eval() or other dangerous JavaScript patterns

### Future Enhancement Areas

#### Planned Features (from PROGRESS.md)
1. **Voice Search**: Web Speech API integration for hands-free search
2. **Shipwell API Integration**: Complete API documentation linking
3. **Performance Optimization**: Handle thousands of network calls efficiently
4. **Export Enhancements**: Additional export formats (HAR, CSV)

#### Technical Debt
1. **Type Safety**: Eliminate @ts-ignore comments where possible
2. **Error Handling**: More comprehensive error boundaries and fallbacks
3. **Testing**: Add unit and integration tests
4. **Code Organization**: Consider state management library for complex state

---

## Development Status

The Browser Investigator is currently **functional and ready for production use** with the core features implemented. See `PROGRESS.md` for detailed development status and `INSTALLATION.md` for setup instructions.

**Last Updated**: July 2025 