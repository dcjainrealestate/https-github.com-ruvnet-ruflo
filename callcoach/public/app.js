import { VoiceIO, MicRecorder, speechSupported } from './voice.js';

const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};

let scenario;
let call = null; // { id, turns, interruptedLast, pending, queue, ended, voice, recorder, startedAt }

async function api(path, body) {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function show(section) {
  for (const id of ['brief', 'call', 'results']) $(id).hidden = id !== section;
  window.scrollTo(0, 0);
}

// ---------- Brief ----------
async function loadScenario() {
  scenario = await api('/api/scenario');
  $('mock-badge').hidden = !scenario.mock;
  $('sc-title').textContent = scenario.title;
  $('sc-difficulty').textContent = scenario.difficulty;
  $('sc-prospect').textContent = `${scenario.prospect.name} (${scenario.prospect.stage})`;
  $('sc-context').textContent = scenario.context;
  $('sc-goal').textContent = scenario.salespersonGoal;
  for (const k of scenario.approvedKnowledge) $('sc-knowledge').append(el('li', k));
  for (const k of scenario.prohibited) $('sc-prohibited').append(el('li', k));
  const tbody = $('sc-scorecard').querySelector('tbody');
  for (const c of scenario.scorecard.criteria) {
    const tr = el('tr');
    tr.append(el('td', c.name + (c.critical ? ' ⚠' : '')), el('td', `${c.weight}%`));
    tr.title = c.signals;
    tbody.append(tr);
  }
  const mins = scenario.scorecard.criteria.filter((c) => c.minScore).map((c) => `${c.name} ≥ ${c.minScore}`);
  $('sc-rules').textContent = `Pass: overall ≥ ${scenario.scorecard.passThreshold}, ${mins.join(', ')}, and no critical (⚠) failure.`;
  if (!speechSupported) $('mic-status').textContent = 'Voice recognition is not supported in this browser; type your lines during the call.';
}

$('mic-test').onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let peak = 0;
    const end = Date.now() + 3000;
    $('mic-status').textContent = 'Say something…';
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      if (Date.now() < end) return requestAnimationFrame(tick);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      $('mic-status').textContent = peak > 10 ? 'Microphone works ✓' : 'Very little sound detected. Check your mic.';
    };
    tick();
  } catch {
    $('mic-status').textContent = 'Microphone access was blocked. You can still type during the call.';
  }
};

// ---------- Live call ----------
function addLine(speaker, text) {
  const line = el('div', undefined, `line ${speaker}`);
  line.append(el('span', speaker === 'rep' ? 'You' : scenario.prospect.name.split(' ')[0], 'who'), el('span', text));
  $('live-transcript').append(line);
  line.scrollIntoView({ block: 'end' });
  return line;
}

function setState(text, live = false) {
  $('call-state').textContent = text;
  $('live-dot').classList.toggle('on', live);
}

async function startCall() {
  $('start').disabled = true;
  show('call');
  $('live-transcript').replaceChildren();
  setState('Calling…');
  const lang = $('lang').value;
  call = { turns: [], interruptedLast: false, pending: false, queue: [], ended: false, startedAt: Date.now() };
  call.recorder = new MicRecorder();
  call.voice = new VoiceIO({
    lang,
    onUtterance: (text) => repSays(text),
    onInterim: (text) => { $('interim').textContent = text ? `🎙 ${text}` : ''; },
    onBargeIn: () => { call.interruptedLast = true; setState('You interrupted. Listening…', true); },
    onError: (msg) => { $('interim').textContent = msg; },
  });
  call.timer = setInterval(() => {
    const s = Math.floor((Date.now() - call.startedAt) / 1000);
    $('timer').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }, 500);

  try {
    await call.recorder.start();
    const { callId, reply } = await api('/api/calls', {});
    call.id = callId;
    call.voice.start();
    await customerSays(reply);
  } catch (err) {
    setState(`Could not start the call: ${err.message}`);
  } finally {
    $('start').disabled = false;
  }
}

async function customerSays(text) {
  call.turns.push({ speaker: 'customer', text });
  call.interruptedLast = false;
  addLine('customer', text);
  setState('Customer speaking…', true);
  await call.voice.speak(text);
  if (!call.ended && !call.pending) setState('Listening…', true);
}

async function repSays(text) {
  if (!call || call.ended) return;
  if (call.pending) { call.queue.push(text); addLine('rep', text); return; }
  addLine('rep', text);
  await sendTurn(text);
}

async function sendTurn(text) {
  call.pending = true;
  setState('Customer is thinking…', true);
  try {
    const { reply, ended } = await api(`/api/calls/${call.id}/turn`, { text, interruptedLast: call.interruptedLast });
    call.turns.push({ speaker: 'rep', text });
    call.pending = false;
    if (ended) call.ended = true;
    await customerSays(reply);
    if (call.ended) return finishCall('The customer ended the call.');
    // Anything said while the customer was thinking goes out as one turn.
    const next = call.queue.join(' ');
    call.queue = [];
    if (next) await sendTurn(next);
  } catch (err) {
    call.pending = false;
    setState(`Problem: ${err.message}. Say it again or type it.`, true);
  }
}

