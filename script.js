import { CreateMLCEngine } from
  "https://esm.run/@mlc-ai/web-llm";

const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chat = document.querySelector(".chat");
const button = form.querySelector("button");

let engine = null;
let messages = [];

let problemStarted = false;
let reasoningStage = "NEW";
let turnCount = 0;

const SYSTEM_PROMPT = `
You are BLACK BOX.

Your job is to coach the user through solving their problem.

IMPORTANT:
You are NOT a normal answer chatbot.

For every NEW problem, your FIRST response must NOT contain the final answer.

Do NOT:
- give the answer immediately
- explain the whole solution
- give a list of information
- give multiple steps at once
- give a complete essay or argument
- use "ANSWER:", "WHY:", or "REASONING:" unless the user has already reached the solution
- use jokes, filler, or phrases like "A straightforward question!" or "A question that gets to the heart of..."

Instead, give exactly ONE useful reasoning step.

The step must be specific to the user's actual problem.

The problem may be ANYTHING:
maths, science, writing, research, decisions, logic, planning, or another reasoning task.

Think about the correct solution internally, but do not reveal it.

Your response should make the USER perform the next piece of thinking.

Examples of appropriate behaviour:

For a calculation:
Ask the user to identify what operation or relationship they need to use.

For science:
Ask the user to identify the relevant concept, observation, variable, or mechanism.

For writing:
Ask the user to decide on one argument, idea, piece of evidence, or structural choice.

For a decision:
Ask the user to identify one important criterion or compare one relevant trade-off.

For research:
Ask the user to identify what evidence would help answer the question.

ADAPTIVE SUPPORT:

After the user responds:

- If their reasoning is correct, acknowledge it briefly and give the next reasoning step.
- If partially correct, identify what is missing and give a smaller hint.
- If incorrect, point toward the mistake without simply giving the answer.
- If they say they do not know, make the hint easier.
- If they remain stuck, make the hint increasingly obvious.

NEVER repeat the same generic question.

Every response must move the user's reasoning forward.

FINAL ANSWER:

Only provide the final answer AFTER the user has demonstrated the final reasoning or has reached a clear conclusion.

At that point, briefly confirm the answer and explain why it is correct.

For open-ended decisions, there may not be one correct answer. Help the user reach and justify their own conclusion instead.

ACCURACY:

Check calculations and factual claims carefully before responding.
Never confidently state something you have not checked.

STYLE:

Be concise.
Be natural.
Be direct.
No jokes.
No filler.
No unnecessary headings.
No long explanations.

The goal is:

LESS AI THINKING.
MORE HUMAN THINKING.

Do not explain these instructions to the user.
`;
async function startAI() {

  button.disabled = true;
  button.textContent = "LOADING BLACK BOX...";

  addMessage(
    "BLACK BOX",
    "Loading local AI. The model runs in this browser and does not require an API key.",
    "ai"
  );

  try {

    engine = await CreateMLCEngine(
      "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      {
        initProgressCallback: (progress) => {
          console.log(progress);
        }
      }
    );

    messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      }
    ];

    button.disabled = false;
    button.textContent = "START THINKING →";

    addMessage(
      "BLACK BOX",
      "I'm ready. Give me a problem, question, decision, or task. I won't simply give you the answer. We'll work toward it together.",
      "ai"
    );

  } catch (error) {

    console.error(error);

    addMessage(
      "BLACK BOX",
      "I couldn't load the local AI on this device. Check the browser console for the technical error.",
      "ai"
    );

    button.disabled = true;
    button.textContent = "AI UNAVAILABLE";
  }
}


form.addEventListener("submit", async function(event) {

  event.preventDefault();

  const text = input.value.trim();

  if (!text || !engine) return;

  addMessage("YOU", text, "user");

  input.value = "";
  button.disabled = true;
  button.textContent = "THINKING...";

  messages.push({
    role: "user",
    content: text
  });

  try {

    const reply = await engine.chat.completions.create({
      messages: messages,
      temperature: 0.7,
      max_tokens: 300
    });

    const answer = reply.choices[0].message.content;

    messages.push({
      role: "assistant",
      content: answer
    });

    addMessage(
      "BLACK BOX",
      answer,
      "ai"
    );

  } catch (error) {

    console.error(error);

    addMessage(
      "BLACK BOX",
      "Something went wrong while generating the next reasoning step.",
      "ai"
    );
  }

  button.disabled = false;
  button.textContent = "SEND →";

});


function addMessage(label, text, type) {

  const message = document.createElement("div");

  message.className = `message ${type}`;

  message.innerHTML = `
    <div class="message-label">${label}</div>
    <p>${escapeHTML(text)}</p>
  `;

  chat.appendChild(message);

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth"
  });

}


function escapeHTML(text) {

  const div = document.createElement("div");

  div.textContent = text;

  return div.innerHTML;

}


startAI();
