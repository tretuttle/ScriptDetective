// Script injected directly into the NetSuite page context
console.log('ScriptDetective helper script loaded');

// Tell the content script we're ready
window.postMessage({type: 'ready'}, '*');

// Listen for messages from the content script
window.addEventListener('message', function(event) {
  // Only accept messages from the same frame
  if (event.source !== window) return;
  
  console.log('ScriptDetective helper received message:', event.data.type);

  function sendMsgExtension(type, text = null) {
    window.postMessage({dest: 'extension', type, text}, '*');
  }

  if (event.data.type === 'getRecord') {
    try {
      var type = nlapiGetRecordType();
    
      if (!type) {
        type = jQuery('#scriptid_fs').html();

        if (!type) {
          sendMsgExtension('error', 'Could not load the data. Record type not detected.');
          return;
        }
      }
      
      type = type.toUpperCase();
      console.log('ScriptDetective: Detected record type:', type);
  
      var url = `/app/common/scripting/scriptedrecord.nl?id=${type}&e=T`;
      
      nlapiRequestURL(url, null, null, function(response) {
        if (response.getError()) {
          sendMsgExtension('error', 'Could not load the data: ' + response.getError());
        } else {
          sendMsgExtension('dataRecord', response.getBody());
        }
      });
    } catch (e) {
      sendMsgExtension('error', 'Error in getRecord: ' + (e.message || e.toString()));
    }
  }
  
  if (event.data.type === 'getCode') {
    try {
      console.log('ScriptDetective: Getting code for script:', event.data.script);
      var scriptId, scriptFile, isInactive, owner;

      var req = nlapiRequestURL(event.data.script + '&e=T');
      var results = jQuery(req.getBody());
      var fileId = jQuery('#hddn_scriptfile_fs', results).val() || '';

      jQuery('input[name="scriptfile"]', results).each(function() {
        if (jQuery(this).val()) {
          fileId = jQuery(this).val();
        }          
      });        
      
      // When the file is protected
      if (!fileId || fileId === '') {
        var b = req.getBody();
        var media = b.indexOf('onclick="previewMedia(');
        if (media > 0) {
          var j = b.indexOf(',', media + 1);
          fileId = b.substring(media + 22, j);
        }
      }

      scriptId = jQuery('#scriptid_fs', results).html() || '';        
      scriptFile = jQuery('#scriptfile_display', results).val() || '';
      isInactive = jQuery('#isinactive_fs', results)[0].className === 'checkbox_unck' ? 'No' : '<b>Yes</b>';                
      owner = jQuery('#owner_display', results).val() || '';

      jQuery('input[name="inpt_owner"]', results).each(function() {
        if (jQuery(this).val()) {
          owner = jQuery(this).val();
        }
      });

      if (!scriptFile) {
        jQuery('input[name="name"]', results).each(function() {
          if (jQuery(this).val()) {
            scriptFile = jQuery(this).val();
          }
        });
      }
              
      if (!fileId) {
        sendMsgExtension('error', 'Could not find the script file ID');
        return;
      }
      
      var previewReq = nlapiRequestURL('/core/media/previewmedia.nl?id=' + fileId);

      window.postMessage({
        dest: 'extension', 
        type: 'code', 
        owner: owner, 
        scriptid: scriptId, 
        scriptfile: scriptFile, 
        isinactive: isInactive,
        code: previewReq.getBody()
      }, '*');

    } catch(e) {
      if (e.getCode && e.getCode() === 'SERVER_RESPONSE_ERROR') {
        window.postMessage({
          dest: 'extension', 
          type: 'code', 
          owner: owner || 'Unknown', 
          scriptid: scriptId || 'Unknown', 
          scriptfile: scriptFile || 'Unknown', 
          isinactive: isInactive || 'Unknown',
          code: 'Code could not be loaded. Check if you have permissions to see it.'
        }, '*');
      } else {
        sendMsgExtension('error', 'Error: ' + (e.message || e.toString())); 
      }
    }
  }
}, false);