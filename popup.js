function getCurrentTab(callback) {
  chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
    const hostname = (new URL(tab.url)).hostname.replace(/^www\./,'')
    callback(hostname)
  });
}

function requestPermissionForUrl(basename) {
  chrome.permissions.request({
    origins: [`*://*.${basename}/*`]
  }, function(granted) {
    if (!granted) return alert(`Please grant permissions on ${basename} to block your visits`)
    if (chrome.runtime.lastError) return console.log(chrome.runtime.lastError.message)

    chrome.storage.sync.get('blacklist', function({blacklist: list}) {
      const newBlacklist = [ ...new Set([...list, basename])]
      chrome.storage.sync.set({blacklist: newBlacklist}, updateUI)
    })
  })
}

function enableTracking(basename) {
  chrome.storage.sync.get('blacklist', function({blacklist: list}) {
    const newBlacklist = list.filter((hostname) => hostname !== basename)
    chrome.storage.sync.set({blacklist: newBlacklist}, updateUI)
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
      requestPermissionForUrl(tabHostname)
    } else if (action === 'Enable tracking') {
      enableTracking(tabHostname)
    } else {
      alert('Something went wrong. Please try again')
    }

  })
};

