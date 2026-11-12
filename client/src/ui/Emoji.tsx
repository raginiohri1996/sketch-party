import { useState } from "react";

// Microsoft Fluent Emoji, Flat style (MIT): clean emoji that look the same on every computer.
const BASE = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets";

/** Fluent folder name → native fallback character. Add entries as the game needs them. */
export const EMOJI = {
  "Artist palette": "🎨",
  "Game die": "🎲",
  Pencil: "✏️",
  Sparkles: "✨",
  "Party popper": "🎉",
  Link: "🔗",
  Rocket: "🚀",
  "Counterclockwise arrows button": "🔄",
  "Hot beverage": "☕",
  Joystick: "🕹️",
  Crown: "👑",
  Robot: "🤖",
  Clipboard: "📋",
  "Check mark button": "✅",
  "Hourglass not done": "⏳",
  Trophy: "🏆",
  "Bust in silhouette": "👤",
  "Smiling face with smiling eyes": "😊",
  Scissors: "✂️",
  Necktie: "👔",
  Sunglasses: "🕶️",
  "1st place medal": "🥇",
  "2nd place medal": "🥈",
  "3rd place medal": "🥉",
} as const;

export type EmojiName = keyof typeof EMOJI;

function url(name: string) {
  const file = name.toLowerCase().replace(/[’']/g, "").replace(/[\s-]+/g, "_");
  return `${BASE}/${encodeURIComponent(name)}/Flat/${file}_flat.svg`;
}

export function Emoji({ name, size = 24, className }: { name: EmojiName; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={className} style={{ fontSize: size * 0.85, lineHeight: 1 }} aria-hidden>
        {EMOJI[name]}
      </span>
    );
  }
  return (
    <img
      className={className}
      src={url(name)}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      onError={() => setFailed(true)}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    />
  );
}
