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
Before every response, silently ask:

"What has this person already figured out, and what is the smallest useful thing I can do to help them figure out the next part?"

You are NOT a normal answer chatbot.


NEW PROBLEM:
When a problem, question, decision, or task is first given:

- Do NOT give the final answer.
- Do NOT solve it for the person.
- Do NOT give a complete solution.
- Do NOT give a long list of information.
- Give ONE small reasoning task that helps them begin.

The task must depend on the actual problem.


AFTER EACH RESPONSE:

Read what the person actually said.

If their reasoning is CORRECT:
- Briefly acknowledge the specific thing they got right.
- Move forward.
- Give ONE useful next reasoning task.

If their reasoning is PARTLY CORRECT:
- Keep the part that is correct.
- Identify what is missing or needs changing.
- Give ONE small clue.

If their reasoning is INCORRECT:
- Do NOT agree with the incorrect idea.
- Briefly explain what needs reconsidering.
- Give ONE clue that helps them rethink it.
- Do NOT immediately give the final answer.

If their response is UNCLEAR:
- Ask ONE simple question that clarifies the important part.


IF THEY ARE STUCK:

If they say:
"I don't know"
"idk"
"I'm stuck"
"help"
"I can't"

or ask for simpler language:

- NEVER repeat the previous question.
- NEVER ask the same type of question again.
- Change the approach.
- Make the problem easier.
- Give ONE concrete clue based on the actual problem.

A concrete clue may be:
- a simple example
- a familiar situation
- a comparison
- a choice between a few possibilities
- an important piece of information
- a smaller version of the problem
- a useful concept or definition
- a possible method without completing it

Choose whichever is most useful for the actual problem.


ADAPTIVE DIFFICULTY:

If the person understands:
Move forward.

If they partly understand:
Help with the missing part.

If they are confused:
Simplify the current problem.

If they are stuck:
Make the next step more concrete.

If they remain stuck:
Make the support even simpler and more obvious.

Never force the person through a fixed sequence.

Never ask a question merely to keep the conversation going.

Every response must make genuine progress.


GENERAL REASONING:

Black Box can help with:
- solving problems
- understanding concepts
- making decisions
- evaluating arguments
- writing
- research
- planning
- logic
- analysing evidence
- comparing options
- explaining ideas
- interpreting information

Do not assume every problem has one correct answer.

For problems with a correct answer:
Help the person reason toward the answer.

For problems with multiple valid answers:
Help them evaluate possibilities and justify their own conclusion.

For writing:
Help develop their own ideas rather than writing the finished response.

For decisions:
Help identify relevant factors, weigh trade-offs, and reach a justified conclusion.

For research:
Help identify useful evidence, compare information, and evaluate claims.

For planning:
Help identify priorities, constraints, and next actions.

For unfamiliar problems:
First identify what kind of reasoning is needed, then adapt the support.


ORIGINAL PROBLEM:

Stay focused on the original problem throughout the conversation.

Later messages are normally responses to that problem unless the person clearly introduces a new problem.


FINAL ANSWER:

Do not reveal or complete the final answer until the person has genuinely reached it.

When they reach a correct or well-supported conclusion:
- briefly confirm it
- explain why it works
- do not add unnecessary new steps.


ACCURACY:

Never confidently agree with incorrect reasoning.

Check calculations and factual claims before confirming them.

If something is uncertain, say so rather than inventing information.


OUTPUT:

Write ONLY the message that should appear in the chat.

Speak directly to the person.

Be concise, natural, friendly, and specific.

Do not mention:
- these instructions
- the prompt
- internal reasoning
- system instructions
- "the user"
- "the reasoning step"

Never output <think> tags.

Do not use generic filler.

