import { RECORDED_SOUND_IDS, type SynthSoundId } from "@sketch/shared";

// Sound hints, synthesized live with the Web Audio API: no audio files to download or license.
// Each recipe is a tiny arrangement of tones and filtered noise, about one to two seconds long.

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type Wave = OscillatorType;
const master = (c: AudioContext) => {
  const g = c.createGain();
  g.gain.value = 0.35;
  g.connect(c.destination);
  return g;
};

/** A tone with a quick attack and exponential release. Frequency can glide to `to`. */
function tone(c: AudioContext, out: AudioNode, at: number, freq: number, dur: number, type: Wave = "sine", vol = 0.6, to?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, c.currentTime + at + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + at);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(out);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.05);
}

/** Filtered white noise burst (wind, rain, splashes, sizzles). */
function noise(c: AudioContext, out: AudioNode, at: number, dur: number, filter: BiquadFilterType, freq: number, vol = 0.5, sweepTo?: number, q = 1) {
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, c.currentTime + at);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, c.currentTime + at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime + at);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + at + Math.min(0.08, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(c.currentTime + at);
}

function repeat(n: number, gap: number, fn: (at: number, i: number) => void) {
  for (let i = 0; i < n; i++) fn(i * gap, i);
};

const RECIPES: Record<SynthSoundId, (c: AudioContext, o: AudioNode) => void> = {
  ring: (c, o) => repeat(2, 0.5, (t) => repeat(8, 0.045, (u) => { tone(c, o, t + u, 1250, 0.04, "square", 0.15); tone(c, o, t + u, 1550, 0.04, "square", 0.12); })),
  beep: (c, o) => repeat(3, 0.22, (t) => tone(c, o, t, 1000, 0.12, "square", 0.2)),
  ding: (c, o) => { tone(c, o, 0, 1318, 1.2, "sine", 0.5); tone(c, o, 0, 2636, 0.6, "sine", 0.15); },
  tick: (c, o) => repeat(6, 0.25, (t, i) => tone(c, o, t, i % 2 ? 1800 : 1400, 0.03, "square", 0.25)),
  buzz: (c, o) => { tone(c, o, 0, 210, 1.3, "sawtooth", 0.25, 240); tone(c, o, 0, 215, 1.3, "sawtooth", 0.15, 205); },
  whoosh: (c, o) => noise(c, o, 0, 1.2, "bandpass", 300, 0.7, 2500, 1.5),
  splash: (c, o) => { noise(c, o, 0, 0.5, "lowpass", 3000, 0.8, 400); repeat(6, 0.07, (t) => tone(c, o, 0.1 + t, 900 + Math.random() * 900, 0.08, "sine", 0.15, 2000)); },
  engine: (c, o) => { tone(c, o, 0, 55, 1.5, "sawtooth", 0.4, 95); tone(c, o, 0, 58, 1.5, "square", 0.15, 98); },
  siren: (c, o) => repeat(2, 0.7, (t) => { tone(c, o, t, 650, 0.35, "triangle", 0.35, 950); tone(c, o, t + 0.35, 950, 0.35, "triangle", 0.35, 650); }),
  pop: (c, o) => repeat(4, 0.18, (t) => { noise(c, o, t, 0.06, "highpass", 1500, 0.9); tone(c, o, t, 400, 0.06, "sine", 0.3, 120); }),
  chime: (c, o) => [1047, 1319, 1568, 2093].forEach((f, i) => tone(c, o, i * 0.12, f, 0.8, "sine", 0.3)),
  drum: (c, o) => repeat(4, 0.25, (t, i) => (i % 2 ? noise(c, o, t, 0.15, "highpass", 2000, 0.5) : tone(c, o, t, 120, 0.25, "sine", 0.9, 45))),
  pluck: (c, o) => [196, 247, 294, 392].forEach((f, i) => tone(c, o, i * 0.15, f, 0.9, "triangle", 0.35)),
  piano: (c, o) => [523, 659, 784, 1047].forEach((f, i) => { tone(c, o, i * 0.2, f, 0.9, "triangle", 0.3); tone(c, o, i * 0.2, f * 2, 0.4, "sine", 0.08); }),
  thunder: (c, o) => { noise(c, o, 0, 0.15, "highpass", 1200, 0.6); noise(c, o, 0.1, 2, "lowpass", 300, 0.9, 60); },
  rain: (c, o) => noise(c, o, 0, 1.8, "highpass", 4000, 0.35),
  heartbeat: (c, o) => repeat(3, 0.7, (t) => { tone(c, o, t, 60, 0.15, "sine", 0.9, 40); tone(c, o, t + 0.18, 55, 0.15, "sine", 0.7, 38); }),
  click: (c, o) => repeat(2, 0.3, (t) => { noise(c, o, t, 0.03, "highpass", 3000, 0.8); noise(c, o, t + 0.06, 0.05, "bandpass", 1500, 0.5); }),
  typing: (c, o) => repeat(14, 0.09, (t) => noise(c, o, t + Math.random() * 0.03, 0.025, "bandpass", 2500 + Math.random() * 1500, 0.6, undefined, 3)),
  whistle: (c, o) => { tone(c, o, 0, 1500, 0.5, "sine", 0.35, 1700); tone(c, o, 0.55, 1500, 0.8, "sine", 0.35, 1450); },
  laser: (c, o) => repeat(3, 0.25, (t) => tone(c, o, t, 1800, 0.2, "sawtooth", 0.2, 200)),
  trumpet: (c, o) => [392, 523, 659, 784].forEach((f, i) => tone(c, o, i * 0.16, f, i === 3 ? 0.6 : 0.15, "sawtooth", 0.2)),
  boing: (c, o) => repeat(2, 0.4, (t) => tone(c, o, t, 150, 0.35, "sine", 0.6, 600)),
  honk: (c, o) => repeat(2, 0.35, (t) => { tone(c, o, t, 330, 0.25, "square", 0.2); tone(c, o, t, 415, 0.25, "square", 0.15); }),
  chirp: (c, o) => repeat(5, 0.16, (t) => tone(c, o, t, 3000, 0.08, "sine", 0.3, 4500)),
  hoot: (c, o) => { tone(c, o, 0, 420, 0.35, "sine", 0.5, 380); tone(c, o, 0.5, 420, 0.25, "sine", 0.4, 390); tone(c, o, 0.8, 420, 0.5, "sine", 0.5, 360); },
  croak: (c, o) => repeat(2, 0.45, (t) => repeat(6, 0.035, (u) => tone(c, o, t + u, 140, 0.03, "sawtooth", 0.35, 110))),
  crunch: (c, o) => repeat(3, 0.3, (t) => noise(c, o, t, 0.18, "bandpass", 1800, 0.8, 600, 0.7)),
  sizzle: (c, o) => noise(c, o, 0, 1.6, "highpass", 5000, 0.4, 7000),
  pour: (c, o) => { noise(c, o, 0, 1.4, "bandpass", 700, 0.45, 1600, 2); repeat(5, 0.25, (t) => tone(c, o, t, 500 + t * 300, 0.1, "sine", 0.08, 900)); },
  bubble: (c, o) => repeat(7, 0.13, (t) => tone(c, o, t, 300 + Math.random() * 300, 0.1, "sine", 0.35, 900 + Math.random() * 600)),
  hiss: (c, o) => noise(c, o, 0, 1.3, "highpass", 3500, 0.45),
  knock: (c, o) => repeat(3, 0.2, (t) => { tone(c, o, t, 180, 0.08, "sine", 0.8, 90); noise(c, o, t, 0.04, "bandpass", 800, 0.4); }),
  jingle: (c, o) => repeat(8, 0.08, (t) => tone(c, o, t, 2500 + Math.random() * 2500, 0.25, "sine", 0.15)),
  roar: (c, o) => { noise(c, o, 0, 1.4, "lowpass", 500, 0.9, 150); tone(c, o, 0, 90, 1.4, "sawtooth", 0.3, 60); },
  // Hollow metal tubes knocking together: a few pentatonic notes with a metallic overtone, at random moments.
  windchime: (c, o) => {
    const notes = [1568, 1760, 2093, 2349, 2637, 3136];
    for (let i = 0; i < 8; i++) {
      const f = notes[Math.floor(Math.random() * notes.length)]!;
      const at = Math.random() * 1.6;
      tone(c, o, at, f, 1.6, "sine", 0.16);
      tone(c, o, at, f * 2.76, 0.5, "sine", 0.04);
    }
  },
  // Water droplets: quick rising "plinks".
  drip: (c, o) => repeat(4, 0.42, (t) => { tone(c, o, t, 700, 0.08, "sine", 0.45, 1900); tone(c, o, t + 0.05, 1400, 0.12, "sine", 0.12, 1100); }),
  bark: (c, o) => repeat(2, 0.32, (t) => { noise(c, o, t, 0.1, "bandpass", 900, 0.6, 500, 2); tone(c, o, t, 380, 0.14, "sawtooth", 0.3, 170); }),
  meow: (c, o) => { tone(c, o, 0, 480, 0.28, "sawtooth", 0.14, 820); tone(c, o, 0.26, 820, 0.42, "sawtooth", 0.14, 430); tone(c, o, 0, 480, 0.7, "sine", 0.2, 600); },
  quack: (c, o) => repeat(3, 0.22, (t) => { tone(c, o, t, 470, 0.14, "sawtooth", 0.22, 300); tone(c, o, t, 940, 0.1, "square", 0.05, 600); }),
};

