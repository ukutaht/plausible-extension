'use strict';

const scriptsToBlock = [
  '*://*.plausible.io/js/plausible.js',
  '*://*.plausible.io/js/analytics.js'
]

let blacklist = [];

function blocker(details) {
  const initiator = details.initiator || details.originUrl // Chrome + Firefox
  const basename = initiator ? (new URL(initiator)).hostname.replace(/^www\./, '') : null
  const found = blacklist.find(hostname => hostname === basename)

  if (found) {
    chrome.browserAction.setIcon({
      path: 'images/plausible_favicon_grey.png',
      tabId: details.tabId
    })
  } else {
    chrome.browserAction.setIcon({
      path: 'images/plausible_favicon.png',
      tabId: details.tabId
    })
  }
  return {cancel: !!found}
}

chrome.storage.sync.get('blacklist', ({blacklist: res}) => {
  blacklist = res || []
  chrome.storage.sync.set({blacklist: blacklist})
  chrome.webRequest.onBeforeRequest.addListener(blocker, {
    urls: scriptsToBlock,
    types: ['xmlhttprequest', 'script'] },
    ['blocking']
  )
})

chrome.storage.onChanged.addListener(({blacklist: res}) => {
  blacklist = res.newValue
})
