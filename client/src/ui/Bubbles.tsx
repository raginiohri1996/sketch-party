const ORBS = [
  { color: "var(--violet)", size: 520, left: 8, top: 12, duration: 28 },
  { color: "var(--coral)", size: 380, left: 88, top: 18, duration: 34 },
  { color: "var(--lime)", size: 300, left: 70, top: 92, duration: 30 },
  { color: "var(--tangerine)", size: 260, left: 22, top: 88, duration: 38 },
];

/** A few large, soft glowing orbs drifting slowly behind everything. Purely decorative. */
export function Bubbles() {
  return (
    <div className="orbs" aria-hidden>
      {ORBS.map((o, i) => (
        <span
          key={i}
          className="orb"
          style={
            {
              width: o.size,
              height: o.size,
              left: `${o.left}%`,
              top: `${o.top}%`,
              "--c": o.color,
              animationDuration: `${o.duration}s`,
              animationDelay: `${-i * 7}s`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="grain" />
    </div>
  );
}