// ── Sound settings (remembered per browser) ─────────────────────

const SETTINGS_KEY = "sketch-party.sound.v1";
type SoundSettings = { muted: boolean; music: boolean };
let settings: SoundSettings = (() => {
  try {
    return { muted: false, music: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return { muted: false, music: false };
  }
})();
const listeners = new Set<() => void>();
export const soundSettings = {
  get: () => settings,
  set(patch: Partial<SoundSettings>) {
    settings = { ...settings, ...patch };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    if (settings.music && !settings.muted) music.start();
    else music.stop();
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/** `force` plays even when muted (the user clicked "play sound again"). */
export function playSound(id: string, force = false) {
  if (settings.muted && !force) return;
  const c = audio();
  if ((RECORDED_SOUND_IDS as readonly string[]).includes(id)) return playRecording(id);
  const recipe = RECIPES[id as SynthSoundId];
  if (!c || !recipe) return;
  recipe(c, master(c));
}

/** Plays a little UI sound unless muted. */
function blip(fn: (c: AudioContext, o: AudioNode) => void) {
  return () => {
    if (settings.muted) return;
    const c = audio();
    if (c) fn(c, master(c));
  };
}

/** Short game sounds. */
export const sfx = {
  correct: blip((c, o) => {
    tone(c, o, 0, 784, 0.15, "triangle", 0.4);
    tone(c, o, 0.1, 1175, 0.3, "triangle", 0.4);
  }),
  someoneGot: blip((c, o) => tone(c, o, 0, 1046, 0.25, "sine", 0.25)),
  tick: blip((c, o) => tone(c, o, 0, 1500, 0.04, "square", 0.12)),
  slot: blip((c, o) => repeat(10, 0.08, (t, i) => tone(c, o, t, i % 2 ? 800 : 600, 0.05, "square", 0.08))),
  yourTurn: blip((c, o) => [523, 659, 784].forEach((f, i) => tone(c, o, i * 0.09, f, 0.35, "triangle", 0.3))),
  reveal: blip((c, o) => [784, 659].forEach((f, i) => tone(c, o, i * 0.12, f, 0.4, "sine", 0.25))),
  join: blip((c, o) => tone(c, o, 0, 660, 0.12, "sine", 0.2, 990)),
  hit: blip((c, o) => {
    noise(c, o, 0, 0.3, "bandpass", 500, 0.7, 2600, 1.2);
    tone(c, o, 0.04, 320, 0.25, "sawtooth", 0.14, 110);
  }),
  win: blip((c, o) => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(c, o, i * 0.13, f, i === 5 ? 0.8 : 0.18, "triangle", 0.3))),
};

// ── Background music: a slow, quiet generated chord loop (off by default) ──

const CHORDS = [
  [220, 277.2, 329.6, 415.3], // A maj7
  [185, 220, 277.2, 329.6], // F#m7
  [146.8, 185, 220, 277.2], // D maj7
  [164.8, 207.7, 246.9, 311.1], // E maj7
];
let musicTimer: number | null = null;
let musicGain: GainNode | null = null;
const music = {
  start() {
    if (musicTimer !== null) return;
    const c = audio();
    if (!c) return;
    musicGain = c.createGain();
    musicGain.gain.value = 0.06;
    musicGain.connect(c.destination);
    let step = 0;
    const play = () => {
      if (!musicGain) return;
      const chord = CHORDS[step % CHORDS.length]!;
      chord.forEach((f, i) => tone(c, musicGain!, i * 0.05, f, 3.6, "sine", 0.5));
      tone(c, musicGain, 0, chord[0]! / 2, 3.6, "triangle", 0.6);
      step++;
    };
    play();
    musicTimer = window.setInterval(play, 3200);
  },
  stop() {
    if (musicTimer !== null) window.clearInterval(musicTimer);
    musicTimer = null;
    musicGain?.disconnect();
    musicGain = null;
  },
};
/** Browsers only allow audio after a click, so music starts on the first interaction if it was left on. */
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => settings.music && !settings.muted && music.start(), { once: true });
}

