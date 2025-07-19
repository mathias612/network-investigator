# Network Investigator - Maintenance Guide

## Overview

This guide provides comprehensive maintenance instructions for engineers working on the Network Investigator extension. It covers routine maintenance tasks, troubleshooting procedures, performance optimization, and development workflows.

## Quick Reference

### Essential Commands
```bash
npm install          # Install dependencies
npm run build       # Production build
npm run start       # Development build with watch
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
```

### Key Files
- **Entry Point**: `src/components/SidePanel.tsx`
- **Core Logic**: `src/hooks/useNetworkCalls.ts`
- **Types**: `src/types/index.d.ts`
- **Build Config**: `webpack.config.js`
- **Extension Manifest**: `manifest.json`

### Debug URLs
- Chrome Extensions: `chrome://extensions/`
- Extension Errors: Check "Errors" in extension details
- DevTools Console: F12 → Console tab

## Development Environment Setup

### Prerequisites
- **Node.js**: Version 16 or higher
- **npm**: Version 8 or higher
- **Chrome/Edge**: Latest version
- **IDE**: VSCode recommended with TypeScript extension

### Initial Setup
```bash
# Clone and setup
git clone <repository-url>
cd network-investigator
npm install

# Verify build works
npm run build

# Load extension in browser
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the project directory
```

### Development Workflow
```bash
# Start development server
npm run start

# Make code changes
# Extension auto-reloads in development mode

# Test changes
# 1. Open DevTools (F12)
# 2. Look for "Network Investigator" tab
# 3. Navigate to test pages
# 4. Verify network capture works

# Before committing
npm run lint
npm run format
npm run build
```

## Core Components Maintenance

### 1. Network Capture System (`useNetworkCalls.ts`)

**Maintenance Tasks:**
- Monitor memory usage with large network datasets
- Update Chrome API compatibility as browser APIs evolve
- Optimize filter performance for large datasets

**Key Areas to Monitor:**
```typescript
// Network event listener - ensure proper cleanup
useEffect(() => {
  const listener = (request: any) => {
    // Process network call
  };
  chrome.devtools.network.onRequestFinished.addListener(listener);
  return () => {
    chrome.devtools.network.onRequestFinished.removeListener(listener);
  };
}, []);

// Memory management - consider cleanup for large datasets
const [networkCalls, setNetworkCalls] = useState<NetworkCall[]>([]);
```

**Performance Optimization:**
- Add call limit (e.g., keep only last 1000 calls)
- Implement pagination for large datasets
- Use React.memo for expensive components
- Monitor filter computation performance

**Common Issues:**
```typescript
// DevTools API not available
if (!chrome.devtools || !chrome.devtools.network) {
  setDevtoolsError('This panel must be opened from Chrome/Edge DevTools.');
  return;
}

// Response body capture failures
if (typeof request.getContent === 'function') {
  request.getContent((content: string, encoding: string) => {
    // Handle encoding issues and large responses
    call.responseBody = content;
  });
}
```

### 2. Filter System Maintenance

**Filter Logic Location**: `useNetworkCalls.ts` lines 135-215

**Maintenance Tasks:**
- Test filter combinations thoroughly
- Validate filter serialization/deserialization
- Monitor filter performance with complex rules

**Adding New Filter Types:**
```typescript
// 1. Update NetworkFilter interface
interface NetworkFilter {
  // ... existing fields
  newFilterType?: string;  // Add new filter field
}

// 2. Update filter logic
const filteredCalls = useMemo(() => {
  let result = networkCalls;
  const activeFilters = filters.filter(f => f.isActive);
  
  if (activeFilters.length > 0) {
    result = result.filter(call => {
      return activeFilters.some(filter => {
        let matches = true;
        
        // ... existing filter logic
        
        // Add new filter logic
        if (filter.newFilterType && filter.newFilterType !== '') {
          matches = matches && someNewLogic(call, filter.newFilterType);
        }
        
        return matches;
      });
    });
  }
  
  return result;
}, [networkCalls, filters, searchConfig]);

// 3. Update FilterPanel.tsx UI
// Add new filter input controls
// Add validation and user feedback
```

