// Use chrome directly since we know we're in Chrome
const browserApi = chrome;

// Debug function
function debugLog(message) {
  console.log('[ScriptDetective]', message);
  try {
    const debugOutput = document.getElementById('debug-output');
    if (debugOutput) {
      const timestamp = new Date().toTimeString().split(' ')[0];
      const entry = document.createElement('div');
      entry.textContent = `[${timestamp}] ${message}`;
      debugOutput.appendChild(entry);
      debugOutput.scrollTop = debugOutput.scrollHeight;
    }
  } catch (e) {
    console.error('Error logging:', e);
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  debugLog('Popup initialized');
  
  // Define globals
  window.userEventScripts = document.getElementById('userEventScripts');
  window.clientScripts = document.getElementById('clientScripts');
  window.workflowScripts = document.getElementById('workflowScripts');

  // Check if we're on a NetSuite page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('netsuite.com')) {
      debugLog('On a NetSuite page: ' + tabs[0].url);
      
      // Make sure the content script is loaded
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['js/content-mv3.js']
      }).then(() => {
        debugLog('Content script injected');
      }).catch(error => {
        debugLog('Error injecting content script: ' + error.message);
        document.getElementById('container').innerHTML = 'Error: ' + error.message;
        $('#loading').hide();
      });
    } else {
      debugLog('Not on a NetSuite page');
      document.getElementById('container').innerHTML = 'Please navigate to a NetSuite record page to use this extension.';
      $('#loading').hide();
    }
  });

  // Setup UI handlers
  document.getElementById('back').addEventListener('click', function() {
    hideCode();
  });

  document.getElementById('mailLink').addEventListener('click', function() {
    var emailUrl = "mailto:marcelpestana@gmail.com";
    chrome.tabs.update({ url: emailUrl });  
  });  
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request) => {
  debugLog('Received message: ' + request.type);
  
  if (request.type === 'error') {
    document.getElementById('container').innerHTML = `Error.<br>${request.text}`;
    $('#loading').hide();
    hideCode();
  } else if (request.type === 'code') { 
    debugLog('Received code');
    var data = request.code;
    var lang = 'js';
    
    $('#output').html("");
    $('#scriptOwner').html(request.owner);
    $('#scriptId').html(request.scriptid);
    $('#scriptFile').html(request.scriptfile);
    $('#isInactive').html(request.isinactive);

    $('<pre>')
        .html(prettyPrintOne(data, lang))
        .addClass('prettyprint linenums lang-py prettyprinted')
        .appendTo('#output');

  } else if (request.type === 'dataRecord') {
    debugLog('Received dataRecord');
    let container = document.getElementById('container');

    var result1 = $(request.text);

    // User Event scripts
    getScripts('User Event Scripts', result1, 'serverrow', userEventScripts);

    // Client scripts
    getScripts('Client Scripts', result1, 'clientrow', clientScripts);

    // Workflows
    getScripts('Workflows', result1, 'workflowsrow', workflowScripts);

    $("[name='btnPreview']").each(function() {
      var script = $(this).attr('script');
  
      this.addEventListener('click', function() {
        $('#output').html('<img src="dkhjafbceiceaidnbbilhphhkanlpkkj/img/loading1.gif"></img>');

        $('#container').width(0);
        $('#main').width(800);
        $('#output').width(800);
        $('#right').show();

        // Execute script to get code using Chrome API
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          debugLog('Requesting code for script: ' + script);
          
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (scriptUrl) => {
              window.postMessage({type: 'getCode', script: scriptUrl}, '*');
            },
            args: [script]
          }).catch(error => {
            debugLog('Error executing script: ' + error.message);
          });
        });
      });
    });

    $("[name='scriptLink']").each(function() {
      var script = $(this).attr('script');
      var link = $(this);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        var url = tabs[0].url;
        url = url.substring(0, url.indexOf('/', 9)) + script;
        link.attr("href", url);
      });
    });

    $('#loading').hide();
  }
});

