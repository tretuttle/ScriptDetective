/**
 * Debug utility for ScriptDetective extension
 */

(function() {
  const DEBUG = true;
  
  if (!DEBUG) return;
  
  // Add debug console logging
  window.debugLog = function(message, data) {
    if (!DEBUG) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[ScriptDetective ${timestamp}] ${message}`, data || '');
  };
  
  // Add debug UI element
  function addDebugPanel() {
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.bottom = '0';
    panel.style.right = '0';
    panel.style.width = '300px';
    panel.style.height = '200px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.color = 'white';
    panel.style.padding = '10px';
    panel.style.overflow = 'auto';
    panel.style.zIndex = '9999';
    panel.style.fontSize = '12px';
    panel.style.fontFamily = 'monospace';
    panel.id = 'script-detective-debug';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '5px';
    closeBtn.style.right = '5px';
    closeBtn.addEventListener('click', () => panel.style.display = 'none');
    
    const content = document.createElement('div');
    content.id = 'script-detective-debug-content';
    content.style.marginTop = '25px';
    
    panel.appendChild(closeBtn);
    panel.appendChild(content);
    
    document.body.appendChild(panel);
    
    window.addDebugMessage = function(message) {
    // Log to console
    console.log(`[ScriptDetective] ${message}`);
    
    // Try to add to debug output in popup
    try {
      const debugOutput = document.getElementById('debug-output');
      if (debugOutput) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
          const entry = document.createElement('div');
        entry.textContent = `[${timestamp}] ${message}`;
        debugOutput.appendChild(entry);
        debugOutput.scrollTop = debugOutput.scrollHeight;
      }
    } catch (e) {
      console.error('Error adding debug message:', e);
    }
  };
  }
  
  // Wait for document to be ready
  if (document.readyState === 'complete') {
    addDebugPanel();
  } else {
    window.addEventListener('load', addDebugPanel);
  }
})();