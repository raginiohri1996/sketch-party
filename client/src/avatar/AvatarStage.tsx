import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import type { AvatarConfig } from "./config";

export interface AvatarStageHandle {
  spin: () => void;
}

const FRICTION = 0.92;
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Avatar on a bubbly platform. Drag (or arrow keys) to turn it; it springs back to face you. */
export const AvatarStage = forwardRef<AvatarStageHandle, { config: AvatarConfig; name?: string }>(function AvatarStage(
  { config, name },
  ref,
) {
  const [angle, setAngle] = useState(0);
  const [popKey, setPopKey] = useState(0);
  const sim = useRef({ angle: 0, vel: 0, dragging: false, lastX: 0, base: 0 });

  useImperativeHandle(ref, () => ({
    spin: () => {
      sim.current.vel = 360 * (1 - FRICTION);
    },
  }));

  // Bounce whenever the look changes (skip the first render).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPopKey((k) => k + 1);
  }, [config]);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    // Debug aid: ?angle=90 freezes the avatar at that angle (handy for checking art from all sides).
    const frozen = Number(new URLSearchParams(window.location.search).get("angle"));
    const tick = (now: number) => {
      const s = sim.current;
      if (Number.isFinite(frozen) && window.location.search.includes("angle=")) {
        s.angle = frozen;
      } else if (!s.dragging) {
        s.vel *= FRICTION;
        s.angle += s.vel;
        if (Math.abs(s.vel) < 0.4) {
          s.base = Math.round(s.angle / 360) * 360;
          const sway = reducedMotion() ? 0 : Math.sin((now - start) / 1600) * 18;
          s.angle += (s.base + sway - s.angle) * 0.06;
        }
      }
      setAngle(s.angle);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    sim.current.dragging = true;
    sim.current.lastX = e.clientX;
    sim.current.vel = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = sim.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.lastX;
    s.lastX = e.clientX;
    s.angle += dx * 0.9;
    s.vel = dx * 0.9;
  };
  const onPointerUp = () => {
    sim.current.dragging = false;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") sim.current.vel -= 4;
    if (e.key === "ArrowRight") sim.current.vel += 4;
  };

  return (
    <div
      className="stage"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="Your avatar. Drag or use arrow keys to turn it."
    >
      <div className="stage__platform" aria-hidden />
      <div key={popKey} className={`stage__avatar ${popKey ? "pop" : ""}`}>
        <div className="stage__bob">
          <Avatar config={config} angle={angle} className="stage__svg" title={name ? `${name}'s avatar` : undefined} />
        </div>
      </div>
      <p className="stage__hint">← drag to turn →</p>
    </div>
  );
});
