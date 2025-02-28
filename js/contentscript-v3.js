// Import the browser polyfill if needed
// We'll add this in the html file

if (document.getElementById('netsuite-scripted-records')) {
  window.postMessage({type: 'getRecord'}, '*');
} else {
  let script = document.createElement('script');
  script.id = 'netsuite-scripted-records';
  
  // Use chrome directly for now since we know we're in Chrome
  // Later we can make this cross-browser
  script.src = chrome.runtime.getURL('js/scriptrecordhelper-v3.js');
  
  (document.head || document.documentElement).appendChild(script);
}

window.addEventListener(
  'message',
  (event) => {
    if (event.data.type === 'ready') {
      window.postMessage({type: 'getRecord'}, '*');
    } else if (event.data.dest === 'extension') {
      // Use chrome directly for now
      chrome.runtime.sendMessage(event.data);
    }
  },
  false
);