### 3. Search System Maintenance

**Search Logic Location**: `useNetworkCalls.ts` lines 201-214

**Performance Considerations:**
- Search is case-insensitive and real-time
- Large response bodies can slow search
- Consider implementing search indexing for better performance

**Optimization Strategies:**
```typescript
// Implement search debouncing (already implemented)
// Consider search result caching
// Add search result highlighting
// Implement regex search support

// Memory-efficient search implementation
const searchableText = useMemo(() => {
  return [
    searchConfig.searchInHeaders ? JSON.stringify(call.requestHeaders) : '',
    searchConfig.searchInPayload ? call.requestBody || '' : '',
    searchConfig.searchInResponse ? call.responseBody || '' : '',
    call.url
  ].join(' ').toLowerCase();
}, [call, searchConfig]);
```

### 4. UUID Detection Maintenance

**UUID Detection Location**: `src/utils/uuid.ts`

**Maintenance Tasks:**
- Update UUID regex patterns as standards evolve
- Test with various UUID formats
- Optimize detection performance

**Current Implementation:**
```typescript
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

// Test with various UUID formats
const testUUIDs = [
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',  // Valid UUID v4
  'F47AC10B-58CC-4372-A567-0E02B2C3D479',  // Uppercase
  '123e4567-e89b-12d3-a456-426614174000',  // Valid UUID v1
];
```

## Build System Maintenance

### Webpack Configuration (`webpack.config.js`)

**Regular Maintenance:**
- Update Webpack and loader versions
- Monitor bundle size and performance
- Update TypeScript and React versions

**Common Updates:**
```javascript
// Update dependencies
"webpack": "^5.88.0",           // Latest Webpack
"typescript": "^5.1.0",         // Latest TypeScript
"react": "^18.2.0",            // Latest React

// Monitor bundle analysis
npm install --save-dev webpack-bundle-analyzer
// Add to webpack config for bundle analysis
```

**Performance Monitoring:**
```bash
# Analyze bundle size
npx webpack-bundle-analyzer dist/main.js

# Build performance
npm run build -- --profile

# Development server performance
npm run start -- --progress
```

### Package Dependencies

**Critical Dependencies:**
```json
{
  "dependencies": {
    "react": "^18.0.0",           // UI framework
    "react-dom": "^18.0.0"       // DOM rendering
  },
  "devDependencies": {
    "typescript": "^5.0.0",       // Type system
    "webpack": "^5.0.0",          // Build system
    "ts-loader": "^9.0.0",        // TypeScript loader
    "@types/react": "^18.0.0"     // React types
  }
}
```

**Dependency Update Strategy:**
```bash
# Check for updates
npm outdated

# Update minor versions
npm update

# Update major versions (careful testing required)
npm install react@latest
npm install typescript@latest

# Test after major updates
npm run build
npm run lint
```

## Browser Compatibility Maintenance

### Chrome Extension APIs

**API Compatibility Matrix:**
- **Manifest V3**: Required for new Chrome versions
- **DevTools API**: Stable across versions
- **Storage API**: Stable
- **Clipboard API**: Requires secure context

**Testing Strategy:**
```typescript
// Check API availability
const checkBrowserSupport = () => {
  const checks = {
    devtools: !!(chrome.devtools?.network?.onRequestFinished),
    storage: !!(chrome.storage?.local),
    clipboard: !!(navigator.clipboard?.writeText),
    sidePanel: !!(chrome.sidePanel)
  };
  
  console.log('Browser API Support:', checks);
  return checks;
};
```

**Version Compatibility:**
- **Chrome**: 88+ (Manifest V3 required)
- **Edge**: 88+ (Chromium-based)
- **Firefox**: Not supported (different extension API)

## Performance Monitoring

### Memory Management

**Monitor Memory Usage:**
```typescript
// Add memory monitoring
const monitorMemory = () => {
  if (performance.memory) {
    console.log('Memory Usage:', {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    });
  }
};

// Call periodically in development
setInterval(monitorMemory, 30000);
```

**Memory Optimization Strategies:**
- Implement call cleanup after 1000+ calls
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Clear response bodies for old calls

