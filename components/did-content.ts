export function renderDidContent() {
  return `
    <div class="did-container">
      <div class="intro-container">   
        <img src="/images/groupchat.jpeg" alt="Group Chat" style="width: 75%; max-width: 768px; height: auto;">
        <p>A silly way to chat about a serious issue. If this experience resonates with you, please reach out to a mental health specialist.</p>
      </div>
      <hr>
      <div class="phone-box">
        <div id="chat-container" class="chat-container">
          <!-- This will be populated by JavaScript -->
        </div>
      </div>
    </div>
    <script>
      // Include the JavaScript for the chat functionality here
      ${renderChatScript()}
    </script>
  `;
}

function renderChatScript() {
  // Include the JavaScript from the did-chat.handlebars file here
  return `
    // ... (copy the JavaScript from did-chat.handlebars)
  `;
}
