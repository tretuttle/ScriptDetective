# ScriptDetective - Cross-Browser Version

## Migration to Manifest V3 and Cross-Browser Support

This project has been updated to:
1. Add support for Chrome's Manifest V3
2. Make the extension browser-agnostic to work with Firefox

## Project Structure

The updated project contains the following key files:

### Manifest Files
- `manifest-v3.json` - Manifest V3 for Chrome/Edge/Opera (current Chrome standard)
- `manifest-firefox.json` - Firefox-compatible manifest

### JavaScript Files
- `js/browser-polyfill.js` - Browser compatibility layer that normalizes API differences
- `js/background-v3.js` - Service worker for Manifest V3
- `js/contentscript-v3.js` - Updated content script with browser-agnostic API calls
- `js/popup-v3.js` - Updated popup script with browser-agnostic API calls
- `js/scriptrecordhelper-v3.js` - Helper script for NetSuite page interaction

### HTML Files
- `popup-v3.html` - Updated popup with browser-agnostic scripts loaded

## Building for Different Browsers

### For Chrome/Edge/Opera (Manifest V3)
1. Copy `manifest-v3.json` to `manifest.json`
2. Use the V3 versions of all scripts
3. Use `popup-v3.html` as your popup

### For Firefox
1. Copy `manifest-firefox.json` to `manifest.json`
2. Use the V3 versions of all scripts
3. Use `popup-v3.html` as your popup

## Key Changes

1. **Browser API Polyfill**: Added a compatibility layer to handle differences between Chrome and Firefox WebExtension APIs
2. **Manifest V3 Service Worker**: Replaced background page with non-persistent service worker
3. **Execution Context**: Updated script execution to use the new scripting API in MV3
4. **Permission Model**: Updated permissions to match MV3 requirements
5. **Resource Access**: Updated web_accessible_resources format for MV3

## Testing Instructions

When testing in different browsers:

1. **Chrome**: Load the extension using the Manifest V3 version
2. **Firefox**: Load the extension using the Firefox manifest version
3. **NetSuite Access**: Make sure to test with appropriate NetSuite permissions

## Remaining Limitations

1. Firefox has some limitations compared to Chrome regarding injected scripts and execution contexts
2. Some NetSuite-specific features might behave differently between browsers due to DOM handling differences

## Development Recommendations

1. Always test changes in both Chrome and Firefox
2. Use the browser-agnostic API for any browser interaction
3. Keep the compatibility layer updated as browser APIs evolve