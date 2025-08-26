async function swiftDoccRenderer(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    world: "MAIN",
    func: () => window.webpackChunkswift_docc_render,
  });
  return results[0].result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getRenderer") {
    swiftDoccRenderer(sender.tab.id)
      .then((renderer) => sendResponse({ success: true, data: renderer }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  if (request.action === "injectOverrideStyles") {
    (async () => {
      await chrome.scripting.insertCSS({
        target: { tabId: sender.tab.id },
        files: ["override.css"],
      });
    })();
  }
});
