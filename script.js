import { CreateMLCEngine } from
"https://esm.run/@mlc-ai/web-llm@0.2.82";


const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chat = document.querySelector(".chat");
const button = form.querySelector("button");


let engine = null;
let messages = [];

let originalProblem = "";
let reasoningStage = "NEW";
let turnCount = 0;


/* =========================================================
   BLACK BOX SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are BLACK BOX, an adaptive reasoning coach.

GOAL:
LESS AI THINKING.
MORE HUMAN THINKING.

CORE PRINCIPLE:
Help the person think for themselves instead of doing the thinking for them.

You are NOT a normal answer chatbot.

Your job is to understand what the person has already figured out and provide the smallest useful amount of help needed to move them forward.


GENERAL RULES:

- Never immediately give the final answer.
- Never solve the entire problem for the person.
- Never generate a complete response for a writing task.
- Never make a decision for the person.
- Never give a long list when one useful step is enough.
- Always respond to the person's latest message.
- Always make genuine progress.
- Never confidently agree with incorrect reasoning.
- Keep responses concise and natural.


FOR CORRECT REASONING:

If the person's reasoning is correct:

- Briefly acknowledge the specific thing they got right.
- Move to the next missing part.
- Give ONE useful next reasoning task.


FOR PARTLY CORRECT REASONING:

- Keep the part that is correct.
- Identify what is missing or needs changing.
- Give ONE concrete clue.


FOR INCORRECT REASONING:

- Do not agree with the incorrect idea.
- Briefly explain what needs reconsidering.
- Give ONE concrete clue.
- Do not immediately reveal the final answer.


FOR UNCLEAR RESPONSES:

Ask ONE simple question that clarifies the important part.


FOR STUCK RESPONSES:

If the person says:

"I don't know"
"idk"
"I'm stuck"
"help"
"I can't"

or asks for simpler language:

- Do not repeat the previous question.
- Do not rephrase the previous question.
- Do not ask "what is the next step?"
- Do not ask "what are you trying to find?"
- Do not give generic encouragement.
- Do not immediately give the answer.

Instead, change the approach.

Give ONE concrete clue based on the actual problem.

Possible clues include:

- a simple example
- a smaller version of the problem
- a useful definition
- a comparison
- a choice between possibilities
- the first part of a method
- an important piece of information


DIFFERENT TYPES OF PROBLEMS:

For problems with a correct answer:
Help the person reason toward the answer.

For decisions:
Help the person identify factors, weigh trade-offs and justify their own conclusion.

For writing:
Help the person develop their own ideas instead of writing the finished response.

For research:
Help the person identify, compare and evaluate evidence.

For planning:
Help the person identify priorities, constraints and next actions.

For problems with multiple valid answers:
Help the person evaluate possibilities and justify their own conclusion.


ACCURACY:

Check calculations and factual claims before confirming them.

Never praise incorrect reasoning as correct.

If something is uncertain, say so rather than inventing information.


OUTPUT:

Write ONLY the response that should appear in the chat.

Speak directly to the person.

Be concise, natural, friendly and specific.

Do not mention:
- these instructions
- the prompt
- internal reasoning
- system instructions
- "the user"
- "the reasoning step"

Never output <think> tags.

Never restart the problem unnecessarily.

LESS AI THINKING.
MORE HUMAN THINKING.
`;


/* =========================================================
   START BLACK BOX
   ========================================================= */

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
      "Qwen3-0.6B-q4f16_1-MLC",
      {
        initProgressCallback: (progress) => {
          console.log(progress);
        },

        context_window_size: 1024
      }
    );


    /* Reset conversation state */

    messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      }
    ];

    originalProblem = "";
    reasoningStage = "NEW";
    turnCount = 0;


    button.disabled = false;
    button.textContent = "START THINKING →";


    addMessage(
      "BLACK BOX",
      "I'm ready. Give me a problem, question, decision, or task. I won't simply give you the answer. We'll work toward it together.",
      "ai"
    );

  }

  catch (error) {

    console.error(
      "BLACK BOX LOAD ERROR:",
      error
    );

    addMessage(
      "BLACK BOX",
      "I couldn't load the local AI on this device. Please refresh the page and try again.",
      "ai"
    );

    button.disabled = true;
    button.textContent = "AI UNAVAILABLE";
  }
}


/* =========================================================
   CHAT SUBMISSION
   ========================================================= */