### Performance Metrics

**Key Metrics to Monitor:**
- Network call capture latency
- Filter application performance
- Search response time
- UI render performance
- Memory usage growth

**Performance Testing:**
```typescript
// Measure filter performance
const measureFilterPerformance = () => {
  const start = performance.now();
  const result = applyFilters(networkCalls, filters);
  const end = performance.now();
  
  console.log(`Filter processing took ${end - start} milliseconds`);
  
  if (end - start > 100) {
    console.warn('Filter performance degraded');
  }
  
  return result;
};
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Extension Not Loading
**Symptoms:**
- Extension not visible in chrome://extensions/
- DevTools panel not appearing

**Solutions:**
```bash
# Check manifest syntax
npm run build
# Look for webpack errors

# Check file structure
ls -la dist/
# Ensure all files are built

# Check Chrome console
# Open chrome://extensions/
# Check "Errors" button for specific extension
```

#### 2. Network Calls Not Captured
**Symptoms:**
- Empty network call list
- DevTools panel shows no activity

**Diagnostics:**
```typescript
// Check DevTools API availability
console.log('Chrome DevTools:', {
  available: !!chrome.devtools,
  network: !!chrome.devtools?.network,
  listener: !!chrome.devtools?.network?.onRequestFinished
});

// Check for API errors
chrome.devtools.network.onRequestFinished.addListener((request) => {
  console.log('Network event received:', request);
});
```

**Solutions:**
- Ensure DevTools is open before navigation
- Test on regular websites (not chrome:// pages)
- Check browser version compatibility
- Verify extension permissions

#### 3. Filter/Search Performance Issues
**Symptoms:**
- UI becomes unresponsive
- High CPU usage
- Search takes too long

**Solutions:**
```typescript
// Add performance monitoring
const optimizeFilters = () => {
  // Limit dataset size
  const MAX_CALLS = 1000;
  if (networkCalls.length > MAX_CALLS) {
    setNetworkCalls(calls => calls.slice(-MAX_CALLS));
  }
  
  // Debounce search
  const debouncedSearch = useMemo(
    () => debounce(setSearchQuery, 300),
    []
  );
  
  // Use React.memo for expensive components
  const MemoizedCallList = React.memo(NetworkCallList);
};
```

#### 4. Storage/Persistence Issues
**Symptoms:**
- Filters not persisting across sessions
- Settings reset on browser restart

**Diagnostics:**
```typescript
// Check localStorage availability
try {
  localStorage.setItem('test', 'value');
  localStorage.removeItem('test');
  console.log('localStorage available');
} catch (error) {
  console.error('localStorage not available:', error);
}

// Check storage usage
const usage = JSON.stringify(localStorage).length;
console.log('localStorage usage:', usage, 'bytes');
```

### Debug Tools and Logging

**Enable Debug Mode:**
```typescript
// Add to debug.ts
const DEBUG = process.env.NODE_ENV === 'development';

export const debug = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[Browser Investigator] ${message}`, data);
  }
};

// Use throughout application
debug('Network call captured', networkCall);
debug('Filter applied', { filter, resultCount });
```

**Chrome DevTools Integration:**
```typescript
// Add performance marks
performance.mark('filter-start');
// ... filter logic
performance.mark('filter-end');
performance.measure('filter-duration', 'filter-start', 'filter-end');

// Log to DevTools
console.time('search-operation');
// ... search logic
console.timeEnd('search-operation');
```

## Security Maintenance

### Regular Security Reviews

**Monthly Tasks:**
- Update all npm dependencies
- Review Chrome Web Store security policies
- Audit permissions usage
- Check for security vulnerabilities

**Security Checklist:**
```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Update dependencies
npm update
npm outdated

# Review permissions in manifest.json
# Ensure only necessary permissions are requested
```

**Code Security Patterns:**
```typescript
// Input validation
const validateFilterInput = (input: string): boolean => {
  // Prevent XSS and injection attacks
  const sanitized = input.replace(/<script.*?<\/script>/gi, '');
  return sanitized === input;
};

// Safe data handling
const safeJsonParse = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Invalid JSON:', error);
    return null;
  }
};

// Avoid eval and dangerous patterns
// Never use eval(), new Function(), or innerHTML
// Use textContent instead of innerHTML
// Validate all user inputs
```

