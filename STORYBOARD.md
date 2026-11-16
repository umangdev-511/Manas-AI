# Manas: project story and demo storyboard

**Purpose:** Explain Manas as a useful project in its own right, while showing how it was shaped, what the website does, and how its technology works.

**Format:** 4–5 minute narrated product walkthrough; landscape screen recording with a presenter voiceover.

**Audience:** Students, judges, potential collaborators, counsellors, and anyone curious about multilingual support tools.

> This storyboard reconstructs a clear build narrative from the current code and product. It is not a dated development diary. Manas is a prototype; the safety and handoff boundaries below describe the implementation as it exists today.

## Story in one sentence

Manas makes the first step toward human support easier by letting someone speak naturally, receive a calm response in a familiar language, and carry useful context into a human conversation.

## Scene-by-scene storyboard

| Time | What viewers see | Narration / presenter copy | Why this scene matters |
|---|---|---|---|
| **0:00–0:20 · The first step** | Start on a quiet conversation screen. Show an empty text field, the voice control, and the language choices. Keep the interface still for a beat before the first line appears. | “Asking for support can be difficult before the conversation even begins. Someone may not know what to say, may prefer another language, or may not want to explain everything from the beginning. Manas is designed to make that first step feel smaller.” | Introduces a human problem that makes sense outside a competition or technology showcase. |
| **0:20–0:45 · The idea** | Pull back to the Manas landing screen. Highlight the line **A calmer first step, in your language**, then the distinction between support intake and a counsellor. | “Manas is a voice-first emotional-support intake prototype. Its purpose is not to replace a counsellor. It helps the person begin and gives a counsellor more context for the conversation that follows.” | Establishes the product’s role and its boundary. |
| **0:45–1:15 · How the project took shape** | Show a simple progression: problem → conversation flow → safety rules → multilingual voice → handoff view. Use code and UI only as supporting visuals. | “We shaped the project around one focused journey: someone shares what is going on, Manas listens, checks what kind of response is appropriate, and helps them find a next step. We built the conversation first, then connected speech, language support, safety routing, and the counsellor-facing summary around it.” | Explains the build process as decisions and sequence, without inventing dates or team anecdotes. |
| **1:15–1:55 · Walk through the website** | Enter the app. Point out Voice and Text, the message area, language selector, and the always-visible route to human support. Then show the agent dashboard and handoff panel. | “The website has two clear ways to begin: speak or type. The conversation stays at the centre. The language selector makes the supported languages visible, while the dashboard shows how Manas is processing the conversation. If the situation needs human attention, the interface surfaces that path and prepares a handoff summary.” | Makes the product tangible and gives viewers a map of the UI. |
| **1:55–2:35 · A conversation, not a canned demo** | Use a low-risk example: **I keep opening my assignment and closing it. I feel frozen.** Show the transcription, a contextual reply, and the spoken-response state. | “For example, someone might say, ‘I keep opening my assignment and closing it. I feel frozen.’ Manas turns the speech into text and aims to answer the details in that message with a small, achievable next step. The reply is displayed and spoken aloud, so the person can listen instead of reading a long block of text.” | Demonstrates the experience and why voice output matters. Use a non-crisis example for the main product walkthrough. |
| **2:35–3:05 · Language is part of the experience** | Switch among English, Hindi, Tamil, and Bengali. Show one short response in the selected language and the voice playback indicator. | “Language support is part of the interaction, not a decorative setting. Sarvam’s speech and language services help Manas transcribe, translate when needed, generate a reply, and speak it back. The app detects the language of the generated text so the voice output can match it.” | Explains NLP in plain language and connects the language feature to user value. |
| **3:05–3:45 · What happens behind the chat** | Animate a clean flow diagram: browser → Netlify Function → Sarvam services → Manas triage logic → response back to browser. Then show the four named roles. | “The front end is React, built with Vite. Voice requests go from the browser to a Netlify Function, which keeps the Sarvam API key on the server. Saaras handles speech-to-text, Mayura supports translation, Sarvam’s chat model generates lower-risk conversational replies, and Bulbul creates speech. Alongside those services, Manas runs its own JavaScript triage logic. Sunna handles the response, Samajhna tracks signals, Nirdeshak selects a route, and Setu prepares a counsellor brief.” | Gives a technically credible overview while distinguishing provider services from the app’s own logic. |
| **3:45–4:15 · Safety and limits** | Show a moderate-risk state and then the urgent-support state. Emphasize human support and the handoff packet. Avoid dramatic alert effects or implying dispatch. | “Safety decisions are not left entirely to a generated reply. Manas uses explicit rules and accumulated signals to choose a route. High-risk responses use predefined safety copy, and the demo can simulate a human handoff. It does not diagnose, contact emergency services, or replace professional care. A real deployment would need trained clinical oversight and an approved support workflow.” | Builds trust by explaining safeguards and limitations clearly. |
| **4:15–4:40 · A project beyond the event** | Return to the landing screen, then end on the live URL and project name. Optionally show a short roadmap card: evaluate, improve languages, connect human support responsibly. | “The project stands on a simple idea beyond this event: make it easier for someone to begin a support conversation and easier for a human to continue it with context. The next work is careful testing with counsellors and native speakers, improving language and safety evaluation, and designing a real handoff process with a qualified organisation. Manas is a starting point for that work.” | Positions Manas independently while making future work concrete and appropriately scoped. |