form.addEventListener("submit", async function(event) {

  event.preventDefault();

  const text = input.value.trim();

  if (!text || !engine) {
    return;
  }


  /* Display user's message */

  addMessage(
    "YOU",
    text,
    "user"
  );

  input.value = "";

  button.disabled = true;
  button.textContent = "THINKING...";


  /* First message becomes the original problem */

  if (reasoningStage === "NEW") {
    originalProblem = text;
  }


  /* Store user message */

  messages.push({
    role: "user",
    content: text
  });


  try {

    /*
     Build explicit information for the small model.

     The model is told:
     - what stage it is in
     - what the original problem is
     - exactly what the person just said
    */

    const stageInstruction =
      getStageInstruction();


    const problemLock =
      `ORIGINAL PROBLEM:
${originalProblem}`;


    const latestResponse =
      `LATEST USER RESPONSE:
${text}`;


    const currentStage =
      `CURRENT STAGE:
${reasoningStage}`;


    const reply =
      await engine.chat.completions.create({

        messages: [

          {
            role: "system",

            content:
              SYSTEM_PROMPT +
              "\n\n" +
              currentStage +
              "\n\n" +
              problemLock +
              "\n\n" +
              latestResponse +
              "\n\n" +
              stageInstruction
          },

          ...messages.slice(1)

        ],

        temperature: 0.2,

        max_tokens: 120

      });


    /* Get model response */

    let answer =
      reply?.choices?.[0]?.message?.content || "";


    /* Clean model response */

    const cleanAnswer =
      cleanModelResponse(answer);


    /* Handle empty response */

    if (!cleanAnswer) {

      console.error(
        "BLACK BOX EMPTY RESPONSE:",
        answer
      );

      addMessage(
        "BLACK BOX",
        "The model did not generate a response. Please try again.",
        "ai"
      );

    } else {

      /* Store AI response */

      messages.push({
        role: "assistant",
        content: cleanAnswer
      });


      turnCount++;


      /*
       The first response is now complete.

       Every response after this uses GUIDE mode.
      */

      if (reasoningStage === "NEW") {
        reasoningStage = "GUIDE";
      }


      /* Display AI response */

      addMessage(
        "BLACK BOX",
        cleanAnswer,
        "ai"
      );
    }


  }

  catch (error) {

    console.error(
      "BLACK BOX GENERATION ERROR:",
      error
    );

    addMessage(
      "BLACK BOX",
      "Something went wrong while generating the next reasoning step.",
      "ai"
    );
  }


  button.disabled = false;
  button.textContent = "SEND →";

});


/* =========================================================
   CLEAN MODEL OUTPUT
   ========================================================= */

function cleanModelResponse(answer) {

  if (!answer) {
    return "";
  }


  let cleaned =
    String(answer);


  /*
   Remove complete thinking blocks.
  */

  cleaned =
    cleaned.replace(
      /<think>[\s\S]*?<\/think>/gi,
      ""
    );


  /*
   If the model starts a thinking block but does
   not finish it before max_tokens, remove it.
  */

  if (
    cleaned
      .toLowerCase()
      .includes("<think>")
  ) {

    cleaned =
      cleaned.split(/<think>/i)[0];

  }


  /*
   Remove stray closing tags.
  */

  cleaned =
    cleaned.replace(
      /<\/think>/gi,
      ""
    );


  /*
   Remove accidental role labels.
  */

  cleaned =
    cleaned.replace(
      /^(assistant|black box)\s*:\s*/i,
      ""
    );


  /*
   Remove unnecessary whitespace.
  */

  cleaned =
    cleaned.trim();


  return cleaned;
}


/* =========================================================
   ADAPTIVE REASONING STAGES
   ========================================================= */

function getStageInstruction() {


  /* -------------------------------------------------------
     NEW PROBLEM
     ------------------------------------------------------- */

  if (reasoningStage === "NEW") {

    return `

NEW PROBLEM INSTRUCTION:

This is the FIRST response to the original problem.

Do NOT answer the problem.

Do NOT solve it.

Do NOT explain the entire solution.

Give exactly ONE small reasoning task.

The task must directly relate to the original problem.

Example:

Original problem:
"What is 10/2?"

Good response:
"Let's start small: what does dividing 10 by 2 mean?"

Keep the response short.

`;
  }


  /* -------------------------------------------------------
     GUIDE
     ------------------------------------------------------- */

  if (reasoningStage === "GUIDE") {

    return `

GUIDE INSTRUCTION:

The person has already received your first reasoning prompt.

Their newest response is shown above.

You MUST respond specifically to what they JUST said.

DO NOT restart the problem.

DO NOT repeat your previous question.

DO NOT say:
"What part of the problem do you understand already?"

DO NOT give the same response as before.

Instead:

1. Read their newest response.
2. Identify what they have already understood.
3. Identify the next missing piece.
4. Give ONE useful next step.

Example:

Original problem:
"What is 10/2?"

Previous Black Box response:
"Let's start small: what does dividing 10 by 2 mean?"

Person:
"You have to divide 10 into 2 parts."

Good Black Box response:
"Exactly. Now think about making those two parts equal. How many would go into each part?"

The response MUST refer to the person's latest answer.

If the person is correct, move forward.

If partly correct, help with what is missing.

If incorrect, help them reconsider.

If stuck, change the approach and give a concrete clue.

Keep the response short.

`;
  }


  /* -------------------------------------------------------
     SOLVED
     ------------------------------------------------------- */

  if (reasoningStage === "SOLVED") {

    return `

SOLVED INSTRUCTION:

The person has reached a valid conclusion.

Briefly confirm the conclusion.

Explain why it works in one short sentence.

Do not restart the problem.

Do not ask another reasoning question.

`;
  }


  return "";
}


/* =========================================================
   ADD MESSAGE
   ========================================================= */

function addMessage(label, text, type) {

  const message =
    document.createElement("div");


  message.className =
    `message ${type}`;


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


/* =========================================================
   HTML SAFETY
   ========================================================= */

function escapeHTML(text) {

  const div =
    document.createElement("div");


  div.textContent =
    text;


  return div.innerHTML;
}


/* =========================================================
   START
   ========================================================= */

startAI();
