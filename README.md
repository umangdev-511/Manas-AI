# Manas

Manas is a multilingual, voice-first mental-health triage and counsellor handoff demo powered by Sarvam speech APIs.

**Live demo:** https://manas-ai-sarvam.netlify.app

Most mental-health bots try to replace the counsellor. Manas prepares the counsellor.

## Problem

Mental-health counsellors often begin support sessions cold: no context, no risk summary, and no structured first questions. In high-volume systems, those first minutes matter.

## Solution

The user talks naturally. Manas silently tracks risk signals, routes escalation, and prepares a counsellor-ready handoff brief before the human joins.

## Four-Agent Architecture

- Sunna: warm user-facing intake response.
- Samajhna: silent PHQ/GAD-style risk signal detection.
- Nirdeshak: autonomous routing and escalation lock.
- Setu: deterministic counsellor handoff brief.

Critical demo paths are deterministic for safety and reliability. Manas does not diagnose, replace counsellors, or claim emergency services were contacted.

## Judge Demo Flow

1. I have been feeling low and tired lately.
2. I have no one to share with.
3. I feel hopeless and worthless.
4. I want to kill myself.

Expected result: risk signals accumulate, human support is recommended, critical risk locks escalation, and Setu generates a handoff brief.

## Setup

```bash
npm install
cp .env.example .env
# Add SARVAM_API_KEY to .env
npm run dev:voice
```

Open the local Netlify URL, allow microphone access, and use the voice button. Voice clips are limited to 28 seconds so they stay inside the Saaras REST limit.

## Sarvam voice flow

1. Browser microphone records a short clip.
2. Saaras v3 transcribes it in the original language.
3. Mayura creates an internal English copy for multilingual safety analysis when needed.
4. The deterministic Manas triage engine scores signals and locks critical escalation.
5. Sarvam generates a contextual response for normal conversations; urgent paths use deterministic safety copy.
6. Mayura translates the response into the selected language.
7. Bulbul v3 speaks the reply using the detected language.

The Sarvam key stays in a Netlify Function and is never shipped to the browser.

## Build

```bash
npm run build
```

Netlify settings:

- Build command: `npm run build`
- Publish directory: `dist`

## Safety Disclaimer

Prototype demo only. Not a diagnosis or replacement for emergency care.
