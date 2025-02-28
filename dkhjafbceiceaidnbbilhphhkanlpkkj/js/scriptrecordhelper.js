window.postMessage({type: 'ready'}, '*');

window.addEventListener(
  'message',
  function(event) {

    function sendMsgExtension(type, text = null) {
      window.postMessage({dest: 'extension', type, text}, '*');
    }

    if (event.data.type == 'getRecord') {
      var type = nlapiGetRecordType();
    
      if (!type) {
        type = jQuery('#scriptid_fs').html();

        if (!type) {
          sendMsgExtension('error', 'Could not load the data.');
          return;
        }
      }
      
      type = type.toUpperCase();
  
      var url = `/app/common/scripting/scriptedrecord.nl?id=${type}&e=T`;
      
      nlapiRequestURL(url, null, null, (response) => {
        if (response.getError()) {
          sendMsgExtension('error', 'Could not load the data ' + response.getError());
        } else {
          sendMsgExtension('dataRecord', response.getBody());
        }
      });
    }
    
    if (event.data.type == 'getCode') {
      var scriptId, 
          scriptFile,
          isInactive,
          owner;

      try {
        var req = nlapiRequestURL(event.data.script + '&e=T');

        var results = jQuery(req.getBody());

        var fileId = jQuery('#hddn_scriptfile_fs', results) ? jQuery('#hddn_scriptfile_fs', results).val() : false;

        console.log('id:' + fileId);

        jQuery('input[name="scriptfile"]', results).each(function() {
          if ($(this).value) {
            fileId = ($(this).value ? $(this).value : '');
          }          
        });        
        
        // When the file is protected
        if (!fileId || fileId == undefined) {
          var b = req.getBody();
          var media = b.indexOf('onclick="previewMedia(');
          if (media > 0) {
            var j = b.indexOf(',', media + 1);
            fileId = b.substring(media + 22, j);
          }
        }

        scriptId    = jQuery('#scriptid_fs', results).html();        
        scriptFile  = jQuery('#scriptfile_display', results).val();
        isInactive  = jQuery('#isinactive_fs', results)[0].className == 'checkbox_unck' ? 'No' : '<b>Yes</b>';                
        owner       = jQuery('#owner_display', results).val();

        jQuery('input[name="inpt_owner"]', results).each(function() {
          owner = ($(this).value ? $(this).value : '');
        });

        if (!scriptFile) {
          jQuery('input[name="name"]', results).each(function() {
            scriptFile = ($(this).value ? $(this).value : '');
          });
        }
                
        var previewReq = nlapiRequestURL('/core/media/previewmedia.nl?id=' + fileId);

        window.postMessage({dest: 'extension', type: 'code', owner: owner, 
          scriptid: scriptId, scriptfile: scriptFile, 
          isinactive: isInactive,
          code: previewReq.getBody()}, '*');

      } catch(e) {
        if (e.getCode() == 'SERVER_RESPONSE_ERROR') {
          window.postMessage({dest: 'extension', type: 'code', owner: owner, 
          scriptid: scriptId, scriptfile: scriptFile, 
          isinactive: isInactive,
          code: 'Code could not be loaded. Check if you have permissions to see it.'}, '*');
        } else {
          sendMsgExtension('error', 'Error ' + e.getCode() + ' - ' + e.getDetails()); 
        }
      }
    }
  },
  false
);
