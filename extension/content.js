// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("got message tpye", message.type);
  if (message.type === "SHOW_UI") {
    // Create the UI overlay
    const overlay = document.createElement("div");
    overlay.className = "ask-chatgpt-overlay";
    document.body.appendChild(overlay);

    // Create the UI elements
    overlay.innerHTML = `
      <div class="ask-chatgpt-container">
        <div class="ask-chatgpt-textarea-container">
          <textarea class="ask-chatgpt-textarea" placeholder="Selected text"></textarea>
        </div>
        <div class="ask-chatgpt-input-container">
          <input class="ask-chatgpt-input" type="text" placeholder="Enter your text here...">
        </div>
        <div class="ask-chatgpt-buttons-container">
          <button class="ask-chatgpt-send-button">Send</button>
          <button class="ask-chatgpt-cancel-button">Cancel</button>
        </div>
      </div>
    `;

    // Center the UI overlay
    const container = overlay.querySelector(".ask-chatgpt-container");
    const rect = container.getBoundingClientRect();
    container.style.left = `${(window.innerWidth - rect.width) / 2}px`;
    container.style.top = `${(window.innerHeight - rect.height) / 2}px`;

    // Listen for button clicks
    const sendButton = container.querySelector(".ask-chatgpt-send-button");
    const inputField = container.querySelector(".ask-chatgpt-input");
    const cancelButton = container.querySelector(".ask-chatgpt-cancel-button");

    sendButton.addEventListener("click", () => {
      // Send a message to the background script to call the ChatGPT API
      chrome.runtime.sendMessage({
        type: "CALL_CHATGPT",
        text: inputField.value,
      });
    });

    cancelButton.addEventListener("click", () => {
      // Remove the UI overlay
      overlay.remove();
    });

    // const overlay = document.createElement("div");
    // overlay.className = "ask-chatgpt-overlay";
    // document.body.appendChild(overlay);

    // // Load the HTML for the UI from the overlay.html file
    // fetch(chrome.extension.getURL("overlay.html"))
    //   .then((response) => response.text())
    //   .then((html) => {
    //     // Set the HTML for the overlay
    //     overlay.innerHTML = html;

    //     // Center the UI overlay
    //     const container = overlay.querySelector(".ask-chatgpt-container");
    //     const rect = container.getBoundingClientRect();
    //     container.style.left = `${(window.innerWidth - rect.width) / 2}px`;
    //     container.style.top = `${(window.innerHeight - rect.height) / 2}px`;

    //     // Listen for button clicks
    //     const sendButton = container.querySelector(".ask-chatgpt-send-button");
    //     const inputField = container.querySelector(".ask-chatgpt-input");
    //     const cancelButton = container.querySelector(
    //       ".ask-chatgpt-cancel-button"
    //     );

    //     sendButton.addEventListener("click", () => {
    //       // Send a message to the background script to call the ChatGPT API
    //       chrome.runtime.sendMessage({
    //         type: "CALL_CHATGPT",
    //         text: inputField.value,
    //       });
    //     });

    //     cancelButton.addEventListener("click", () => {
    //       // Remove the UI overlay
    //       overlay.remove();
    //     });
    //   });
  }

  if (message.type === "ASK_CHATGPT") {
    let originalActiveElement;
    let text;

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
      text =
        document.getSelection().toString().trim() ||
        document.activeElement.textContent.trim();
    } else {
      // If no active text input use any selected text on page
      text = document.getSelection().toString().trim();
    }

    if (!text) {
      alert(
        "No text found. Select this option after right clicking on a textarea that contains text or on a selected portion of text."
      );
      return;
    }

    showLoadingCursor();

    // Send the text to the API endpoint
    fetch("http://localhost:3000", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: text }),
    })
      .then((response) => response.json())
      .then(async (data) => {
        // Use original text element and fallback to current active text element
        const activeElement =
          originalActiveElement ||
          (document.activeElement.isContentEditable && document.activeElement);

        if (activeElement) {
          if (
            activeElement.nodeName.toUpperCase() === "TEXTAREA" ||
            activeElement.nodeName.toUpperCase() === "INPUT"
          ) {
            // Insert after selection
            activeElement.value =
              activeElement.value.slice(0, activeElement.selectionEnd) +
              `\n\n${data.reply}` +
              activeElement.value.slice(
                activeElement.selectionEnd,
                activeElement.length
              );
          } else {
            // Special handling for contenteditable
            const replyNode = document.createTextNode(`\n\n${data.reply}`);
            const selection = window.getSelection();

            if (selection.rangeCount === 0) {
              selection.addRange(document.createRange());
              selection.getRangeAt(0).collapse(activeElement, 1);
            }

            const range = selection.getRangeAt(0);
            range.collapse(false);

            // Insert reply
            range.insertNode(replyNode);

            // Move the cursor to the end
            selection.collapse(replyNode, replyNode.length);
          }
        } else {
          // Alert reply since no active text area
          alert(`ChatGPT says: ${data.reply}`);
        }

        restoreCursor();
      })
      .catch((error) => {
        restoreCursor();
        alert(
          "Error. Make sure you're running the server by following the instructions on https://github.com/gragland/chatgpt-chrome-extension. Also make sure you don't have an adblocker preventing requests to localhost:3000."
        );
        throw new Error(error);
      });
  }
});

const showLoadingCursor = () => {
  const style = document.createElement("style");
  style.id = "cursor_wait";
  style.innerHTML = `* {cursor: wait;}`;
  document.head.insertBefore(style, null);
};

const restoreCursor = () => {
  document.getElementById("cursor_wait").remove();
};
