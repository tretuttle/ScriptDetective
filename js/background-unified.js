/**
 * Universal background script that works in both Chrome and Firefox
 */

// Detect browser type
const isFirefox = typeof browser !== 'undefined' && browser.runtime.getBrowserInfo !== undefined;

// Use the browser namespace for cross-browser compatibility
// The polyfill ensures this works in Chrome too
const browserAPI = browser;

// After installation
browserAPI.runtime.onInstalled.addListener(() => {
  console.log("ScriptDetective installed - running in " + (isFirefox ? "Firefox" : "Chrome"));
});

// Show the action icon only on NetSuite pages
const showActionForNetSuite = () => {
  browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url && tab.url.includes('.netsuite.com/app/')) {
      // Different APIs for enabling page action in different browsers
      if (isFirefox) {
        browserAPI.pageAction?.show?.(tabId);
      } else {
        browserAPI.action?.enable?.(tabId);
      }
    } else {
      if (isFirefox) {
        browserAPI.pageAction?.hide?.(tabId);
      } else {
        browserAPI.action?.disable?.(tabId);
      }
    }
  });
};

// Initialize
showActionForNetSuite();

// Listen for messages from content scripts
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Log with browser type to help with debugging
  console.log(`[ScriptDetective ${isFirefox ? "Firefox" : "Chrome"}] Received message:`, message.type);
  
  // Keep the message channel open for async responses
  return true;
});