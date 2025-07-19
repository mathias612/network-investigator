# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run start` - Development build with watch mode (webpack --mode development --watch)
- `npm run build` - Production build (webpack --mode production)
- `npm run lint` - ESLint code analysis (eslint src --ext .ts,.tsx)
- `npm run format` - Prettier code formatting (prettier --write src)

### Extension Loading
After building, load the extension in Chrome/Edge:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project directory
4. Open DevTools (F12) and look for "Network Investigator" tab

## Architecture Overview

This is a Chrome/Edge browser extension for network traffic analysis built with React 18 + TypeScript. The extension provides enhanced DevTools capabilities for inspecting HTTP/HTTPS requests and responses.

### Key Architecture Components

**Extension Structure:**
- **DevTools Panel**: Primary interface (`src/devtools.ts` → `src/components/SidePanel.tsx`)
- **Background Script**: Service worker for extension lifecycle (`src/background/background.ts`)
- **Side Panel**: Alternative interface using Chrome's side panel API

**Core Data Flow:**
```
Chrome DevTools Network API → useNetworkCalls Hook → React Components → localStorage
```

### Central State Management

The `useNetworkCalls` hook (`src/hooks/useNetworkCalls.ts`) is the core of the application:
- Captures network traffic via `chrome.devtools.network.onRequestFinished`
- Manages filtering, searching, and data persistence
- Handles asynchronous response body capture
- Implements real-time filtering with performance optimizations

### Data Models

**NetworkCall Interface** (`src/types/index.d.ts`):
- Complete request/response data including headers, bodies, timing
- Automatic error detection for 4xx/5xx responses
- UUID detection and management

**NetworkFilter Interface**:
- Multi-criteria filtering (method, URL pattern, content types)
- Include/exclude logic with persistent storage
- Real-time filter application

### Build System

Webpack 5 configuration with multiple entry points:
- `background`: Service worker bundle
- `sidePanel`: Main React application
- `devtools`: DevTools panel registration

### Performance Considerations

- Uses React.useMemo for expensive filtering operations
- Debounced localStorage saves (300ms)
- Lazy loading of response bodies
- Efficient data structures for frequent filtering

### Extension-Specific Notes

- DevTools API only available when DevTools is open
- Extension requires `chrome://extensions/` and "Developer mode" for local development
- Uses strict Content Security Policy (CSP)
- All data processing is local - no external requests

### Testing and Debugging

- Comprehensive console logging throughout with `[Browser Investigator]` prefix
- Error boundaries prevent UI crashes
- Graceful degradation when Chrome APIs are unavailable
- Built-in DevTools error handling

### Code Conventions

- TypeScript with strict mode enabled
- React functional components with hooks
- CSS modules for styling
- ESLint + Prettier for code quality
- Comprehensive error handling and logging