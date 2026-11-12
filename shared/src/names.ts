// Player-name rules, shared so the client and the server check names the same way.

export const NAME_MIN = 2;
export const NAME_MAX = 16;

// Small starter blocklists (English + common Hindi), matched after normalizing leetspeak.
// ANYWHERE: blocked even inside other words or split up ("f.u.c.k", "xXfuckXx").
// WHOLE_WORD: blocked only as a whole word, so "Shitake" or "Dickens" stay allowed.
const ANYWHERE = ["fuck", "fuk", "nigger", "nigga", "faggot", "madarchod", "behenchod", "bhenchod", "chutiya", "chutia", "bhosdi"];
const WHOLE_WORD = [
  "shit", "bitch", "cunt", "dick", "cock", "pussy", "asshole", "ass", "bastard", "slut", "whore",
  "retard", "rape", "rapist", "nazi", "porn", "penis", "vagina", "boob", "boobs", "sex", "fck",
  "gandu", "randi", "lund", "harami", "kamina",
];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "v": "u",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "");
}

export type NameCheck = { ok: true; name: string } | { ok: false; reason: string };

/** Trims and validates a player name. */
export function checkName(raw: string): NameCheck {
  const name = raw.replace(/\s+/g, " ").trim();
  const length = [...name].length;
  if (length < NAME_MIN) return { ok: false, reason: `At least ${NAME_MIN} characters` };
  if (length > NAME_MAX) return { ok: false, reason: `At most ${NAME_MAX} characters` };
  if (!/^[\p{L}\p{N}\p{Extended_Pictographic} _.\-'+!?&]+$/u.test(name)) {
    return { ok: false, reason: "Letters, numbers, spaces and emoji only" };
  }
  const flat = normalize(name);
  const words = name.split(/[\s_.\-']+/).map(normalize);
  if (ANYWHERE.some((w) => flat.includes(w)) || words.some((w) => WHOLE_WORD.includes(w))) {
    return { ok: false, reason: "Let's pick a friendlier name" };
  }
  return { ok: true, name };
}
