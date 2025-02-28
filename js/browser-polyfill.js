/**
 * Browser API compatibility layer
 * Provides a unified API that works in both Chrome and Firefox
 */

const browserAPI = (() => {
  // Determine if we're in Firefox (browser object) or Chrome (chrome object)
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  return {
    // Runtime API
    runtime: {
      sendMessage: (message) => {
        return api.runtime.sendMessage(message);
      },
      onMessage: {
        addListener: (callback) => {
          api.runtime.onMessage.addListener(callback);
        }
      }
    },
    
    // Tabs API
    tabs: {
      executeScript: (tabId, details) => {
        if (typeof browser !== 'undefined') {
          // Firefox requires the tabId parameter
          return browser.tabs.executeScript(tabId, details);
        } else {
          // Chrome can work with an object directly
          return chrome.tabs.executeScript(details);
        }
      },
      query: (queryInfo, callback) => {
        if (typeof browser !== 'undefined') {
          // Firefox uses promises
          return browser.tabs.query(queryInfo).then(callback);
        } else {
          // Chrome uses callbacks
          return chrome.tabs.query(queryInfo, callback);
        }
      },
      getCurrent: (callback) => {
        if (typeof browser !== 'undefined') {
          return browser.tabs.getCurrent().then(callback);
        } else {
          return chrome.tabs.getCurrent(callback);
        }
      },
      update: (tabId, updateProperties) => {
        return api.tabs.update(tabId, updateProperties);
      }
    },
    
    // Extension API
    extension: {
      getURL: (path) => {
        return api.runtime.getURL(path);
      }
    },
    
    // Scripting API (for MV3)
    scripting: {
      executeScript: (args) => {
        if (typeof browser !== 'undefined') {
          // Firefox might still use tabs.executeScript
          if (browser.scripting) {
            return browser.scripting.executeScript(args);
          } else {
            const { target, files, func } = args;
            return browser.tabs.executeScript(target.tabId, { file: files ? files[0] : null, code: func ? func.toString() : null });
          }
        } else {
          return chrome.scripting.executeScript(args);
        }
      }
    },
    
    // Detect browser type
    isFirefox: () => {
      return typeof browser !== 'undefined';
    },
    
    isChrome: () => {
      return typeof chrome !== 'undefined' && typeof browser === 'undefined';
    }
  };
})();

// Make it available globally
window.browserAPI = browserAPI;