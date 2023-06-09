chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SHOW_UI") {
    handleShowUI();
  }
});

const getChatgptResponse = (data, onResponse) => {
  showLoadingCursor();
  fetch("https://vuqwb4q6nj.execute-api.ap-east-1.amazonaws.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: data.text, customText: data.customText }),
  })
    .then((response) => response.json())
    .then(async (data) => {
      onResponse(data.reply);
      restoreCursor();
    })
    .catch((error) => {
      restoreCursor();
      throw new Error(error);
    });
};

const handleShowUI = () => {
  // Create the UI overlay
  const overlay = document.createElement("div");
  overlay.className = "ask-chatgpt-overlay";
  document.body.appendChild(overlay);
  const textContent = getHighlightedText();
  // Load the HTML for the UI from the overlay.html file
  fetch(chrome.runtime.getURL("overlay.html"))
    .then((response) => response.text())
    .then((html) => {
      // Set the HTML for the overlay
      overlay.innerHTML = html;
      const textarea = document.querySelector(".ask-chatgpt-selected-text");
      const responseArea = document.querySelector(".ask-chatgpt-reply-text");
      // Set the value of the textarea
      textarea.value = textContent.text;
      // Center the UI overlay
      const container = overlay.querySelector(".ask-chatgpt-container");

      // Listen for button clicks
      const sendButton = container.querySelector(".ask-chatgpt-send-button");

      const inputEl = document.querySelector(".ask-chatgpt-input");
      const customInputEl = document.querySelector(".ask-chatgpt-custom-input");
      inputEl.addEventListener("change", (event) => {
        // Show the custom input element if the selected value is "custom-text"
        if (event.target.value === "custom-text") {
          customInputEl.style.display = "block";
        } else {
          customInputEl.style.display = "none";
        }
      });

      const cancelButton = container.querySelector(
        ".ask-chatgpt-cancel-button"
      );

      createDonateImage();
      const donateButton = document.querySelector(".ask-chatgpt-donate-button");
      donateButton.addEventListener("click", () => {
        document.querySelector(".ask-chatgpt-overlay-donate").style.display =
          "block";
      });

      const donateCloseButton = document.querySelector(
        ".ask-chatgpt-donate-ok-button"
      );
      donateCloseButton.addEventListener("click", () => {
        document.querySelector(".ask-chatgpt-overlay-donate").style.display =
          "none";
      });
      // set the bottom right version tag
      const versionTag = document.querySelector(".ask-chatgpt-version-tag");
      getLatestVersion((data) => {
        versionTag.innerText = `Version ${data.version} ${data.note}`;
      });

      sendButton.addEventListener("click", () => {
        const selection = inputEl.options[inputEl.selectedIndex].value;
        let customText = null;
        if (selection == "custom-text") {
          customText = customInputEl.value;
        } else {
          customText = inputEl.options[inputEl.selectedIndex].text;
        }
        getChatgptResponse(
          { text: textarea.value, customText: customText },
          (data) => (responseArea.value = data)
        );
      });

      cancelButton.addEventListener("click", () => {
        // Remove the UI overlay
        overlay.remove();
      });
    });
};

const getLatestVersion = (onResponse) => {
  const currentVersion = chrome.runtime.getManifest().version;
  const latestVersion = JSON.parse(localStorage.getItem("latestVersion"));
  if (latestVersion && latestVersion.version == currentVersion) {
    onResponse({
      version: latestVersion.version,
      note: "",
    });
    return;
  }
  fetch("https://vuqwb4q6nj.execute-api.ap-east-1.amazonaws.com/version")
    .then((response) => response.json())
    .then((data) => {
      onResponse({
        version: data.version,
        note: currentVersion != data.version ? "upgrade available!" : "",
      });
      localStorage.setItem("latestVersion", JSON.stringify(data));
    })
    .catch((error) => {
      console.error("Error fetching latest version:", error);
    });
};

const getHighlightedText = () => {
  let originalActiveElement;
  let highlightedText;

  // If there's an active text input
  if (
    document.activeElement &&
    (document.activeElement.isContentEditable ||
      document.activeElement.nodeName.toUpperCase() === "TEXTAREA" ||
      document.activeElement.nodeName.toUpperCase() === "INPUT")
  ) {
    // Set as original for later
    originalActiveElement = document.activeElement;
    // Use selected text or all text in the input
    highlightedText =
      document.getSelection().toString().trim() ||
      document.activeElement.textContent.trim();
  } else {
    // If no active text input use any selected text on page
    highlightedText = document.getSelection().toString().trim();
  }

  return {
    textElement: originalActiveElement,
    text: highlightedText,
  };
};

const showLoadingCursor = () => {
  const style = document.createElement("style");
  style.id = "cursor_wait";
  style.innerHTML = `* {cursor: wait;}`;
  document.head.insertBefore(style, null);
};

const restoreCursor = () => {
  document.getElementById("cursor_wait").remove();
};

//fetch a static image and hide it
function createDonateImage() {
  const icon = document.querySelector(".ask-chatgpt-donate-image");
  icon.src = chrome.runtime.getURL("TRC20_USDT.png");
  document.querySelector(".ask-chatgpt-overlay-donate").style.display = "none";
}
