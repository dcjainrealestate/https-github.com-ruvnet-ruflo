import { SCORECARD } from './scenario.js';

// JSON schema for the coach's structured output. Weighting and pass/fail are
// computed in code from these criterion scores, never by the model.
export const EVALUATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['criteria', 'critical_failures', 'strengths', 'improvements',
    'prospect_thoughts', 'hidden_concern_uncovered', 'micro_practice'],
  properties: {
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'score', 'rationale', 'evidence'],
        properties: {
          id: { type: 'string', enum: SCORECARD.criteria.map((c) => c.id) },
          score: { type: 'integer' },
          rationale: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['turn', 'quote'],
              properties: { turn: { type: 'integer' }, quote: { type: 'string' } },
            },
          },
        },
      },
    },
    critical_failures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['criterion_id', 'turn', 'description'],
        properties: {
          criterion_id: { type: 'string', enum: ['accuracy', 'compliance'] },
          turn: { type: 'integer' },
          description: { type: 'string' },
        },
      },
    },
    strengths: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['turn', 'point'],
        properties: { turn: { type: 'integer' }, point: { type: 'string' } },
      },
    },
    improvements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['turn', 'title', 'detail', 'suggested_wording'],
        properties: {
          turn: { type: 'integer' },
          title: { type: 'string' },
          detail: { type: 'string' },
          suggested_wording: { type: 'string' },
        },
      },
    },
    prospect_thoughts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['turn', 'thought'],
        properties: { turn: { type: 'integer' }, thought: { type: 'string' } },
      },
    },
    hidden_concern_uncovered: { type: 'boolean' },
    micro_practice: { type: 'string' },
  },
};

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

// Apply the scorecard weights and certification rules (PRD 10.2) to the
// coach's per-criterion scores.
export function computeResult(evaluation, scorecard = SCORECARD) {
  const byId = new Map((evaluation.criteria || []).map((c) => [c.id, c]));
  const missing = [];
  let weighted = 0;
  let totalWeight = 0;

  const criteria = scorecard.criteria.map((def) => {
    const got = byId.get(def.id);
    if (!got) missing.push(def.id);
    const score = got ? clamp(got.score) : 0;
    weighted += score * def.weight;
    totalWeight += def.weight;
    return {
      id: def.id,
      name: def.name,
      weight: def.weight,
      score,
      rationale: got?.rationale ?? 'Not evaluated.',
      evidence: got?.evidence ?? [],
      minScore: def.minScore ?? null,
    };
  });

  const overall = totalWeight ? Math.round(weighted / totalWeight) : 0;
  const criticalFailures = evaluation.critical_failures || [];
  const reasons = [];
  if (overall < scorecard.passThreshold) reasons.push(`Overall ${overall} is below ${scorecard.passThreshold}.`);
  if (criticalFailures.length) reasons.push('Critical product-accuracy or compliance failure.');
  for (const c of criteria) {
    if (c.minScore !== null && c.score < c.minScore) reasons.push(`${c.name} ${c.score} is below ${c.minScore}.`);
  }
  if (missing.length) reasons.push(`Not scored: ${missing.join(', ')}.`);

  return {
    overall,
    passed: reasons.length === 0,
    failReasons: reasons,
    criteria,
    criticalFailures,
    strengths: (evaluation.strengths || []).slice(0, 3),
    improvements: (evaluation.improvements || []).slice(0, 3),
    prospectThoughts: evaluation.prospect_thoughts || [],
    hiddenConcernUncovered: Boolean(evaluation.hidden_concern_uncovered),
    microPractice: evaluation.micro_practice || '',
  };
}
