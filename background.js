'use strict';

const scriptsToBlock = [
  '*://*.plausible.io/js/plausible.js',
  '*://*.plausible.io/js/analytics.js'
]

let blocker;

chrome.storage.sync.get('blacklist', ({blacklist: blacklist}) => {
  blacklist = blacklist || []
  chrome.storage.sync.set({blacklist: blacklist}, () => {
    updateIcon(blacklist)
    blocker = blockRequests(blacklist)
    chrome.webRequest.onBeforeRequest.addListener(blocker, {urls: scriptsToBlock, types: ['xmlhttprequest', 'script'] }, ['blocking'] )
  })
})

function setIcon(path, callback) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var image = new Image();
  image.onload = function() {
    ctx.drawImage(image,0,0,42,42);
    var imageData = ctx.getImageData(0,0,42,42);
    var action = new chrome.declarativeContent.SetIcon({imageData: imageData});
    callback(action);
  }
  image.src = chrome.runtime.getURL(path);
}

function updateIcon(blacklist) {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    setIcon('images/plausible_favicon_grey.png', function(setIconAction) {
      const rules = blacklist.map((hostname) => {
        return {
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({pageUrl: {hostEquals: hostname}}),
            new chrome.declarativeContent.PageStateMatcher({pageUrl: {hostEquals: `www.${hostname}`}})
          ],
          actions: [setIconAction]
        }
      })
      chrome.declarativeContent.onPageChanged.addRules(rules)
    })
  })
}

function blockRequests(blacklist) {
  return function(details) {
    const {initiator} = details
    const basename = initiator ? (new URL(initiator)).hostname.replace(/^www\./, '') : null
    const found = blacklist.length && blacklist.find(hostname => hostname === basename)

    return {cancel: !!found}
  }
}

chrome.storage.onChanged.addListener(({blacklist: blacklist}) => {
  updateIcon(blacklist.newValue)
  chrome.webRequest.onBeforeRequest.removeListener(blocker)

  blocker = blockRequests(blacklist.newValue)

  chrome.webRequest.onBeforeRequest.addListener(blocker, {urls: scriptsToBlock, types: ['xmlhttprequest', 'script'] }, ['blocking'] )
})
