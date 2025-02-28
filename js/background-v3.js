// Service worker for Manifest V3
// This replaces the background.js script

// Listen for when the extension is installed or updated
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  // Clear any previous state if needed
});

// Define the conditions for when to show the action button
const showActionForNetSuite = () => {
  // In MV3, we need to use declarativeNetRequest or just activate based on URL patterns
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the URL matches NetSuite pattern
    if (tab.url && tab.url.includes('.netsuite.com/app/')) {
      // Enable the action button for this tab
      chrome.action.enable(tabId);
    } else {
      // Disable it for non-NetSuite tabs
      chrome.action.disable(tabId);
    }
  });
};

// Initialize on worker start
showActionForNetSuite();

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle any messages as needed
  return true; // Keep the message channel open for async responses
});