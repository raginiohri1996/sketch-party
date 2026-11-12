// Vivid light sources behind the glass. Glassmorphism only works when there's
// strong color behind the panes, so these are bright, big and slow.
const LIGHTS = [
  { color: "#7a5cff", size: 620, left: 24, top: 46, duration: 26 }, // behind the avatar
  { color: "#ff4fd8", size: 440, left: 6, top: 88, duration: 32 },
  { color: "#3d7bff", size: 560, left: 82, top: 14, duration: 30 },
  { color: "#ffb547", size: 300, left: 62, top: 96, duration: 36 },
  { color: "#ff4fd8", size: 260, left: 96, top: 70, duration: 28 },
];

export function Bubbles() {
  return (
    <div className="lights" aria-hidden>
      {LIGHTS.map((l, i) => (
        <span
          key={i}
          className="light"
          style={
            {
              width: l.size,
              height: l.size,
              left: `${l.left}%`,
              top: `${l.top}%`,
              "--c": l.color,
              animationDuration: `${l.duration}s`,
              animationDelay: `${-i * 6}s`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="grain" />
    </div>
  );
}
