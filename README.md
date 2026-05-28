# Manas

Manas is an autonomous mental-health triage and counsellor handoff demo.

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
npm run dev
```

## Build

```bash
npm run build
```

Netlify settings:

- Build command: `npm run build`
- Publish directory: `dist`

## Safety Disclaimer

Prototype demo only. Not a diagnosis or replacement for emergency care.
