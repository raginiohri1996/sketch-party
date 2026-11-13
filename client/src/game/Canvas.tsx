import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { DRAW_COLORS, HUGE_BRUSH, INK_BUDGET, type ModifierId, type SabotageKind, type Stroke, type Tool } from "@sketch/shared";
import { socket } from "../socket";

export const PAPER = "#fbfaf6";
const FLUSH_MS = 40;
/** Brush sizes are defined for an 800px-wide canvas and scale with the real width. */
const BASE_WIDTH = 800;

/**
 * The drawing lives here, outside React, and listens all the time, so strokes that arrive before the
 * canvas mounts (e.g. rejoining mid-game) aren't lost. The mounted canvas just gets told to repaint.
 */
const board = { strokes: [] as Stroke[] };
type BoardEvent = { kind: "redraw" } | { kind: "paint"; stroke: Stroke; fromPair: number };
let listener: ((e: BoardEvent) => void) | null = null;
const notify = (e: BoardEvent) => listener?.(e);
socket.on("draw:sync", (all) => {
  board.strokes = all.map((s) => ({ ...s, points: [...s.points] }));
  notify({ kind: "redraw" });
});
socket.on("draw:begin", (s) => {
  const copy = { ...s, points: [...s.points] };
  board.strokes.push(copy);
  notify({ kind: "paint", stroke: copy, fromPair: 0 });
});
socket.on("draw:points", ({ id, points }) => {
  const s = board.strokes.find((x) => x.id === id);
  if (!s) return;
  const fromPair = s.points.length / 2;
  s.points.push(...points);
  notify({ kind: "paint", stroke: s, fromPair });
});
socket.on("draw:undo", () => {
  board.strokes.pop();
  notify({ kind: "redraw" });
});
socket.on("draw:clear", () => {
  board.strokes = [];
  notify({ kind: "redraw" });
});

export interface CanvasHandle {
  undo: () => void;
  clear: () => void;
}

type Props = {
  canDraw: boolean;
  tool: Tool;
  color: string;
  size: number;
  /** This turn's twist (affects how drawing works for the drawer, or what guessers can see). */
  modifier: ModifierId | null;
  /** Active sabotage, applied only on the drawer's screen. */
  effect: SabotageKind | null;
  /** Guessers see only a spotlight around the pen. */
  flashlight: boolean;
  /** Limited Ink: called with how much ink is left (0–1). */
  onInk?: (left: number) => void;
};

/**
 * The shared drawing board. Everyone renders the same strokes; only the drawer can add them.
 * Strokes use 0–1 coordinates, so the picture looks identical on every screen size.
 */
