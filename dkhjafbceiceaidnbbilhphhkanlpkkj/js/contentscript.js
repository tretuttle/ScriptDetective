if (document.getElementById('netsuite-scripted-records')) {
  window.postMessage({type: 'getRecord'}, '*');
} else {
  let script = document.createElement('script');
  script.id = 'netsuite-scripted-records';
  script.src = chrome.extension.getURL('js/scriptrecordhelper.js');
  (document.head || document.documentElement).appendChild(script);
}

window.addEventListener(
  'message',
  (event) => {
    if (event.data.type === 'ready') {
      window.postMessage({type: 'getRecord'}, '*');
    } else if (event.data.dest === 'extension') {
      chrome.runtime.sendMessage(event.data);
    }
  },
  false
);
