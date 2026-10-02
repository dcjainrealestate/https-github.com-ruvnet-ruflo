import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { publicScenario, buildVariation } from './scenario.js';
import { computeResult } from './scoring.js';
import { customerReply, evaluateCall, MOCK } from './llm.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, '..', 'public');
const PORT = Number(process.env.PORT) || 3000;
const MAX_TURN_CHARS = 2000;
const MAX_TURNS = 80;
const CALL_TTL_MS = 2 * 60 * 60 * 1000;

// Phase 0 keeps calls in memory; a restart drops in-progress calls.
const calls = new Map();

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64 * 1024) throw Object.assign(new Error('Body too large'), { status: 413 });
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

function getCall(id) {
  const call = calls.get(id);
  if (!call) throw Object.assign(new Error('Call not found'), { status: 404 });
  return call;
}

function pruneCalls() {
  const cutoff = Date.now() - CALL_TTL_MS;
  for (const [id, call] of calls) if (call.createdAt < cutoff) calls.delete(id);
}

async function startCall() {
  pruneCalls();
  const id = crypto.randomUUID();
  const call = {
    id,
    createdAt: Date.now(),
    variation: buildVariation(crypto.randomInt(2 ** 31)),
    turns: [],
    ended: false,
  };
  calls.set(id, call);
  // The prospect answers the phone first.
  const reply = await customerReply(call.variation, call.turns);
  call.turns.push({ speaker: 'customer', text: reply.text });
  return { callId: id, reply: reply.text, ended: false };
}

async function repTurn(call, body) {
  if (call.ended) throw Object.assign(new Error('Call has ended'), { status: 409 });
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) throw Object.assign(new Error('text is required'), { status: 400 });
  if (text.length > MAX_TURN_CHARS) throw Object.assign(new Error('text is too long'), { status: 400 });
  if (call.turns.length >= MAX_TURNS) throw Object.assign(new Error('Call is too long; end it to get feedback'), { status: 409 });

  const last = call.turns.at(-1);
  if (body.interruptedLast === true && last?.speaker === 'customer') last.interrupted = true;

  call.turns.push({ speaker: 'rep', text });
  try {
    const reply = await customerReply(call.variation, call.turns);
    call.turns.push({ speaker: 'customer', text: reply.text });
    if (reply.ended) call.ended = true;
    return { reply: reply.text, ended: reply.ended };
  } catch (err) {
    call.turns.pop(); // let the rep retry the same line
    throw err;
  }
}

async function endCall(call) {
  call.ended = true;
  if (!call.turns.some((t) => t.speaker === 'rep')) {
    throw Object.assign(new Error('Say something before ending the call'), { status: 400 });
  }
  call.result ??= computeResult(await evaluateCall(call.turns));
  return { result: call.result, transcript: call.turns };
}

async function serveStatic(req, res) {
  const urlPath = new URL(req.url, 'http://x').pathname;
  const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 404, { error: 'Not found' });
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    send(res, 404, { error: 'Not found' });
  }
}

async function route(req, res) {
  const { pathname } = new URL(req.url, 'http://x');
  if (req.method === 'GET' && pathname === '/api/scenario') return send(res, 200, { ...publicScenario(), mock: MOCK });
  if (req.method === 'POST' && pathname === '/api/calls') return send(res, 200, await startCall());

  const m = pathname.match(/^\/api\/calls\/([0-9a-f-]{36})\/(turn|end)$/);
  if (req.method === 'POST' && m) {
    const call = getCall(m[1]);
    if (m[2] === 'turn') return send(res, 200, await repTurn(call, await readJson(req)));
    return send(res, 200, await endCall(call));
  }
  if (req.method === 'GET' && !pathname.startsWith('/api/')) return serveStatic(req, res);
  send(res, 404, { error: 'Not found' });
}

function errorStatus(err) {
  if (err.status && !(err instanceof Anthropic.APIError)) return err.status;
  if (err instanceof Anthropic.RateLimitError) return 429;
  if (err instanceof Anthropic.AuthenticationError) return 502;
  if (err instanceof Anthropic.APIError) return 502;
  if (err.code === 'refusal') return 422;
  return 500;
}

export function createServer() {
  return http.createServer((req, res) => {
    route(req, res).catch((err) => {
      const status = errorStatus(err);
      if (status >= 500) console.error(err);
      const message = err instanceof Anthropic.AuthenticationError
        ? 'AI provider rejected the credentials. Set ANTHROPIC_API_KEY, or run with MOCK=1.'
        : err.message;
      send(res, status, { error: message });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, () => {
    console.log(`CallCoach prototype on http://localhost:${PORT}${MOCK ? ' (MOCK mode, no AI calls)' : ''}`);
  });
}
