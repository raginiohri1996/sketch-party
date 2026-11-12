import { normalizeGuess, SOUND_IDS, type SoundId } from "@sketch/shared";
import { PACK_V1 } from "./wordpack";

export interface WordEntry {
  word: string;
  alts: string[];
  category: string;
  level: "easy" | "medium" | "hard";
  emoji: string;
  clues: [string, string, string];
  sound: SoundId | null;
  near: string[];
}

const LEVELS = { e: "easy", m: "medium", h: "hard" } as const;

/** Parses and checks a pack. Throws on mistakes so a bad pack never reaches players. */
export function parsePack(text: string): WordEntry[] {
  const entries: WordEntry[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of text.split("\n").entries()) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length !== 9) throw new Error(`Word pack line ${i}: expected 9 fields, got ${parts.length}: ${line}`);
    const [answers, category, level, emoji, c1, c2, c3, sound, near] = parts as [string, string, string, string, string, string, string, string, string];
    const [word, ...alts] = answers.split("/").map((s) => s.trim());
    if (!word || !(level in LEVELS) || !emoji || !c1 || !c2 || !c3) throw new Error(`Word pack line ${i}: missing data: ${line}`);
    if (sound && !(SOUND_IDS as readonly string[]).includes(sound)) throw new Error(`Word pack line ${i}: unknown sound "${sound}"`);
    if (seen.has(word)) throw new Error(`Word pack line ${i}: duplicate word "${word}"`);
    seen.add(word);
    // A clue must never give the answer away.
    for (const clue of [c1, c2, c3]) {
      const words = ` ${normalizeGuess(clue)} `;
      for (const a of [word, ...alts]) {
        if (words.includes(` ${normalizeGuess(a)} `)) throw new Error(`Word pack: a clue for "${word}" contains the answer: "${clue}"`);
      }
    }
    entries.push({
      word,
      alts,
      category,
      level: LEVELS[level as keyof typeof LEVELS],
      emoji,
      clues: [c1, c2, c3],
      sound: (sound || null) as SoundId | null,
      near: near ? near.split(",").map((s) => s.trim()).filter(Boolean) : [],
    });
  }
  return entries;
}

export const WORDS = parsePack(PACK_V1);
const BY_LEVEL = {
  easy: WORDS.filter((w) => w.level === "easy"),
  medium: WORDS.filter((w) => w.level === "medium"),
  hard: WORDS.filter((w) => w.level === "hard"),
};

/** One easy, one medium and one hard word, avoiding words this room already used. */
export function pickWordOptions(used: Set<string>): WordEntry[] {
  return (["easy", "medium", "hard"] as const).map((level) => {
    const pool = BY_LEVEL[level].filter((w) => !used.has(w.word));
    const list = pool.length ? pool : BY_LEVEL[level];
    return list[Math.floor(Math.random() * list.length)]!;
  });
}
