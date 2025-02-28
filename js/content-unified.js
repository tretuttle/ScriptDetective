/**
 * Universal content script that works in both Chrome and Firefox
 */

// Detect the browser type
const isFirefox = typeof browser !== 'undefined' && browser.runtime.getBrowserInfo !== undefined;

// Use browser API with polyfill
const browserAPI = browser;

console.log(`ScriptDetective content script loaded in ${isFirefox ? "Firefox" : "Chrome"}`);

function injectHelperScript() {
  if (document.getElementById('netsuite-scripted-records')) {
    window.postMessage({type: 'getRecord'}, '*');
    return;
  }
  
  try {
    const script = document.createElement('script');
    script.id = 'netsuite-scripted-records';
    script.src = browserAPI.runtime.getURL('js/scriptrecordhelper-unified.js');
    document.head.appendChild(script);
    console.log('ScriptDetective helper script injected successfully');
  } catch (error) {
    console.error('ScriptDetective failed to inject helper script:', error);
  }
}

// Listen for messages from the injected script
window.addEventListener('message', (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) return;

  try {
    if (event.data.type === 'ready') {
      console.log('ScriptDetective helper is ready');
      window.postMessage({type: 'getRecord'}, '*');
    } else if (event.data.dest === 'extension') {
      console.log('ScriptDetective sending message to extension:', event.data.type);
      browserAPI.runtime.sendMessage(event.data).catch(err => {
        console.error('Error sending message to extension:', err);
      });
    }
  } catch (error) {
    console.error('ScriptDetective message handling error:', error);
  }
}, false);

// Start the process
injectHelperScript();