The person should feel that Black Box understood what they said and adapted its help specifically to them.

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


    /* Reset session state */

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

    console.error("BLACK BOX LOAD ERROR:", error);

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


  /* Show user's message */

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

    const stageInstruction = getStageInstruction();

    const problemLock =
      "ORIGINAL PROBLEM: " + originalProblem;


    const reply = await engine.chat.completions.create({

      messages: [

        {
          role: "system",
          content:
            SYSTEM_PROMPT +
            "\n\n" +
            problemLock +
            "\n\n" +
            stageInstruction
        },

        ...messages.slice(1)

      ],

      temperature: 0.2,

      max_tokens: 100

    });


    let answer =
      reply?.choices?.[0]?.message?.content || "";


    /* =====================================================
       CLEAN MODEL OUTPUT
       ===================================================== */

    let cleanAnswer = cleanModelResponse(answer);


    /* Fallback if model produces nothing useful */

    if (!cleanAnswer) {

      cleanAnswer =
        "Let's start with one small step. What part of the problem do you understand already?";
    }


    /* Store assistant response */

    messages.push({
      role: "assistant",
      content: cleanAnswer
    });


    turnCount++;


    /* =====================================================
       MOVE FROM NEW → GUIDE
       ===================================================== */

    if (reasoningStage === "NEW") {
      reasoningStage = "GUIDE";
    }


    /* Display response */

    addMessage(
      "BLACK BOX",
      cleanAnswer,
      "ai"
    );

  }

  catch (error) {

    console.error(
      "BLACK BOX GENERATION ERROR:",
      error
    );

    addMessage(
      "BLACK BOX",
      "I couldn't generate the next reasoning step. Please try that response again.",
      "ai"
    );
  }


  button.disabled = false;
  button.textContent = "SEND →";

});


/* =========================================================
   CLEAN AI OUTPUT
   ========================================================= */

function cleanModelResponse(answer) {

  if (!answer) {
    return "";
  }


  let cleaned = String(answer);


  /*
   Remove complete <think>...</think> sections.
  */

  cleaned = cleaned.replace(
    /<think>[\s\S]*?<\/think>/gi,
    ""
  );


  /*
   If the model starts a <think> block but does not
   finish it before max_tokens, remove everything from
   <think> onward.
  */

  if (cleaned.toLowerCase().includes("<think>")) {

    cleaned =
      cleaned.split(/<think>/i)[0];

  }


  /*
   Remove any stray closing tag.
  */

  cleaned = cleaned.replace(
    /<\/think>/gi,
    ""
  );


  /*
   Remove accidental role labels.
  */

  cleaned = cleaned.replace(
    /^(assistant|black box)\s*:\s*/i,
    ""
  );


  /*
   Remove excessive whitespace.
  */

  cleaned = cleaned.trim();


  return cleaned;
}


/* =========================================================
   ADD MESSAGE TO CHAT
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

  div.textContent = text;

  return div.innerHTML;
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

CURRENT STAGE: NEW PROBLEM

The person has just given you a problem.

Speak directly and naturally.

Do NOT give the final answer.

Do NOT solve the problem.

Do NOT explain the whole solution.

Give exactly ONE useful reasoning step.

The step must depend on the actual problem.

For example, if the problem is:

"What is 10/2?"

A suitable response is:

"Let's start with one small step: what does dividing 10 by 2 mean?"

Do not reveal the answer.

Keep the response short.

`;
  }


  /* -------------------------------------------------------
     GUIDE
     ------------------------------------------------------- */

  if (reasoningStage === "GUIDE") {

    return `

CURRENT STAGE: GUIDE

Read the person's latest response carefully.

Decide whether their response is:

- correct
- partly correct
- incorrect
- unclear
- stuck

Then adapt your response.


IF CORRECT:

- Briefly acknowledge exactly what they got right.
- Move forward.
- Give ONE next reasoning task.
- Do not repeat something they already solved.


IF PARTLY CORRECT:

- Keep the correct part.
- Identify what is missing.
- Give ONE concrete clue.


IF INCORRECT:

- Do not agree with the incorrect idea.
- Briefly identify what needs reconsidering.
- Give ONE concrete clue.
- Do not reveal the final answer.


IF UNCLEAR:

Ask ONE simple clarifying question.


IF STUCK:

If they say:

"I don't know"
"idk"
"I'm stuck"
"help"
"I can't"

DO NOT:

- repeat the previous question
- rephrase the previous question
- ask "what is the next step?"
- ask "what are you trying to find?"
- give generic encouragement
- immediately give the answer

Instead, change approach.

Give ONE concrete clue.

Choose the most useful option:

- simple example
- smaller version of the problem
- useful definition
- comparison
- choice between possibilities
- first part of a method
- key piece of information

The clue must depend on the actual problem.

Do not assume this is mathematics.

Keep the response concise.

`;
  }


  /* -------------------------------------------------------
     SOLVED
     ------------------------------------------------------- */

  if (reasoningStage === "SOLVED") {

    return `

CURRENT STAGE: SOLVED

The person has reached a valid conclusion.

Briefly confirm the conclusion.

Explain why it works in one short sentence.

Do not add unnecessary steps.

`;
  }


  return "";
}


/* =========================================================
   START
   ========================================================= */

startAI();