## Testing Strategy

### Manual Testing Checklist

**Basic Functionality:**
- [ ] Extension loads without errors
- [ ] DevTools panel appears
- [ ] Network calls are captured
- [ ] Filters work correctly
- [ ] Search functions properly
- [ ] Export features work
- [ ] UI is responsive

**Browser Compatibility:**
- [ ] Chrome latest version
- [ ] Edge latest version
- [ ] Different screen sizes
- [ ] Different network conditions

**Performance Testing:**
- [ ] Test with 100+ network calls
- [ ] Test with large response bodies
- [ ] Test filter combinations
- [ ] Test search performance

### Automated Testing (Future)

**Unit Testing Setup:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Test Structure:**
```typescript
// __tests__/useNetworkCalls.test.ts
import { renderHook } from '@testing-library/react';
import { useNetworkCalls } from '../src/hooks/useNetworkCalls';

describe('useNetworkCalls', () => {
  test('should initialize with empty calls', () => {
    const { result } = renderHook(() => useNetworkCalls());
    expect(result.current.networkCalls).toEqual([]);
  });
  
  test('should add filter correctly', () => {
    const { result } = renderHook(() => useNetworkCalls());
    result.current.addFilter({
      name: 'Test Filter',
      method: 'GET'
    });
    expect(result.current.filters).toHaveLength(1);
  });
});
```

## Release Management

### Version Release Process

**Pre-release Checklist:**
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Browser compatibility verified

**Release Steps:**
```bash
# 1. Update version
npm version patch|minor|major

# 2. Build production version
npm run build

# 3. Test production build
# Load unpacked extension and test thoroughly

# 4. Create release package
zip -r browser-investigator-v1.0.0.zip \
  manifest.json \
  dist/ \
  sidePanel.html \
  devtools.html \
  README.md

# 5. Upload to Chrome Web Store
# Follow Chrome Web Store developer guidelines
```

**Version Numbering:**
- **Patch** (x.x.1): Bug fixes, minor improvements
- **Minor** (x.1.x): New features, backward compatible
- **Major** (1.x.x): Breaking changes, major updates

## Emergency Procedures

### Critical Issue Response

**High Severity Issues:**
- Extension crashes Chrome/Edge
- Data loss or corruption
- Security vulnerabilities
- Complete functionality failure

**Response Protocol:**
1. **Immediate**: Disable extension distribution if possible
2. **Investigation**: Identify root cause quickly
3. **Fix**: Implement minimal fix for critical issue
4. **Test**: Rapid testing of fix
5. **Deploy**: Emergency release with critical fix
6. **Follow-up**: Full investigation and comprehensive fix

**Emergency Hotfix Process:**
```bash
# Create hotfix branch
git checkout -b hotfix/critical-fix

# Make minimal changes to fix issue
# Focus only on the critical problem

# Test thoroughly
npm run build
# Test in browser

# Deploy immediately
npm version patch
# Follow emergency release process
```

## Documentation Maintenance

### Keeping Documentation Current

**Monthly Updates:**
- Update API compatibility information
- Review troubleshooting guide accuracy
- Update performance benchmarks
- Refresh screenshots and examples

**Documentation Sources:**
- `README.md`: Overview and quick start
- `ARCHITECTURE.md`: Technical architecture
- `MAINTENANCE.md`: This maintenance guide
- `INSTALLATION.md`: Installation instructions
- `PROGRESS.md`: Development progress

**Documentation Review Checklist:**
- [ ] All code examples work
- [ ] Screenshots are current
- [ ] Links are functional
- [ ] Instructions are accurate
- [ ] Version information is current

---

**Maintenance Guide Version**: 1.0  
**Last Updated**: July 2025  
**Next Review Due**: August 2025

**Emergency Contact**: Check repository issues for urgent problems  
**Documentation Issues**: Submit PRs for documentation improvements