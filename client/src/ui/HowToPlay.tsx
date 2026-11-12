import { useEffect, useRef } from "react";

const STEPS = [
  { icon: "✏️", title: "Take turns drawing", text: "Each round, everyone draws once. Pick one of three words: easy, medium or hard." },
  { icon: "⚡", title: "Guess fast", text: "Type guesses on the right. The faster you get it, the more points. You'll get a private 🔥 when you're close." },
  { icon: "💡", title: "Hints cost points", text: "Drawers can drop emoji, clue, category or sound hints. Each one lowers everyone's points; unused hints are a bonus for the drawer." },
  { icon: "🎰", title: "Twists and sabotage", text: "Some turns roll a twist like Mirror Hands or Flashlight. Guess right to earn coins, then spend them to mess with the drawer." },
];

export const TUTORIAL_KEY = "sketch-party.tutorial.v1";

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="how-title" onClick={onClose}>
      <div className="glass glass--frost modal__card" onClick={(e) => e.stopPropagation()}>
        <h2 id="how-title" className="modal__title">How to play</h2>
        <ol className="how">
          {STEPS.map((s) => (
            <li key={s.title} className="how__step">
              <span className="how__icon" aria-hidden>
                {s.icon}
              </span>
              <span>
                <strong>{s.title}</strong>
                <span className="how__text">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <button ref={button} className="btn btn--primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
