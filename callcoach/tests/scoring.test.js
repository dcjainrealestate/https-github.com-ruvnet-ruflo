import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeResult } from '../src/scoring.js';
import { SCORECARD } from '../src/scenario.js';

const evaluation = (scores, extra = {}) => ({
  criteria: SCORECARD.criteria.map((c) => ({ id: c.id, score: scores[c.id] ?? 85, rationale: 'r', evidence: [] })),
  critical_failures: [],
  strengths: [], improvements: [], prospect_thoughts: [],
  hidden_concern_uncovered: true, micro_practice: 'drill',
  ...extra,
});

test('weights add up to 100', () => {
  assert.equal(SCORECARD.criteria.reduce((s, c) => s + c.weight, 0), 100);
});

test('uniform 85 passes with overall 85', () => {
  const r = computeResult(evaluation({}));
  assert.equal(r.overall, 85);
  assert.equal(r.passed, true);
  assert.deepEqual(r.failReasons, []);
});

test('weighted average uses criterion weights', () => {
  // discovery (20%) at 35, everything else at 100 -> 87
  const r = computeResult(evaluation({ discovery: 35, opening: 100, rapport: 100, accuracy: 100, objections: 100, control: 100, cta: 100, compliance: 100 }));
  assert.equal(r.overall, 87);
  assert.equal(r.passed, false, 'discovery below its 70 minimum must fail even with a high overall');
});

test('critical failure fails a high score', () => {
  const r = computeResult(evaluation({}, { critical_failures: [{ criterion_id: 'compliance', turn: 4, description: 'Guaranteed returns' }] }));
  assert.equal(r.overall, 85);
  assert.equal(r.passed, false);
});

test('overall below threshold fails', () => {
  const r = computeResult(evaluation(Object.fromEntries(SCORECARD.criteria.map((c) => [c.id, 75]))));
  assert.equal(r.passed, false);
});

test('missing criterion scores 0 and fails; scores are clamped', () => {
  const ev = evaluation({ opening: 140 });
  ev.criteria = ev.criteria.filter((c) => c.id !== 'cta');
  const r = computeResult(ev);
  assert.equal(r.criteria.find((c) => c.id === 'opening').score, 100);
  assert.equal(r.criteria.find((c) => c.id === 'cta').score, 0);
  assert.equal(r.passed, false);
});
