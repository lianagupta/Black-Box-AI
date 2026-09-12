const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chat = document.querySelector(".chat");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const text = input.value.trim();

  if (!text) return;

  // Add user's message
  const userMessage = document.createElement("div");
  userMessage.className = "message user";

  userMessage.innerHTML = `
    <div class="message-label">YOU</div>
    <p>${escapeHTML(text)}</p>
  `;

  chat.appendChild(userMessage);

  input.value = "";

  // Prototype coaching response
  setTimeout(() => {
    const aiMessage = document.createElement("div");
    aiMessage.className = "message ai";

    aiMessage.innerHTML = `
      <div class="message-label">BLACK BOX</div>
      <p>
        I can see the position you're taking. Now examine the reasoning behind
        it: what assumption is your decision relying on, and what evidence
        would make you reconsider it?
      </p>
    `;

    chat.appendChild(aiMessage);

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });
  }, 500);
});

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
