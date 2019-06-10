'use strict';

const scriptsToBlock = [
  '*://*.plausible.io/js/plausible.js',
]

chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.set({blacklist: []});
  updateDeclarativeContent()
});

function createSetIconAction(path, callback) {
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

function updateDeclarativeContent() {
  chrome.storage.sync.get('blacklist', ({blacklist: blacklist}) => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
      createSetIconAction('images/plausible_favicon_grey.png', function(setIconAction) {
        const rules = blacklist.map((hostname) => {
          return {
            conditions: [
              new chrome.declarativeContent.PageStateMatcher({pageUrl: {hostContains: `.${hostname}`}}),
              new chrome.declarativeContent.PageStateMatcher({pageUrl: {hostContains: `${hostname}`}})
            ],
            actions: [setIconAction]
          }
        })
        chrome.declarativeContent.onPageChanged.addRules(rules)
      })
    })
  })
}

function blockRequests(blacklist) {
  return function(details) {
    const {initiator} = details
    const basename = initiator ? (new URL(initiator)).hostname : null
    const found = blacklist.length && blacklist.find(hostname => hostname === basename)

    return {cancel: !!found}
  }
}

let blocker = function() {};
chrome.webRequest.onBeforeRequest.addListener(blocker, {urls: [], types: ['xmlhttprequest', 'script'] }, ['blocking'])

chrome.storage.onChanged.addListener(({blacklist: blacklist}) => {
  updateDeclarativeContent()
  chrome.webRequest.onBeforeRequest.removeListener(blocker)

  console.log('Blacklist updated', blacklist)
  blocker = blockRequests(blacklist.newValue)

  chrome.webRequest.onBeforeRequest.addListener(blocker, {urls: scriptsToBlock, types: ['xmlhttprequest', 'script'] }, ['blocking'] )
})


const requestPermissionForUrl = (basename) => {
  chrome.permissions.request({
    origins: [`*://*.${basename}/*`]
  }, function(granted) {
    if (!granted) return alert(`Please grant permissions on ${basename} to block your visits`)
    if (chrome.runtime.lastError) return console.log(chrome.runtime.lastError.message)

    chrome.storage.sync.get('blacklist', function({blacklist: list}) {
      const newBlacklist = [ ...new Set([...list, basename])]
      chrome.storage.sync.set({blacklist: newBlacklist})
    })
  })
}

chrome.browserAction.onClicked.addListener(function(tab) {
  const basename = (new URL(tab.url)).hostname
  if (!basename) return alert('Invalid website')

  requestPermissionForUrl(basename)
})
