// Everything a player can choose for their avatar. Any option mixes with any other.

export const BODY_SHAPES = ["slim", "regular", "broad", "plus", "petite", "hourglass", "pear", "curvy"] as const;
export const HAIR_STYLES = [
  "crop", "sidepart", "buzz", "curly", "afro", "bob", "lob", "pixie",
  "long", "wavy", "braid", "boxbraids", "bun", "chignon", "ponytail", "bald",
] as const;
export const FACIAL_HAIR = ["none", "stubble", "mustache", "goatee", "beard"] as const;
export const EYES = ["calm", "happy", "monday", "wink"] as const;
export const BROWS = ["relaxed", "curious", "skeptical", "focused"] as const;
export const MOUTHS = ["smile", "grin", "smirk", "neutral", "lol"] as const;
export const TOPS = [
  "suit", "vest", "blazer", "blouse", "sheath", "wrap", "shirt", "turtleneck", "sweater", "jumpsuit", "tee", "hoodie",
] as const;
export const BOTTOMS = ["trousers", "pencil", "aline"] as const;
export const EYEWEAR = ["none", "glasses", "round", "shades"] as const;
export const EXTRAS = ["none", "headphones", "cap", "beanie", "earrings", "lanyard", "mug"] as const;

export const SKIN_TONES = ["#f6d7c3", "#eec0a0", "#d9a07a", "#b97c55", "#8d5a3b", "#5e3b27"];
export const HAIR_COLORS = ["#1f1a24", "#4a3021", "#8a5a36", "#d9b26a", "#b5502e", "#9aa0a8", "#e9e4dc", "#ff6b9a", "#8b6cff"];
export const CLOTH_COLORS = [
  "#ff6b5b", "#e83e8c", "#ffa53d", "#e6b422", "#c6f432", "#1fae7a", "#18a3a8", "#2f6bff",
  "#43b0ff", "#8b6cff", "#8c2346", "#c49a6c", "#f2efe8", "#7d8597", "#2a2d3e", "#16151d",
];

export type BodyShape = (typeof BODY_SHAPES)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];
export type FacialHair = (typeof FACIAL_HAIR)[number];
export type Eyes = (typeof EYES)[number];
export type Brows = (typeof BROWS)[number];
export type Mouth = (typeof MOUTHS)[number];
export type Top = (typeof TOPS)[number];
export type Bottom = (typeof BOTTOMS)[number];
export type Eyewear = (typeof EYEWEAR)[number];
export type Extra = (typeof EXTRAS)[number];

export interface AvatarConfig {
  body: BodyShape;
  skin: string;
  hair: HairStyle;
  hairColor: string;
  facialHair: FacialHair;
  eyes: Eyes;
  brows: Brows;
  mouth: Mouth;
  blush: boolean;
  top: Top;
  bottom: Bottom;
  topColor: string;
  /** Tie, blouse bow, belt, or the layer under a blazer/waistcoat. */
  accentColor: string;
  bottomColor: string;
  shoeColor: string;
  eyewear: Eyewear;
  extra: Extra;
  extraColor: string;
}

/** Tops that are dresses or one-pieces: no separate bottoms. */
export const isOnePiece = (top: Top) => top === "sheath" || top === "wrap" || top === "jumpsuit";
/** Suits come as a matching set: bottoms use the top color. */
export const isMatchingSet = (top: Top) => top === "suit";

export const DEFAULT_AVATAR: AvatarConfig = {
  body: "regular",
  skin: SKIN_TONES[2]!,
  hair: "sidepart",
  hairColor: HAIR_COLORS[1]!,
  facialHair: "none",
  eyes: "calm",
  brows: "relaxed",
  mouth: "smile",
  blush: false,
  top: "suit",
  bottom: "trousers",
  topColor: "#2f6bff",
  accentColor: "#ff6b5b",
  bottomColor: "#2a2d3e",
  shoeColor: "#16151d",
  eyewear: "none",
  extra: "mug",
  extraColor: "#ffa53d",
};

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

export function randomAvatar(): AvatarConfig {
  return {
    body: pick(BODY_SHAPES),
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS.slice(0, 7)),
    facialHair: Math.random() > 0.65 ? pick(FACIAL_HAIR) : "none",
    eyes: pick(EYES),
    brows: pick(BROWS),
    mouth: pick(MOUTHS),
    blush: Math.random() > 0.8,
    top: pick(TOPS),
    bottom: pick(BOTTOMS),
    topColor: pick(CLOTH_COLORS),
    accentColor: pick(CLOTH_COLORS),
    bottomColor: pick(CLOTH_COLORS.slice(10)),
    shoeColor: pick(CLOTH_COLORS.slice(10)),
    eyewear: Math.random() > 0.6 ? pick(EYEWEAR) : "none",
    extra: Math.random() > 0.4 ? pick(EXTRAS) : "none",
    extraColor: pick(CLOTH_COLORS),
  };
}

/** Accepts anything (e.g. an old profile from localStorage) and returns a valid config. */
export function sanitizeAvatar(raw: unknown): AvatarConfig {
  const r = (raw ?? {}) as Partial<Record<keyof AvatarConfig, unknown>>;
  const oneOf = <T,>(list: readonly T[], v: unknown, d: T): T => (list.includes(v as T) ? (v as T) : d);
  const color = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  const d = DEFAULT_AVATAR;
  const legacyTop = r.top === "dress" ? "sheath" : r.top; // renamed in the outfit update
  return {
    body: oneOf(BODY_SHAPES, r.body, d.body),
    skin: color(r.skin, d.skin),
    hair: oneOf(HAIR_STYLES, r.hair, d.hair),
    hairColor: color(r.hairColor, d.hairColor),
    facialHair: oneOf(FACIAL_HAIR, r.facialHair, d.facialHair),
    eyes: oneOf(EYES, r.eyes, d.eyes),
    brows: oneOf(BROWS, r.brows, d.brows),
    mouth: oneOf(MOUTHS, r.mouth, d.mouth),
    blush: typeof r.blush === "boolean" ? r.blush : d.blush,
    top: oneOf(TOPS, legacyTop, d.top),
    bottom: oneOf(BOTTOMS, r.bottom, d.bottom),
    topColor: color(r.topColor, d.topColor),
    accentColor: color(r.accentColor, d.accentColor),
    bottomColor: color(r.bottomColor, d.bottomColor),
    shoeColor: color(r.shoeColor, d.shoeColor),
    eyewear: oneOf(EYEWEAR, r.eyewear, d.eyewear),
    extra: oneOf(EXTRAS, r.extra, d.extra),
    extraColor: color(r.extraColor, d.extraColor),
  };
}

/** Darker shade of a hex color, for outlines and shading. */
export function shade(hex: string, amount = 0.18): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