function getScripts(description, result1, tag, container) {
  var scriptsList = [];
    
  $(`[id^="${tag}"]`, result1).each(function(a) {
    var b = $(this); 
    scriptsList[a] = {};
    
    var scriptName;
    
    if (tag == 'workflowsrow') {
      scriptName = $(b[0].children[0].innerHTML);    
      scriptsList[a].name = scriptName[0].innerHTML;
    } else {
      scriptName = $(b[0].children[1].innerHTML);    
      scriptsList[a].name = scriptName[0].innerHTML;
    }
    
    var scriptURL = scriptName[0].href;
    scriptURL = scriptURL.substring(scriptURL.indexOf('/app'));

    scriptsList[a].script = scriptURL;

    var c = b[0].children;
    
    var statusData = (c[c.length - 6].innerHTML);
    var deployData = (c[c.length - 5].innerHTML);
    
    if (tag == 'serverrow') {
      scriptsList[a].beforeLoad = c[c.length - 4].innerHTML;
      scriptsList[a].beforeSubmit = c[c.length - 3].innerHTML;
      scriptsList[a].afterSubmit = c[c.length - 2].innerHTML;    
      scriptsList[a].deployed = $(deployData)[0].className;  
      scriptsList[a].status = $(`[name^="inpt_status"]`, statusData)[0].value;
    } else if (tag == 'clientrow') {
      scriptsList[a].pageInit = c[c.length - 4].innerHTML;
      scriptsList[a].saveRecord = c[c.length - 3].innerHTML;
      scriptsList[a].fieldChanged = c[c.length - 2].innerHTML;
      scriptsList[a].validateLine = c[c.length - 1].innerHTML;
      scriptsList[a].deployed = $(deployData)[0].className;
      scriptsList[a].status = $(`[name^="inpt_status"]`, statusData)[0].value;             
    } else if (tag == 'workflowsrow') {   
      scriptsList[a].triggerType = c[c.length - 1].innerHTML;
      deployData = '';
      statusData =  (c[c.length - 4].innerHTML);      
      scriptsList[a].status = $(`[name^="inpt_releaseStatus"]`, statusData)[0].value;    
    }     
  });

  if (scriptsList.length == 0) return;

  var netSuiteURL = '';
  
  var scripts = `<div class="header" id="${tag}Header"></div>
  <table id="scripts"><tr><th>Name</th>${tag == 'workflowsrow'? '' : '<th>Deployed</th>'}<th>Status</th>${tag == 'workflowsrow'? '' : '<th></th>'}</tr>`;

  for (var i = 0; i < scriptsList.length; i++) {
    scripts += '<tr';

    if (scriptsList[i].deployed == 'checkbox_unck' || 
      (tag == 'workflowsrow' && scriptsList[i].status == 'Not Running')) {
      scripts += ` style = "background:#ffeaea"`;
    }
    scripts += '>';      
    scripts += '<td>';
    scripts += `<a name="scriptLink" href="${netSuiteURL + scriptsList[i].script}" target="_blank" script="${scriptsList[i].script}">${scriptsList[i].name}</a>`;
    
    if (tag != 'workflowsrow') {      
      scripts += '<br><ul>';
      scripts += buildScriptLine('Before Load',   scriptsList[i].beforeLoad);
      scripts += buildScriptLine('Before Submit', scriptsList[i].beforeSubmit);
      scripts += buildScriptLine('After Submit',  scriptsList[i].afterSubmit);
      scripts += buildScriptLine('Page Init',     scriptsList[i].pageInit);
      scripts += buildScriptLine('Save Record',   scriptsList[i].saveRecord);
      scripts += buildScriptLine('Field Changed', scriptsList[i].fieldChanged);
      scripts += buildScriptLine('Validate Line', scriptsList[i].validateLine);
      scripts += buildScriptLine('Trigger Type',  scriptsList[i].triggerType);        
      scripts += '</ul>';
    }
    
    scripts += '</td>';
    
    if (tag != 'workflowsrow') {
      scripts += '<td align="center">';
    
      if (scriptsList[i].deployed == 'checkbox_ck') {
        scripts += '<img src="dkhjafbceiceaidnbbilhphhkanlpkkj/img/checked.png" width="20px">';
      } else if (scriptsList[i].deployed == 'checkbox_unck') {
        scripts += '';
      }
      scripts += '</td>';        
    }
    
    scripts += '<td>';      
    if (scriptsList[i].status) {      
      scripts += (scriptsList[i].status == 'Testing' ? '<b><i>' + scriptsList[i].status + '</i></b>' : scriptsList[i].status) + '<br>';
    }  
    scripts += '</td>';
    
    if (tag != 'workflowsrow') {
      scripts += `<td>
      <i><input type="image" name="btnPreview" title="Preview File" script="${scriptsList[i].script}" src="dkhjafbceiceaidnbbilhphhkanlpkkj/img/preview.png" width="25px"></input></i><br>
      </td>`;
    }      
    scripts +='</tr>';
  }      
  scripts += '</table>';

  container.innerHTML = scripts;  

  $(`#${tag}Header`).html(`${description} (Total: ${scriptsList.length})`);
}

function buildScriptLine(description, script) {
  var scriptsLine = '';
  if (script && script != undefined && script != '&nbsp;') {
    scriptsLine += `<li title="${description}"><i>${script}</i></li>`;
  }
  return scriptsLine;
}

function hideCode() { 
  $('#container').width(500);
  $('#main').width(500);
  $('#right').hide();
  $('#scriptId').html('');
  $('#scriptOwner').html('');
  $('#scriptFile').html('');
  $('#isInactive').html('');
}

function replaceAll(string, token, newtoken) {
  while (string.indexOf(token) != -1) {
     string = string.replace(token, newtoken);
  }
  return string;
}