// Browser voice I/O for the practice call: continuous speech recognition (no
// push-to-talk), speech synthesis for the customer, and barge-in — when the rep
// starts talking over the customer, the customer stops speaking.

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const speechSupported = Boolean(Recognition) && 'speechSynthesis' in window;

const END_OF_UTTERANCE_MS = 900;
const words = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);

export class VoiceIO {
  constructor({ lang, onUtterance, onInterim, onBargeIn, onError }) {
    Object.assign(this, { lang, onUtterance, onInterim, onBargeIn, onError });
    this.buffer = '';
    this.speaking = false;
    this.spokenText = '';
    this.lastSpeechEnd = 0;
    this.active = false;
    this.muted = false;
    this.timer = null;
  }

  start() {
    if (!Recognition) return;
    this.active = true;
    this.rec = new Recognition();
    this.rec.lang = this.lang;
    this.rec.continuous = true;
    this.rec.interimResults = true;
    this.rec.onresult = (e) => this.handleResult(e);
    this.rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.active = false;
        this.onError?.('Microphone access was blocked. You can type your lines instead.');
      }
    };
    // Chrome ends recognition after silence or errors; keep it running for the call.
    this.rec.onend = () => { if (this.active && !this.muted) this.safeStart(); };
    this.safeStart();
  }

  safeStart() {
    try { this.rec.start(); } catch { /* already started */ }
  }

  stop() {
    this.active = false;
    clearTimeout(this.timer);
    try { this.rec?.stop(); } catch { /* not running */ }
    speechSynthesis.cancel();
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.rec) return;
    if (muted) { try { this.rec.stop(); } catch { /* not running */ } } else if (this.active) this.safeStart();
  }

  // Speaker output leaking into the mic must not count as the rep talking.
  isEcho(text) {
    const recent = this.speaking || Date.now() - this.lastSpeechEnd < 800;
    if (!recent || !this.spokenText) return false;
    const heard = words(text);
    if (!heard.length) return true;
    const spoken = new Set(words(this.spokenText));
    return heard.filter((w) => spoken.has(w)).length / heard.length >= 0.6;
  }

  handleResult(e) {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const text = r[0].transcript.trim();
      if (!text || this.isEcho(text)) continue;
      if (r.isFinal) this.buffer += (this.buffer ? ' ' : '') + text;
      else interim += text + ' ';
    }
    interim = interim.trim();
    const heard = (this.buffer + ' ' + interim).trim();
    if (!heard) return;

    if (this.speaking && words(heard).length >= 2) {
      speechSynthesis.cancel();
      this.speaking = false;
      this.onBargeIn?.();
    }
    this.onInterim?.(heard);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), END_OF_UTTERANCE_MS + (interim ? 600 : 0));
  }

  flush() {
    const text = this.buffer.trim();
    if (!text) return;
    this.buffer = '';
    this.onInterim?.('');
    this.onUtterance(text);
  }

  speak(text) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) return resolve(false);
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.lang;
      const voice = speechSynthesis.getVoices().find((v) => v.lang === this.lang)
        || speechSynthesis.getVoices().find((v) => v.lang.startsWith(this.lang.slice(0, 2)));
      if (voice) u.voice = voice;
      u.rate = 1.03;
      this.spokenText = text;
      this.speaking = true;
      // Some browsers never fire onend (no voices installed); don't stall the call.
      const guard = setTimeout(() => done(false), 3000 + text.length * 90);
      const done = (completed) => {
        clearTimeout(guard);
        if (!this.speaking) return resolve(completed);
        this.speaking = false;
        this.lastSpeechEnd = Date.now();
        resolve(completed);
      };
      u.onend = () => done(true);
      u.onerror = () => done(false);
      speechSynthesis.speak(u);
    });
  }
}

// Records the rep's microphone for playback after the call.
export class MicRecorder {
  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.rec = new MediaRecorder(this.stream);
      this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
      this.rec.start(1000);
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.rec || this.rec.state === 'inactive') return resolve(null);
      this.rec.onstop = () => {
        this.stream.getTracks().forEach((t) => t.stop());
        resolve(this.chunks.length ? URL.createObjectURL(new Blob(this.chunks, { type: this.rec.mimeType })) : null);
      };
      this.rec.stop();
    });
  }
}
