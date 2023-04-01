// Create a context menu item
chrome.contextMenus.create({
  id: "ask-chatgpt",
  title: "Ask ChatGPT",
  contexts: ["all"],
});

var loaded = false;

// Listen for when the user clicks on the context menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!loaded) {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content.js"],
      })
      .then(() => {
        console.log("script injected in all frames");
        loaded = true;
      })
      .then(() => {
        if (info.menuItemId === "ask-chatgpt") {
          // Send a message to the content script
          console.log("initializing chatgpt");
          chrome.tabs.sendMessage(tab.id, { type: "SHOW_UI" });
        }
      });
  } else {
    if (info.menuItemId === "ask-chatgpt") {
      // Send a message to the content script
      console.log("asking chatgpt");
      chrome.tabs.sendMessage(tab.id, { type: "SHOW_UI" });
    }
  }
});
