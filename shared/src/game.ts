// Game-round types: turns, guesses, scores and drawing strokes.

export const CHOOSE_SECONDS = 15;
export const REVEAL_SECONDS = 7;
export const MIN_PLAYERS_TO_START = 2;

export type GamePhase = "choosing" | "drawing" | "reveal";

export interface FeedItem {
  id: number;
  kind: "guess" | "close" | "correct" | "system";
  playerId?: string;
  text: string;
}

/** Everything about the current game that everyone may see. The word itself is never in here until the reveal. */
export interface PublicGame {
  round: number;
  rounds: number;
  phase: GamePhase;
  drawerId: string;
  /** Server clock (ms) when the current phase ends. */
  endsAt: number;
  /** How many words the answer has, e.g. 2 for "coffee mug". */
  wordCount: number;
  revealedWord: string | null;
  guessedIds: string[];
  scores: Record<string, number>;
  /** Points earned this turn, shown during the reveal. */
  turnPoints: Record<string, number>;
  feed: FeedItem[];
  /** Hints the drawer has dropped this turn, in order. */
  hints: Hint[];
  hintsLeft: number;
  /** This turn's twist, if any (shown from the choosing phase so everyone sees the slot machine). */
  modifier: ModifierId | null;
  /** Allowed colors during the "3 Colors" twist. */
  palette: string[] | null;
  coins: Record<string, number>;
  /** Active sabotage on the drawer. */
  sabotage: { kind: SabotageKind; until: number; byId: string } | null;
  /** Players who already sabotaged this turn (one each). */
  sabotagedBy: string[];
}

/** Sent only to one player: the drawer's word choices and the word they're drawing. */
export interface PrivateGame {
  options: string[] | null;
  word: string | null;
  /** For the drawer while drawing: which hints are still available. */
  hintsAvailable: { emoji: boolean; category: boolean; clue: number; sound: boolean } | null;
}

// ── Hints ────────────────────────────────────────────────────

export type HintKind = "emoji" | "category" | "clue" | "sound";
export interface Hint {
  kind: HintKind;
  text: string;
  /** Sound recipe name for sound hints (played in the browser). */
  sound?: string;
}
export const HINTS_PER_TURN = 3;
/** Each hint used lowers every guesser's points by this share. */
export const HINT_PENALTY = 0.15;
/** The drawer earns this per unused hint when at least one person guesses. */
export const HINT_BONUS = 30;

/** Sound hints are synthesized in the browser; these are the recipes it knows. */
export const SOUND_IDS = [
  "ring", "beep", "ding", "tick", "buzz", "whoosh", "splash", "engine", "siren", "pop", "chime", "drum", "pluck",
  "piano", "thunder", "rain", "heartbeat", "click", "typing", "whistle", "laser", "trumpet", "boing", "honk",
  "chirp", "hoot", "croak", "crunch", "sizzle", "pour", "bubble", "hiss", "knock", "jingle", "roar",
  "windchime", "drip", "bark", "meow", "quack",
] as const;
export type SoundId = (typeof SOUND_IDS)[number];

// ── Twists (round modifiers) ─────────────────────────────────

export type ModifierId = "oneLine" | "flashlight" | "mirror" | "threeColors" | "limitedInk" | "shaky" | "speed";
export const MODIFIERS: Record<ModifierId, { name: string; rule: string; emoji: string }> = {
  oneLine: { name: "One Line", rule: "The drawer can't lift the pen: one stroke only.", emoji: "✏️" },
  flashlight: { name: "Flashlight", rule: "Guessers only see a spotlight around the pen.", emoji: "🔦" },
  mirror: { name: "Mirror Hands", rule: "The drawer's movements are flipped left to right.", emoji: "🪞" },
  threeColors: { name: "3 Colors", rule: "Only three colors this turn.", emoji: "🎨" },
  limitedInk: { name: "Limited Ink", rule: "The pen runs dry after a while. Use it wisely.", emoji: "🖋️" },
  shaky: { name: "Shaky Hand", rule: "Every line comes out wobbly.", emoji: "🫨" },
  speed: { name: "Speed Round", rule: "Half the time, double the points.", emoji: "⚡" },
};
export const MODIFIER_IDS = Object.keys(MODIFIERS) as ModifierId[];
/** Share of turns that get a twist when twists are on (the server deals them out evenly, one per pair of turns). */
export const TWIST_CHANCE = 0.5;
/** Ink budget for "Limited Ink", in canvas widths of line. */
export const INK_BUDGET = 4.5;