$('type-form').onsubmit = (e) => {
  e.preventDefault();
  const text = $('type-input').value.trim();
  if (!text) return;
  $('type-input').value = '';
  if (call?.voice.speaking) { speechSynthesis.cancel(); call.interruptedLast = true; }
  repSays(text);
};

$('mute').onclick = () => {
  if (!call) return;
  const muted = $('mute').textContent === 'Mute mic';
  call.voice.setMuted(muted);
  $('mute').textContent = muted ? 'Unmute mic' : 'Mute mic';
};

$('end').onclick = () => finishCall();

async function finishCall(note) {
  if (!call || call.finishing) return;
  call.finishing = true;
  call.ended = true;
  clearInterval(call.timer);
  call.voice.stop();
  const audioUrl = await call.recorder.stop();
  show('results');
  $('scoring').hidden = false;
  $('scoring').textContent = `${note ? note + ' ' : ''}Scoring your call… this can take up to a minute.`;
  $('result-body').hidden = true;
  try {
    const { result, transcript } = await api(`/api/calls/${call.id}/end`, {});
    renderResult(result, transcript, audioUrl);
  } catch (err) {
    $('scoring').textContent = `Scoring failed: ${err.message}`;
    $('scoring').append(el('br'), retryButton());
  }
}

function retryButton() {
  const b = el('button', 'Back to brief', 'secondary');
  b.onclick = () => show('brief');
  return b;
}

// ---------- Results ----------
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(`attempts:${scenario.id}`)) || []; } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(`attempts:${scenario.id}`, JSON.stringify(h.slice(-20))); } catch { /* storage unavailable */ }
}

function renderResult(r, transcript, audioUrl) {
  $('scoring').hidden = true;
  $('result-body').hidden = false;
  $('overall').textContent = r.overall;
  $('overall').className = `big ${r.passed ? 'pass' : 'fail'}`;
  $('verdict').textContent = r.passed ? 'Passed: certified for this scenario 🎉' : 'Not yet certified';
  $('fail-reasons').textContent = r.failReasons.join(' ');

  const history = loadHistory();
  const prev = history.at(-1);
  const best = history.reduce((m, a) => Math.max(m, a.overall), 0);
  $('delta').textContent = prev
    ? `Attempt ${history.length + 1}. Last: ${prev.overall} (${r.overall - prev.overall >= 0 ? '+' : ''}${r.overall - prev.overall}). Best before: ${best}.`
    : 'First attempt.';
  history.push({ at: Date.now(), overall: r.overall, passed: r.passed });
  saveHistory(history);

  $('critical').replaceChildren(...r.criticalFailures.map((f) =>
    el('p', `⚠ Critical (${f.criterion_id}, turn ${f.turn}): ${f.description}`, 'critical')));

  $('criteria').replaceChildren(...r.criteria.map((c) => {
    const box = el('details', undefined, 'criterion');
    const sum = el('summary');
    const bar = el('span', undefined, 'bar');
    const fill = el('span', undefined, c.minScore && c.score < c.minScore ? 'fill low' : 'fill');
    fill.style.width = `${c.score}%`;
    bar.append(fill);
    sum.append(el('span', `${c.name} (${c.weight}%)`, 'cname'), bar, el('span', String(c.score), 'cscore'));
    box.append(sum, el('p', c.rationale));
    for (const ev of c.evidence) box.append(el('blockquote', `Turn ${ev.turn}: “${ev.quote}”`));
    return box;
  }));

  $('strengths').replaceChildren(...r.strengths.map((s) => el('li', `${s.point} (turn ${s.turn})`)));
  $('improvements').replaceChildren(...r.improvements.map((s) => {
    const li = el('li');
    li.append(el('strong', `${s.title} (turn ${s.turn})`), el('p', s.detail), el('p', `Try: “${s.suggested_wording}”`, 'try'));
    return li;
  }));
  $('thoughts').replaceChildren(...r.prospectThoughts.map((t) => el('li', `Turn ${t.turn}: ${t.thought}`)));
  $('hidden-concern').textContent = r.hiddenConcernUncovered
    ? '✓ You uncovered the prospect\'s hidden concern.'
    : '✗ You didn\'t uncover the prospect\'s main hidden concern. Better discovery questions would have surfaced it.';
  $('drill').textContent = r.microPractice;

  $('recording').hidden = !audioUrl;
  if (audioUrl) $('recording').src = audioUrl;
  $('final-transcript').replaceChildren(...transcript.map((t, i) =>
    el('div', `[${i + 1}] ${t.speaker === 'rep' ? 'You' : 'Customer'}${t.interrupted ? ' (interrupted)' : ''}: ${t.text}`, `line ${t.speaker}`)));
}

$('start').onclick = startCall;
$('retry').onclick = () => show('brief');
loadScenario().catch((err) => { $('sc-title').textContent = `Could not load scenario: ${err.message}`; });
