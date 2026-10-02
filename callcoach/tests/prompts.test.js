import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPersonaMessages, stripEndToken, personaSystemPrompt, formatTranscript } from '../src/prompts.js';
import { buildVariation, publicScenario, SCENARIO } from '../src/scenario.js';

test('persona messages start and end with the user role', () => {
  const turns = [
    { speaker: 'customer', text: 'Hello?' },
    { speaker: 'rep', text: 'Hi, this is Priya from Greenline.' },
  ];
  const m = toPersonaMessages(turns);
  assert.equal(m[0].role, 'user');
  assert.equal(m.at(-1).role, 'user');
  assert.deepEqual(m.map((x) => x.role), ['user', 'assistant', 'user']);
});

test('interruption is noted for the persona and the transcript', () => {
  const turns = [
    { speaker: 'customer', text: 'Well the thing is', interrupted: true },
    { speaker: 'rep', text: 'Sorry, go on.' },
  ];
  const m = toPersonaMessages(turns);
  assert.match(m[2].content, /cut you off/);
  assert.match(formatTranscript(turns), /CUSTOMER \[interrupted\]/);
});

test('end token is detected and removed', () => {
  assert.deepEqual(stripEndToken('Okay, bye. [END_CALL]'), { text: 'Okay, bye.', ended: true });
  assert.deepEqual(stripEndToken('Go on.'), { text: 'Go on.', ended: false });
});

test('variation is deterministic per seed and differs across seeds', () => {
  assert.deepEqual(buildVariation(42), buildVariation(42));
  const orders = new Set([1, 2, 3, 4, 5, 6].map((s) => buildVariation(s).objectionOrder.join('|')));
  assert.ok(orders.size > 1);
});

test('public scenario never leaks hidden facts or the objection bank', () => {
  const json = JSON.stringify(publicScenario());
  for (const fact of SCENARIO.persona.hiddenFacts) assert.ok(!json.includes(fact.slice(0, 40)));
  for (const o of SCENARIO.persona.objections) assert.ok(!json.includes(o));
});

test('persona prompt includes hidden facts and the attempt mood', () => {
  const v = buildVariation(7);
  const p = personaSystemPrompt(v);
  assert.ok(p.includes(v.mood));
  assert.ok(p.includes('commute'));
});
