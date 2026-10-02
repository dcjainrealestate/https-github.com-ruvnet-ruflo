# CallCoach AI: Phase 0 prototype

Validates conversation quality (PRD Phase 0): one persona, one scenario, a hands-free voice call with an AI prospect, a transcript, and rubric scoring with evidence-linked coaching.

## Run

```bash
cd callcoach
npm install
export ANTHROPIC_API_KEY=...   # used by the persona and the coach
npm start                      # http://localhost:3000
```

`npm run mock` runs the whole UI with canned replies and no AI calls. Use it for demos and UI work.

Use Chrome or Edge with headphones. Voice uses the browser's speech recognition and speech synthesis; you can type lines at any time instead.

## What's in it

| PRD item | Where |
|---|---|
| Scenario brief, approved facts, visible scorecard; hidden facts stay server-side | `src/scenario.js` (`publicScenario`) |
| Persona behaviour rules, earned disclosure, objection escalation, per-attempt variation | `src/prompts.js`, `buildVariation` |
| Continuous listening (no push-to-talk), barge-in, echo filtering, mic test | `public/voice.js` |
| Weighted scorecard and certification rules (≥80 overall, discovery and objections ≥70, no critical failure) computed in code | `src/scoring.js` |
| Coaching: per-criterion evidence, 3 strengths, 3 improvements with suggested wording, prospect thoughts, micro-drill | `src/scoring.js` schema, results UI |
| Retry loop and comparison with earlier attempts | `public/app.js` |
| Rep-side call recording for playback | `public/voice.js` (`MicRecorder`) |

Model: `claude-opus-5-5` (override with `CALLCOACH_MODEL`). Persona turns run at low effort so replies come back quickly. Scoring runs at high effort with structured JSON output. Both requests opt into server-side fallback, so if the primary model declines a request, another model handles it instead of the call failing.

## Phase 0 limits

- Turn-based browser speech, not a realtime speech-to-speech model: expect a noticeable pause before each reply (not yet measured against a live key), and the customer can't interrupt you mid-sentence. Swapping in a realtime voice provider is the main Phase 1 change.
- Calls are held in memory, attempt history is per browser, and there are no logins.
- The recording has the rep's mic only; the customer's voice is in the transcript.

## Test

```bash
npm test
```
