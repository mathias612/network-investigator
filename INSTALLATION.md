# Network Investigator - Installation Guide

## Prerequisites
- Chrome or Edge browser
- Node.js and npm (for development)

## Installation Steps

### For Development
1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```

### Loading the Extension

1. Open Chrome/Edge and navigate to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)

2. Enable "Developer mode" (toggle in the top right)

3. Click "Load unpacked" and select the project folder

4. The extension should now appear in your extensions list

### Using the Extension

1. Open any website
2. Open Developer Tools (F12)
3. Look for a new tab called "Network Investigator" in the DevTools panel
4. Navigate around the website to see network calls being captured
5. Use the filters and search functionality to investigate API calls

## Features Available

- **Network Call Capture**: Automatically captures all network requests
- **Filtering**: Filter by HTTP method, URL patterns, and more
- **Search**: Search across headers, payload, and response data
- **Copy as cURL**: Copy any request as a cURL command
- **Detailed View**: Click on any call to see full request/response details

## Development

To make changes:
1. Edit the source files in `src/`
2. Run `npm run build` to rebuild
3. Refresh the extension in `chrome://extensions/`

## Troubleshooting

### Extension Not Loading
- Ensure you selected the root folder (containing manifest.json)
- Check the extension errors in `chrome://extensions/`
- Verify all files are built in the `dist/` folder

### DevTools Panel Not Appearing
- Refresh the DevTools (F12 to close, F12 to reopen)
- Check browser console for errors
- Ensure you're running the latest Chrome/Edge version

### Network Calls Not Captured
- The extension only captures calls made AFTER opening the DevTools panel
- Navigate to a page or trigger API calls to see them appear
- Make sure you're not on chrome:// or extension:// pages
- Check if the page has actual network activity

### Debug Information
Open the browser console in the DevTools panel to see debug logs:
- Extension loading status
- DevTools API availability  
- Network call capture events

### Common Issues
- **Empty panel**: Network calls only appear after navigating or refreshing the page
- **No debug logs**: Extension may not be properly loaded
- **DevTools API errors**: Browser may not support the required APIs 