## Technical stack card

Use this as a short on-screen summary or answer to “What did you build it with?”

| Layer | Current implementation |
|---|---|
| Website | React, JavaScript, Vite, CSS |
| Server-side API bridge | Netlify Functions; the Sarvam key is stored as a server environment variable |
| Speech recognition | Sarvam Saaras v3 |
| Translation | Sarvam Mayura v1 |
| Contextual replies | Sarvam 105B Conversations on the lower-risk path, with a response guard and fallback |
| Spoken replies | Sarvam Bulbul v3 |
| Safety and routing | Manas JavaScript triage engine using explicit signal patterns, accumulated evidence, and deterministic routes |
| Counsellor handoff | Setu creates a structured demo brief; actual dispatch is not implemented |
| Hosting | Netlify static site and serverless function |

## How to describe Manas outside the competition

**Short version:**

> Manas is a multilingual voice-first support intake prototype that helps people share what is going on, offers a calm next step, and prepares context for a human counsellor.

**Longer version:**

> Manas explores how voice interfaces and Indian-language AI can make the first step toward emotional support easier. It combines a conversational website, multilingual speech, explicit safety routing, and a counsellor-facing handoff summary. The project is designed to support human care, not replace it.

**Avoid claiming:**

- that Manas diagnoses or provides therapy;
- that all risk is understood by AI or that the current pattern-based checks are clinically validated;
- that a counsellor or emergency service is automatically contacted;
- that the current prototype is ready for unsupervised public-health deployment.

## Demo preparation notes

- Start with the low-risk assignment example so viewers understand the normal conversation before seeing safety routing.
- Show the language selector and spoken reply; these make the voice-first value easy to see.
- Use the built-in judge demo for urgent escalation so the route is repeatable. Explain that it is a simulation.
- Keep secrets off screen. The Sarvam key belongs in Netlify’s environment settings or a local `.env` file, never in browser code or a recording.
- End on the product’s purpose and next responsible step, rather than on the competition label.

## Source map

- App flow and orchestration: `src/App.jsx`
- Sarvam browser calls: `src/services/sarvamVoice.js`
- Server-side API proxy and reply prompt: `netlify/functions/sarvam.cjs`
- Signal scoring and triage: `src/triage/triageEngine.js`
- Sunna response behavior: `src/agents/sunna.js`
- Supporting agent roles: `src/agents/samajhna.js`, `src/agents/nirdeshak.js`, `src/agents/setu.js`
