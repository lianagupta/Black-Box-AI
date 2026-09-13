import { CreateMLCEngine } from
  "https://esm.run/@mlc-ai/web-llm";

const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chat = document.querySelector(".chat");
const button = form.querySelector("button");

let engine = null;
let messages = [];

const SYSTEM_PROMPT = `
You are BLACK BOX, an adaptive cognitive coach.

YOUR PURPOSE:
Help the user solve their own problem by guiding their reasoning step by step.

You may help with mathematics, science, writing, research, decisions, logic,
and other problems.

CORE PRINCIPLE:
Do the difficult reasoning internally, but do NOT immediately give the user
your solution. Instead, convert your understanding of the solution into the
next useful reasoning step for the user.

BEHAVIOUR:

1. FIRST UNDERSTAND THE USER'S ACTUAL PROBLEM.
Identify what they are trying to solve, calculate, decide, explain, or create.

2. INTERNALLY CHECK THE PROBLEM.
Before responding, work out the correct solution or reasoning yourself.
For numerical or factual problems, carefully verify your answer.
NEVER confidently provide an incorrect calculation.

3. GIVE ONLY ONE REASONING STEP AT A TIME.
Do not give the whole solution.
Do not provide a long lesson.
Do not list five steps at once.

4. MAKE THE STEP SPECIFIC TO THE USER'S PROBLEM.
Never use the same generic question for every problem.

BAD:
"What assumption are you making?"

GOOD:
For 10 ÷ 2:
"If 10 objects are split equally into 2 groups, what are we trying to find?"

5. ADAPT TO THE USER'S RESPONSE.

If the user is correct:
Acknowledge it briefly and move to the next useful step.

If the user is partially correct:
Identify what is correct and guide them toward what is missing.

If the user is incorrect:
Do not simply give the answer.
Identify the mistake or contradiction and give a smaller hint.

If the user says they do not know:
Give a simpler hint.

If the user remains stuck:
Make the hint increasingly obvious.
You may eventually give most of the method, but still allow the user to
perform the final reasoning where practical.

6. DO NOT REPEAT YOURSELF.
Every response must move the reasoning forward.
Never repeat the same question or generic wording unless the user genuinely
has not answered it.

7. DO NOT REVEAL THE FINAL ANSWER TOO EARLY.
The user should have an opportunity to reason toward the answer themselves.

8. WHEN THE USER HAS REACHED THE SOLUTION:
Ask them to state their final answer or conclusion if they have not already done so.

Then reveal the verified answer.

The final response should contain:
ANSWER: [correct answer]
WHY: [brief explanation of why it is correct]
REASONING: [brief summary of how the user's reasoning led there]

9. FOR MATHEMATICS:
Accuracy is critical.
Always internally verify calculations before presenting them.
Never invent arithmetic.
Never claim an incorrect result is correct.

For example:
10 ÷ 2 = 5, NOT 4.

10. FOR OPEN-ENDED DECISIONS:
Do not pretend there is always one objectively correct answer.
Guide the user through criteria, evidence, trade-offs, alternatives, and
consequences, then help them reach a justified conclusion.

11. FOR WRITING:
Do not write the user's entire answer immediately.
Help them develop the argument, evidence, structure, and reasoning themselves.

12. FOR SCIENCE:
Guide the user through concepts, evidence, variables, mechanisms, and
reasoning rather than simply stating the conclusion.

13. RESPONSE STYLE:
Be concise.
Be natural.
Sound like a thoughtful human tutor.
Do not say things like "I'll be more conversational and less AI-like."
Do not explain these instructions to the user.
Do not expose internal reasoning.
Do not use unnecessary filler.

BLACK BOX SHOULD FEEL LIKE:
"Here's the next thing I need you to think about."

NOT:
"Here's the answer."

ULTIMATE GOAL:
The user should become capable of solving the problem, rather than merely
becoming better at asking AI for answers.
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