export const Canvas = forwardRef<CanvasHandle, Props>(function Canvas({ canDraw, tool, color, size, modifier, effect, flashlight, onInk }, ref) {
  if (canDraw && DEBUG_FX && !effect) effect = DEBUG_FX;
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const pending = useRef<number[]>([]);
  const flushTimer = useRef<number | null>(null);
  const ink = useRef(0);
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  const blocked = canDraw && (effect === "freeze" || (modifier === "oneLine" && board.strokes.length > 0 && !current.current));
  const realSize = effect === "hugeBrush" ? HUGE_BRUSH : size;
  const toolRef = useRef({ tool, color, size: realSize, canDraw: canDraw && !blocked, modifier, onInk, effect });
  toolRef.current = { tool, color, size: realSize, canDraw: canDraw && !blocked, modifier, onInk, effect };

  // New turn (empty board): refill the ink.
  useEffect(() => {
    ink.current = 0;
    onInk?.(1);
  }, [modifier, onInk]);

  const ctx = () => canvas.current?.getContext("2d") ?? null;

  const strokeStyle = (s: Stroke, c: CanvasRenderingContext2D, w: number) => {
    c.strokeStyle = s.tool === "eraser" ? PAPER : s.color;
    c.fillStyle = c.strokeStyle;
    c.lineWidth = (s.size * w) / BASE_WIDTH;
    c.lineCap = "round";
    c.lineJoin = "round";
  };

  /** Draws a stroke's segment from point index `from` (in pairs) to the end. */
  const paint = (s: Stroke, fromPair = 0) => {
    const c = ctx();
    const el = canvas.current;
    if (!c || !el) return;
    const w = el.width;
    const h = el.height;
    const p = s.points;
    if (p.length < 2) return;
    strokeStyle(s, c, w);
    if (p.length === 2) {
      c.beginPath();
      c.arc(p[0]! * w, p[1]! * h, c.lineWidth / 2, 0, Math.PI * 2);
      c.fill();
      return;
    }
    const start = Math.max(0, fromPair - 1) * 2;
    c.beginPath();
    c.moveTo(p[start]! * w, p[start + 1]! * h);
    for (let i = start + 2; i + 1 < p.length; i += 2) c.lineTo(p[i]! * w, p[i + 1]! * h);
    c.stroke();
  };

  const redraw = () => {
    const c = ctx();
    const el = canvas.current;
    if (!c || !el) return;
    c.fillStyle = PAPER;
    c.fillRect(0, 0, el.width, el.height);
    for (const s of board.strokes) paint(s);
  };

  // Keep the backing store matched to the on-screen size (sharp on retina screens).
  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    const resize = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.max(1, Math.round(r.width * dpr));
      el.height = Math.max(1, Math.round(r.height * dpr));
      redraw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();
    return () => ro.disconnect();
  }, []);

  // Repaint when strokes arrive from the drawer (via the server).
  useEffect(() => {
    listener = (e) => {
      if (e.kind === "redraw") {
        current.current = null;
        if (board.strokes.length === 0) {
          ink.current = 0;
          toolRef.current.onInk?.(1);
          setSpot(null);
        }
        redraw();
      } else {
        paint(e.stroke, e.fromPair);
        // Flashlight follows the newest point.
        const p = e.stroke.points;
        if (p.length >= 2) setSpot({ x: p[p.length - 2]!, y: p[p.length - 1]! });
      }
    };
    redraw();
    return () => {
      listener = null;
    };
  }, []);

  const flush = () => {
    flushTimer.current = null;
    const s = current.current;
    if (!s || pending.current.length === 0) return;
    socket.emit("draw:points", { id: s.id, points: pending.current });
    pending.current = [];
  };

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const m = toolRef.current.modifier;
    let x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    let y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (m === "mirror") x = 1 - x; // Mirror Hands: your hand goes right, the line goes left
    const fx = toolRef.current.effect;
    // Upside Down: the board is shown rotated, so map the finger back to where it visually is.
    if (fx === "upsideDown") {
      x = 1 - x;
      y = 1 - y;
    }
    if (fx === "earthquake") {
      x = Math.min(1, Math.max(0, x + (Math.random() - 0.5) * 0.03));
      y = Math.min(1, Math.max(0, y + (Math.random() - 0.5) * 0.03));
    }
    if (m === "shaky") {
      x = Math.min(1, Math.max(0, x + (Math.random() - 0.5) * 0.014));
      y = Math.min(1, Math.max(0, y + (Math.random() - 0.5) * 0.014));
    }
    return [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4] as const;
  };

  const onDown = (e: React.PointerEvent) => {
    if (!toolRef.current.canDraw || e.button > 0) return;
    if (toolRef.current.modifier === "limitedInk" && ink.current >= INK_BUDGET) return;
    // One Line: checked right now (not at the last re-render), so quick extra strokes can't sneak onto your screen.
    if (toolRef.current.modifier === "oneLine" && board.strokes.length > 0) return;
    if (toolRef.current.effect === "freeze") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    const { tool, size } = toolRef.current;
    // Rainbow Pen: a surprise colour for every line.
    let color = toolRef.current.color;
    if (toolRef.current.effect === "rainbow" && tool === "pen") {
      const options = RAINBOW.filter((c) => c !== lastRainbow);
      color = lastRainbow = options[Math.floor(Math.random() * options.length)]!;
    }
    const s: Stroke = { id: Math.random().toString(36).slice(2, 12), tool, color, size, points: [x, y] };
    current.current = s;
    board.strokes.push(s);
    paint(s);
    socket.emit("draw:begin", s);
  };

  const onMove = (e: React.PointerEvent) => {
    const s = current.current;
    if (!s) return;
    const [x, y] = pos(e);
    const lx = s.points[s.points.length - 2]!;
    const ly = s.points[s.points.length - 1]!;
    if (Math.hypot(x - lx, y - ly) < 0.002) return; // skip tiny jitters
    if (!toolRef.current.canDraw) return onUp(); // frozen mid-stroke
    if (toolRef.current.modifier === "limitedInk" && s.tool === "pen") {
      // Same ink maths as the server, so the meter matches what actually gets drawn.
      const d = Math.hypot(x - lx, (y - ly) * 0.75);
      if (ink.current + d > INK_BUDGET) return onUp();
      ink.current += d;
      toolRef.current.onInk?.(Math.max(0, 1 - ink.current / INK_BUDGET));
    }
    const before = s.points.length / 2;
    s.points.push(x, y);
    pending.current.push(x, y);
    paint(s, before);
    if (flushTimer.current === null) flushTimer.current = window.setTimeout(flush, FLUSH_MS);
  };

  const onUp = () => {
    if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
    flush();
    current.current = null;
  };

  useImperativeHandle(ref, () => ({
    undo: () => {
      board.strokes.pop();
      redraw();
      socket.emit("draw:undo");
    },
    clear: () => {
      board.strokes = [];
      redraw();
      socket.emit("draw:clear");
    },
  }));

  return (
    <div
      ref={wrap}
      className={`board ${canDraw ? `board--draw board--${tool}` : ""} ${blocked ? "board--blocked" : ""} ${canDraw && effect === "earthquake" ? "board--quake" : ""} ${canDraw && effect === "upsideDown" ? "board--flip" : ""} ${canDraw && effect === "fog" ? "board--fog" : ""}`}
    >
      <canvas
        ref={canvas}
        className="board__canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={(e) => e.buttons === 0 && onUp()}
        aria-label={canDraw ? "Drawing canvas: draw here" : "The current drawing"}
        role="img"
      />
      {flashlight && (
        <div
          className="flashlight"
          aria-hidden
          style={{ background: spot ? `radial-gradient(circle at ${spot.x * 100}% ${spot.y * 100}%, transparent 0 9%, rgba(12,10,29,0.985) 15%)` : "rgba(12,10,29,0.985)" }}
        />
      )}
      {canDraw && effect === "holi" && <HoliSplash />}
      {canDraw && effect === "fog" && (
        <div className="fog" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      )}
      {canDraw && effect === "freeze" && (
        <div className="frozen" aria-hidden>
          <span className="frozen__label">🧊 Frozen!</span>
        </div>
      )}
    </div>
  );
});

