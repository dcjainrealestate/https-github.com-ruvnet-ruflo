import Anthropic from '@anthropic-ai/sdk';
import { personaSystemPrompt, scorerSystemPrompt, toPersonaMessages, formatTranscript, stripEndToken } from './prompts.js';
import { EVALUATION_SCHEMA } from './scoring.js';
import { SCORECARD } from './scenario.js';

const MODEL = process.env.CALLCOACH_MODEL || 'claude-opus-5-5';
// MOCK=1 runs the UI end to end with canned replies and no API calls.
export const MOCK = process.env.MOCK === '1';

let client;
const getClient = () => (client ??= new Anthropic());

// Server-side fallback re-runs a request on another model if the primary
// model's safety classifiers decline it, instead of failing the call.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

function textOf(response) {
  if (response.stop_reason === 'refusal') {
    const err = new Error('The model declined this request.');
    err.code = 'refusal';
    throw err;
  }
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

export async function customerReply(variation, turns) {
  if (MOCK) return mockReply(turns);
  const response = await getClient().beta.messages.create({
    ...FALLBACK,
    model: MODEL,
    max_tokens: 2000,
    // Low effort keeps the spoken reply fast; persona realism comes from the prompt.
    output_config: { effort: 'low' },
    // The system prompt is fixed for the whole call, so cache it.
    system: [{ type: 'text', text: personaSystemPrompt(variation), cache_control: { type: 'ephemeral' } }],
    messages: toPersonaMessages(turns),
  });
  const { text, ended } = stripEndToken(textOf(response));
  return { text: text || '...', ended };
}

export async function evaluateCall(turns) {
  if (MOCK) return mockEvaluation(turns);
  const stream = getClient().beta.messages.stream({
    ...FALLBACK,
    model: MODEL,
    max_tokens: 32000,
    output_config: { effort: 'high', format: { type: 'json_schema', schema: EVALUATION_SCHEMA } },
    system: scorerSystemPrompt(),
    messages: [{ role: 'user', content: `Evaluate this call.\n\n<transcript>\n${formatTranscript(turns)}\n</transcript>` }],
  });
  const response = await stream.finalMessage();
  if (response.stop_reason === 'max_tokens') throw new Error('Evaluation was cut off; try again.');
  return JSON.parse(textOf(response));
}

const MOCK_LINES = [
  'Hello?',
  'Yes, I filled a form for Aranya Heights. I only have a couple of minutes though.',
  'Honestly the price seems high compared to the other projects I am looking at.',
  'Can you just send me the details on WhatsApp? I will go through them.',
  'Well, my factory is near the expressway and the kids\' school is in the old city, so the commute matters most.',
  'Okay, a Sunday morning could work. My wife needs to see it too.',
];

function mockReply(turns) {
  const n = turns.filter((t) => t.speaker === 'customer').length;
  if (n >= MOCK_LINES.length) return { text: 'Alright, see you on Sunday then. Bye.', ended: true };
  return { text: MOCK_LINES[n], ended: false };
}

function mockEvaluation(turns) {
  const firstRep = turns.findIndex((t) => t.speaker === 'rep') + 1 || 1;
  return {
    criteria: SCORECARD.criteria.map((c, i) => ({
      id: c.id,
      score: 70 + ((i * 7) % 25),
      rationale: `Mock rationale for ${c.name}.`,
      evidence: [{ turn: firstRep, quote: (turns[firstRep - 1]?.text || '').slice(0, 60) }],
    })),
    critical_failures: [],
    strengths: [1, 2, 3].map((k) => ({ turn: firstRep, point: `Mock strength ${k}.` })),
    improvements: [1, 2, 3].map((k) => ({
      turn: firstRep, title: `Mock improvement ${k}`, detail: 'Mock detail.', suggested_wording: 'Mock wording.',
    })),
    prospect_thoughts: [{ turn: firstRep, thought: 'Mock: who is this and why are they calling?' }],
    hidden_concern_uncovered: false,
    micro_practice: 'Mock drill: practise three open discovery questions about daily routine.',
  };
}
