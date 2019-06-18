function getCurrentTab(callback) {
  chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
    const hostname = (new URL(tab.url)).hostname.replace(/^www\./,'')
    callback(hostname)
  });
}

function showRefresh(newState) {
  return function() {
    document.getElementById('trackingState').innerHTML = newState
    document.getElementById('toggleTracking').innerHTML = 'Refresh'
    document.getElementById('toggleTracking').onclick = function() {
      chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
        var code = 'window.location.reload();';
        chrome.tabs.executeScript(tab.id, {code: code});
        window.close()
      });
    }
  }
}

function disableTracking(basename) {
  chrome.storage.sync.get('blacklist', function({blacklist: list}) {
    const newBlacklist = [ ...new Set([...list, basename])]
    chrome.storage.sync.set({blacklist: newBlacklist}, showRefresh('disabled'))
  })
}

function enableTracking(basename) {
  chrome.storage.sync.get('blacklist', function({blacklist: list}) {
    const newBlacklist = list.filter((hostname) => hostname !== basename)
    chrome.storage.sync.set({blacklist: newBlacklist}, showRefresh('enabled'))
  })
}

function updateUI() {
  getCurrentTab(function(tab) {
    document.getElementById('activeTab').innerHTML = tab

    chrome.storage.sync.get('blacklist', function({blacklist: list}) {
      const disabled = (list || []).find((hostname) => hostname === tab)
      if (disabled) {
        document.getElementById('trackingState').innerHTML = 'disabled'
        document.getElementById('toggleTracking').innerHTML = 'Enable tracking'
      } else {
        document.getElementById('trackingState').innerHTML = 'enabled'
        document.getElementById('toggleTracking').innerHTML = 'Disable tracking'
      }
    })
  })
}

updateUI()

document.getElementById("toggleTracking").onclick = function(e) {
  getCurrentTab(function(tabHostname) {
    if (!tabHostname) return alert('Invalid website')
    const action = e.target.textContent

    if (action === 'Disable tracking') {
      disableTracking(tabHostname)
    } else if (action === 'Enable tracking') {
      enableTracking(tabHostname)
    } else {
      alert('Something went wrong. Please try again')
    }

  })
};