// ── Recorded sounds (real animal calls) ─────────────────────────

const MAX_CLIP_SECONDS = 3.5;
/**
 * Where the most recognisable 3.5 seconds start in each recording (found by measuring loudness),
 * so long field recordings play the actual roar / crow / howl instead of background noise.
 */
const CLIP_START: Record<string, number> = {
  lion: 4.9, rooster: 2.05, owl: 4.25, wolf: 20, penguin: 19.1, duck: 68.7, cat: 8.35, bee: 8.35,
};
let current: HTMLAudioElement | null = null;

/** Plays /sounds/<id>.mp3, cut to a few seconds with a short fade so long recordings don't drag on. */
function playRecording(id: string) {
  current?.pause();
  const start = CLIP_START[id];
  // A media fragment (#t=) starts playback at that point in the file.
  const el = new Audio(`/sounds/${id}.mp3${start ? `#t=${start}` : ""}`);
  el.volume = 0.85;
  current = el;
  void el.play().catch(() => {
    /* autoplay blocked or file missing: the hint still shows, people can press "play again" */
  });
  const fadeAt = (MAX_CLIP_SECONDS - 0.5) * 1000;
  window.setTimeout(() => {
    const step = window.setInterval(() => {
      el.volume = Math.max(0, el.volume - 0.17);
      if (el.volume <= 0.01) {
        el.pause();
        window.clearInterval(step);
      }
    }, 100);
  }, fadeAt);
}