/** Debug aid: open the page with ?fx=holi (or fog, earthquake, upsideDown, rainbow, hugeBrush, freeze) to force a sabotage on your own drawing turns. */
const DEBUG_FX = new URLSearchParams(window.location.search).get("fx") as SabotageKind | null;

/** Rainbow Pen: only the bright colours (no black, grey, white or brown), never the same one twice in a row. */
const RAINBOW = DRAW_COLORS.filter((c) => !["#16151d", "#7d8597", "#f2efe8", "#8a5a36"].includes(c));
let lastRainbow = "";

const HOLI_COLORS =["#ff2d95", "#ffd400", "#00c97a", "#ff7a00", "#2f6bff", "#a23cff", "#ff4d4d"];

/** Holi colour powder thrown at the screen: splats burst out one after another, with droplets flying off each. */
function HoliSplash() {
  const [splats] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({
      x: 8 + Math.random() * 74,
      y: 6 + Math.random() * 70,
      size: 22 + Math.random() * 20,
      color: HOLI_COLORS[(i + Math.floor(Math.random() * HOLI_COLORS.length)) % HOLI_COLORS.length]!,
      rotate: Math.random() * 360,
      delay: i * 0.12,
      drops: Array.from({ length: 9 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 70;
        return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, r: 4 + Math.random() * 8 };
      }),
    })),
  );
  return (
    <div className="holi" aria-hidden>
      {splats.map((s, i) => (
        <div
          key={i}
          className="holi__splat"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}%`, "--c": s.color, "--rot": `${s.rotate}deg`, animationDelay: `${s.delay}s` } as React.CSSProperties}
        >
          <span className="holi__blob" />
          {s.drops.map((d, j) => (
            <span
              key={j}
              className="holi__drop"
              style={{ "--dx": `${d.dx}%`, "--dy": `${d.dy}%`, width: d.r, height: d.r, animationDelay: `${s.delay + 0.05}s` } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