// ── Sabotage ─────────────────────────────────────────────────

export type SabotageKind = "holi" | "hugeBrush" | "freeze" | "earthquake" | "upsideDown" | "fog" | "rainbow";
export const SABOTAGES: Record<SabotageKind, { name: string; cost: number; seconds: number; emoji: string; desc: string; verb: string }> = {
  fog: { name: "Fog", cost: 1, seconds: 8, emoji: "🌫️", desc: "Fogs up the drawer's view for 8s", verb: "rolled fog over the drawer" },
  hugeBrush: { name: "Huge Brush", cost: 1, seconds: 10, emoji: "🖌️", desc: "A fat marker for 10s", verb: "swapped the drawer's pen for a huge brush" },
  rainbow: { name: "Rainbow Pen", cost: 1, seconds: 10, emoji: "🌈", desc: "Random colour every line for 10s", verb: "gave the drawer a rainbow pen" },
  holi: { name: "Holi Splash", cost: 2, seconds: 8, emoji: "🎨", desc: "Colour powder all over the drawer's screen", verb: "threw Holi colours at the drawer" },
  earthquake: { name: "Earthquake", cost: 2, seconds: 6, emoji: "🫨", desc: "Shakes the canvas for 6s", verb: "set off an earthquake" },
  upsideDown: { name: "Upside Down", cost: 3, seconds: 8, emoji: "🙃", desc: "Flips the drawer's canvas for 8s", verb: "flipped the drawer's canvas upside down" },
  freeze: { name: "Freeze", cost: 3, seconds: 3, emoji: "🧊", desc: "Drawer can't draw for 3s", verb: "froze the drawer" },
};
/** Brush size forced by the Huge Brush sabotage. */
export const HUGE_BRUSH = 46;
export const SABOTAGE_KINDS = Object.keys(SABOTAGES) as SabotageKind[];

export type Tool = "pen" | "eraser";

/** Points are flat [x, y, x, y, ...] in 0–1 canvas units, so every screen size draws the same picture. */
export interface Stroke {
  id: string;
  tool: Tool;
  color: string;
  size: number;
  points: number[];
}

export const BRUSH_SIZES = [4, 10, 22] as const;
export const DRAW_COLORS = [
  "#16151d", "#7d8597", "#f2efe8", "#ff6b5b", "#ffa53d", "#e6b422",
  "#1fae7a", "#18a3a8", "#2f6bff", "#8b6cff", "#e83e8c", "#8a5a36",
] as const;
/** Canvas shape (width / height). */
export const CANVAS_ASPECT = 4 / 3;

/** Lowercase letters and digits only, single spaces: "  Coffee-Mug! " → "coffee mug". */
export function normalizeGuess(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "a car", "the car" and "car" all count as "car". */
const stripArticle = (s: string) => s.replace(/^(a|an|the) /, "");
const squash = (s: string) => stripArticle(normalizeGuess(s)).replace(/ /g, "");

/** True if the guess matches the word or one of its accepted alternatives ("tv" for "television"). */
export function isCorrectGuess(guess: string, word: string, alts: readonly string[] = []): boolean {
  const g = squash(guess);
  return g.length > 0 && [word, ...alts].some((w) => squash(w) === g);
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

/** "So close!": a typo, a plural, or one of the word's near-miss words. Never true for the right answer. */
export function isCloseGuess(guess: string, word: string, near: readonly string[] = []): boolean {
  const g = squash(guess);
  const w = squash(word);
  if (!g || g === w) return false;
  if (near.some((n) => squash(n) === g)) return true;
  if (g === `${w}s` || `${g}s` === w || g === `${w}es`) return true;
  const d = editDistance(g, w);
  return (w.length >= 4 && d === 1) || (w.length >= 8 && d === 2);
}
