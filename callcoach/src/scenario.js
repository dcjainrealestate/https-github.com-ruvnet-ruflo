// Phase 0 scenario: inbound lead follow-up for a premium residential project
// (PRD section 22). All people, projects and figures are fictional.

export const SCORECARD = {
  id: 'default-v1',
  passThreshold: 80,
  criteria: [
    { id: 'opening', name: 'Opening & permission', weight: 10, critical: false,
      signals: 'Greeting, identity, reason for call, permission to continue' },
    { id: 'rapport', name: 'Rapport & professionalism', weight: 10, critical: false,
      signals: 'Tone, listening, respect, confidence' },
    { id: 'discovery', name: 'Discovery', weight: 20, critical: false, minScore: 70,
      signals: 'Relevant open questions, follow-ups, needs uncovered (including the hidden concern)' },
    { id: 'accuracy', name: 'Product accuracy', weight: 15, critical: true,
      signals: 'Correct facts and approved positioning; a major false claim is a critical failure' },
    { id: 'objections', name: 'Objection handling', weight: 20, critical: false, minScore: 70,
      signals: 'Acknowledge, clarify, respond, verify' },
    { id: 'control', name: 'Conversation control', weight: 10, critical: false,
      signals: 'Concise answers, no talking over, good transitions' },
    { id: 'cta', name: 'Next-step / CTA', weight: 10, critical: false,
      signals: 'Clear agreed action with a time or commitment' },
    { id: 'compliance', name: 'Compliance', weight: 5, critical: true,
      signals: 'No guaranteed returns, no invented pricing or inventory, no pressure tactics' },
  ],
};

export const SCENARIO = {
  id: 're-inbound-followup-1',
  title: 'Inbound lead follow-up: Aranya Heights',
  difficulty: 'Intermediate',
  salespersonGoal:
    'Qualify need, budget and timeline, handle objections, and secure a site visit or a scheduled follow-up.',
  context:
    'The prospect filled in a website enquiry form for Aranya Heights two days ago. You are calling from Greenline Realty to follow up.',
  successCondition: 'Prospect agrees to a specific site-visit slot or a specific follow-up call time.',

  // Approved knowledge: the only facts the rep (and the AI customer) may treat as true.
  approvedKnowledge: [
    'Project: Aranya Heights by Greenline Realty, Sector 79, on the main sector road.',
    'Configurations: 3 BHK (1,850 sq ft) and 4 BHK (2,400 sq ft). No 2 BHK units.',
    'Current approved price band: 3 BHK from ₹1.85 Cr, 4 BHK from ₹2.45 Cr (all-inclusive, before stamp duty).',
    'Construction status: Towers A and B structure complete; possession scheduled for December 2027.',
    'Project is RERA registered. Registration number is shared in writing on request.',
    'Amenities: 40,000 sq ft clubhouse, 3-acre central park, EV charging in every tower.',
    'Connectivity: 10 minutes to the expressway entry; metro station under construction 1.2 km away (expected 2028, not guaranteed).',
    'Site visits run daily 10am–6pm with a free pickup within the city.',
    'Payment plan: 10% booking, construction-linked thereafter.',
  ],
  prohibited: [
    'Guaranteeing returns, appreciation or rental yield.',
    'Quoting any price, discount or unit availability not listed in approved knowledge.',
    'Promising the metro will open by a specific date.',
    'Disparaging competitor projects or brokers.',
  ],

  persona: {
    name: 'Rohan Mehra',
    role: '42-year-old business owner (runs a packaging company)',
    personality: 'Interested but skeptical, busy, polite, dislikes pushy salespeople',
    stage: 'Enquired online two days ago; comparing three projects',
    awareness: 'Has seen the brochure on the website; knows rough pricing',
    authority: 'Decides jointly with his wife, who must see the site before any decision',
    budget: 'Comfortable up to about ₹2 Cr; slightly price-sensitive',
    timeline: 'Wants to move within 18–24 months; current lease ends in mid-2027',
    objective:
      'Understand location, price, construction status and whether a site visit is worth a weekend morning.',
    hiddenFacts: [
      'His biggest concern is commute time: his factory is in the industrial area near the expressway and his kids\' school is in the old city. Reveal this only if the salesperson asks a genuine question about his daily routine, work location, family or what matters most to him.',
      'He would consider a 3 BHK only, never a 4 BHK. Reveal only if asked about size or family needs.',
      'His wife can only visit on Sunday mornings. Reveal only when a visit is being scheduled.',
    ],
    objections: [
      'The price seems high compared to the other projects I am looking at.',
      'Can you just send me the details on WhatsApp? I will go through them.',
      'I am not ready to visit yet, it is too early.',
      'I have already spoken to another broker about this area.',
      'Possession in 2027 feels far away, these projects always get delayed.',
    ],
  },
};

const MOODS = [
  'You are in a slightly rushed mood today; you are between two meetings.',
  'You are relaxed today but quietly skeptical of anything that sounds like a sales pitch.',
  'You had a bad experience with a pushy broker last week, so you start a little guarded.',
];

// Per-attempt variation so repeated calls do not follow a memorised path (PRD 9.2).
export function buildVariation(seed) {
  const rand = mulberry32(seed);
  const objections = [...SCENARIO.persona.objections];
  for (let i = objections.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [objections[i], objections[j]] = [objections[j], objections[i]];
  }
  return {
    seed,
    mood: MOODS[Math.floor(rand() * MOODS.length)],
    objectionOrder: objections.slice(0, 4),
  };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// What the salesperson is allowed to see before the call: the brief and the
// scorecard, never the persona's hidden facts or objection bank (PRD section 10).
export function publicScenario() {
  const { persona } = SCENARIO;
  return {
    id: SCENARIO.id,
    title: SCENARIO.title,
    difficulty: SCENARIO.difficulty,
    context: SCENARIO.context,
    salespersonGoal: SCENARIO.salespersonGoal,
    successCondition: SCENARIO.successCondition,
    approvedKnowledge: SCENARIO.approvedKnowledge,
    prohibited: SCENARIO.prohibited,
    prospect: { name: persona.name, stage: persona.stage },
    scorecard: SCORECARD,
  };
}
