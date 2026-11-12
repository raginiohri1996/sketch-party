import { useCallback, useEffect, useRef, useState } from "react";
import {
  BRUSH_SIZES, CHOOSE_SECONDS, DRAW_COLORS, HINT_BONUS, HINT_PENALTY, MODIFIER_IDS, MODIFIERS, REVEAL_SECONDS, SABOTAGE_KINDS, SABOTAGES,
  type Hint, type HintKind, type ModifierId, type RoomState, type Tool,
} from "@sketch/shared";
import { Avatar } from "../avatar/Avatar";
import type { RoomApi } from "../room/useRoom";
import { HowToPlay, TUTORIAL_KEY } from "../ui/HowToPlay";
import { TopBar } from "../ui/TopBar";
import { Canvas, type CanvasHandle } from "./Canvas";
import { playSound, sfx } from "./sounds";

type Props = { room: RoomState; myId: string; api: RoomApi; online: number | null };

/** Re-renders a few times a second so countdowns tick. */
function useTicker(ms = 250) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => set((n) => n + 1), ms);
    return () => window.clearInterval(t);
  }, [ms]);
}

const LEVELS = ["Easy", "Medium", "Hard"];
const HINT_META: Record<HintKind, { icon: string; label: string }> = {
  emoji: { icon: "😀", label: "Emoji" },
  category: { icon: "🏷️", label: "Category" },
  clue: { icon: "💬", label: "Clue" },
  sound: { icon: "🔊", label: "Sound" },
};

export function GameScreen({ room, myId, api, online }: Props) {
  useTicker();
  const g = room.game!;
  const players = room.players;
  const byId = new Map(room.players.map((p) => [p.id, p]));
  const drawer = byId.get(g.drawerId);
  const amDrawer = g.drawerId === myId;
  const iGuessed = g.guessedIds.includes(myId);
  const now = api.serverNow();
  const secondsLeft = Math.max(0, Math.ceil((g.endsAt - now) / 1000));
  const turnSeconds = g.modifier === "speed" ? Math.round(room.settings.turnSeconds / 2) : room.settings.turnSeconds;
  const phaseTotal = g.phase === "drawing" ? turnSeconds : g.phase === "choosing" ? CHOOSE_SECONDS : REVEAL_SECONDS;
  const ranked = [...players].sort((a, b) => (g.scores[b.id] ?? 0) - (g.scores[a.id] ?? 0));
  const twist = g.modifier ? MODIFIERS[g.modifier] : null;
  const effect = g.sabotage && g.sabotage.until > now ? g.sabotage.kind : null;

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(DRAW_COLORS[0]);
  const [size, setSize] = useState<number>(BRUSH_SIZES[1]);
  const [inkLeft, setInkLeft] = useState(1);
  const onInk = useCallback((left: number) => setInkLeft(left), []);
  const board = useRef<CanvasHandle>(null);
  const colors: readonly string[] = g.palette ?? DRAW_COLORS;

  // Fresh turn: back to a normal pen, in an allowed color.
  useEffect(() => {
    setTool("pen");
    setColor((g.palette ?? DRAW_COLORS)[0]!);
  }, [g.drawerId, g.palette]);

  // Play a sound hint once when it appears.
  const heardSounds = useRef(0);
  useEffect(() => {
    const sounds = g.hints.filter((h) => h.sound);
    if (sounds.length > heardSounds.current) playSound(sounds[sounds.length - 1]!.sound!);
    heardSounds.current = sounds.length;
  }, [g.hints]);

  // A happy blip when you guess right.
  const wasRight = useRef(iGuessed);
  useEffect(() => {
    if (iGuessed && !wasRight.current) sfx.correct();
    wasRight.current = iGuessed;
  }, [iGuessed]);

  // Sounds for the big moments: your turn, someone else guessing, the last 5 seconds, the reveal.
  const prevPhase = useRef(g.phase);
  useEffect(() => {
    if (g.phase === prevPhase.current) return;
    if (g.phase === "choosing" && amDrawer) sfx.yourTurn();
    if (g.phase === "reveal") sfx.reveal();
    prevPhase.current = g.phase;
  }, [g.phase, amDrawer]);
  const prevGuessed = useRef(g.guessedIds.length);
  useEffect(() => {
    const fresh = g.guessedIds.slice(prevGuessed.current);
    if (fresh.length && !fresh.includes(myId)) sfx.someoneGot();
    prevGuessed.current = g.guessedIds.length;
  }, [g.guessedIds, myId]);
  useEffect(() => {
    if (g.phase === "drawing" && secondsLeft > 0 && secondsLeft <= 5) sfx.tick();
  }, [secondsLeft, g.phase]);

  // First game ever in this browser: show the quick guide.
  const [showHow, setShowHow] = useState(() => {
    try {
      return !localStorage.getItem(TUTORIAL_KEY);
    } catch {
      return false;
    }
  });
  const closeHow = useCallback(() => {
    setShowHow(false);
    try {
      localStorage.setItem(TUTORIAL_KEY, "seen");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="home game">
      <TopBar online={online}>
        {api.reconnecting && <span className="online online--warn">Reconnecting…</span>}
        <span className="online">
          Round {g.round} of {g.rounds}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={api.leave}>
          Leave game
        </button>
      </TopBar>

      <main className="game__main">
        {/* ── Players & scores ── */}
        <aside className="glass glass--frost scoreboard" aria-label="Scores">
          <ol className="scoreboard__list">
            {ranked.map((p, i) => {
              const drawing = p.id === g.drawerId && g.phase !== "reveal";
              const got = g.guessedIds.includes(p.id);
              const gained = g.phase === "reveal" ? g.turnPoints[p.id] : undefined;
              return (
                <li key={p.id} className={`score ${p.id === myId ? "score--me" : ""} ${got ? "score--got" : ""} ${p.connected ? "" : "score--away"}`}>
                  <span className="score__rank">{i + 1}</span>
                  <Avatar config={p.avatar} crop="head" className="score__avatar" title={p.name} />
                  <span className="score__who">
                    <span className="score__name">{p.isBot ? "🤖 " : ""}{p.name}</span>
                    <span className="score__status">
                      {drawing ? "Drawing" : got ? "Got it" : !p.connected ? "Reconnecting" : p.id === myId ? "You" : " "}
                      {room.settings.sabotage && (g.coins[p.id] ?? 0) > 0 && <span className="score__coins"> · 🪙 {g.coins[p.id]}</span>}
                    </span>
                  </span>
                  <span className="score__pts">
                    {g.scores[p.id] ?? 0}
                    {gained ? <span className="score__gain">+{gained}</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* ── Canvas ── */}
        <section className="glass glass--clear stagecard">
          <header className="stagecard__head">
            <div className="word" aria-live="polite">
              {g.phase === "choosing" && <span className="word__hint">{amDrawer ? "Pick a word to draw" : `${drawer?.name ?? "Someone"} is picking a word`}</span>}
              {g.phase === "drawing" && amDrawer && (
                <>
                  <span className="word__label">Draw</span>
                  <span className="word__text">{api.priv.word}</span>
                </>
              )}
              {g.phase === "drawing" && !amDrawer && (
                <>
                  <span className="word__label">{iGuessed ? "You got it!" : "Guess the word"}</span>
                  <span className="word__count">
                    {g.wordCount} {g.wordCount === 1 ? "word" : "words"}
                  </span>
                </>
              )}
              {g.phase === "reveal" && (
                <>
                  <span className="word__label">The word was</span>
                  <span className="word__text">{g.revealedWord ?? "skipped"}</span>
                </>
              )}
            </div>
            <div className="stagecard__right">
              <span className="stagecard__round" aria-label={`Round ${g.round} of ${g.rounds}`}>
                R{g.round}/{g.rounds}
              </span>
              {twist && g.phase === "drawing" && (
                <span className="twist-pill" title={twist.rule}>
                  {twist.emoji} {twist.name}
                </span>
              )}
              <Timer seconds={secondsLeft} total={phaseTotal} urgent={g.phase === "drawing" && secondsLeft <= 10} />
            </div>
          </header>

          {room.settings.hints && g.phase !== "choosing" && <HintBar hints={g.hints} hintsLeft={g.hintsLeft} />}

          <div className="stagecard__board">
            <div className="board-frame">
              <Canvas
                ref={board}
                canDraw={amDrawer && g.phase === "drawing"}
                tool={tool}
                color={color}
                size={size}
                modifier={g.phase === "drawing" ? g.modifier : null}
                effect={amDrawer ? effect : null}
                flashlight={g.modifier === "flashlight" && g.phase === "drawing" && !amDrawer && !iGuessed}
                onInk={onInk}
              />

              {g.phase === "choosing" && (
                <div className="overlay">
                  <div className="choose">
                    {room.settings.twists && <TwistReel key={g.drawerId + g.round} modifier={g.modifier} />}
                    {amDrawer && api.priv.options ? (
                      <>
                        <p className="overlay__title">Your turn to draw. Pick one:</p>
                        <div className="choose__cards">
                          {api.priv.options.map((w, i) => (
                            <button key={w} className="choose__card" onClick={() => api.chooseWord(i)}>
                              <span className={`choose__level choose__level--${i}`}>{LEVELS[i]}</span>
                              <span className="choose__word">{w}</span>
                            </button>
                          ))}
                        </div>
                        <p className="overlay__sub">One gets picked for you in {secondsLeft}s</p>
                      </>
                    ) : (
                      <div className="waiting-for">
                        {drawer && <Avatar config={drawer.avatar} crop="bust" className="waiting-for__avatar" />}
                        <p className="overlay__title">{drawer?.name ?? "The drawer"} is picking a word…</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {g.phase === "reveal" && (
                <div className="overlay overlay--soft">
                  <div className="reveal">
                    <p className="overlay__sub">The word was</p>
                    <p className="reveal__word">{g.revealedWord ?? "skipped"}</p>
                    <ul className="reveal__points">
                      {Object.entries(g.turnPoints)
                        .sort((a, b) => b[1] - a[1])
                        .map(([id, pts]) => (
                          <li key={id}>
                            <span>{byId.get(id)?.name ?? "Someone"}</span>
                            <span className="reveal__pts">+{pts}</span>
                          </li>
                        ))}
                      {Object.keys(g.turnPoints).length === 0 && <li className="reveal__none">Nobody got it this time</li>}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {amDrawer && g.phase === "drawing" ? (
            <div className="tools" role="toolbar" aria-label="Drawing tools">
              <div className="tools__colors">
                {colors.map((c) => (
                  <button
                    key={c}
                    className={`tools__color ${tool === "pen" && color === c ? "tools__color--on" : ""}`}
                    style={{ background: c }}
                    aria-label={`Color ${c}`}
                    aria-pressed={tool === "pen" && color === c}
                    onClick={() => {
                      setColor(c);
                      setTool("pen");
                    }}
                  />
                ))}
              </div>
              {g.modifier === "limitedInk" && (
                <div className="ink" title="Ink left">
                  <span className="ink__bar" style={{ width: `${Math.round(inkLeft * 100)}%` }} />
                  <span className="ink__label">{inkLeft <= 0 ? "Out of ink!" : "Ink"}</span>
                </div>
              )}
              <div className="tools__group">
                {BRUSH_SIZES.map((s) => (
                  <button
                    key={s}
                    className={`tools__size ${(effect === "tinyBrush" ? BRUSH_SIZES[0] : size) === s ? "tools__size--on" : ""}`}
                    onClick={() => setSize(s)}
                    disabled={effect === "tinyBrush"}
                    aria-label={`Brush size ${s}`}
                    aria-pressed={size === s}
                  >
                    <span style={{ width: Math.max(4, s * 0.9), height: Math.max(4, s * 0.9) }} />
                  </button>
                ))}
              </div>
              {g.modifier !== "oneLine" && (
                <div className="tools__group">
                  <button className={`tools__btn ${tool === "eraser" ? "tools__btn--on" : ""}`} onClick={() => setTool(tool === "eraser" ? "pen" : "eraser")} aria-pressed={tool === "eraser"}>
                    Eraser
                  </button>
                  <button className="tools__btn" onClick={() => board.current?.undo()}>
                    Undo
                  </button>
                  <button className="tools__btn" onClick={() => board.current?.clear()}>
                    Clear
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="tools tools--note">
              {g.phase === "drawing"
                ? g.modifier === "flashlight" && !iGuessed
                  ? "Flashlight twist: you only see where the pen is."
                  : `${drawer?.name ?? "Someone"} is drawing. Type your guesses on the right.`
                : g.phase === "reveal"
                  ? "Next turn starting…"
                  : "Get ready…"}
            </p>
          )}
        </section>

        {/* ── Guess feed, hints for the drawer, sabotage shop ── */}
        <GuessFeed room={room} myId={myId} api={api} amDrawer={amDrawer} iGuessed={iGuessed} />
      </main>
      {showHow && <HowToPlay onClose={closeHow} />}
    </div>
  );
}

function HintBar({ hints, hintsLeft }: { hints: Hint[]; hintsLeft: number }) {
  return (
    <div className="hintbar" aria-live="polite">
      {hints.length === 0 ? (
        <span className="hintbar__empty">No hints yet. The drawer has {hintsLeft} to give.</span>
      ) : (
        hints.map((h, i) => (
          <span key={i} className={`hint hint--${h.kind}`}>
            <span className="hint__icon">{HINT_META[h.kind].icon}</span>
            {h.kind === "sound" ? (
              <button className="hint__play" onClick={() => playSound(h.sound!)}>
                Play sound again
              </button>
            ) : (
              <span className="hint__text">{h.text}</span>
            )}
          </span>
        ))
      )}
    </div>
  );
}

/** Slot-machine reveal of this turn's twist (or "no twist"). */
function TwistReel({ modifier }: { modifier: ModifierId | null }) {
  const [spinning, setSpinning] = useState(true);
  const [face, setFace] = useState(0);
  useEffect(() => {
    sfx.slot();
    const iv = window.setInterval(() => setFace((f) => f + 1), 80);
    const stop = window.setTimeout(() => {
      window.clearInterval(iv);
      setSpinning(false);
    }, 1100);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(stop);
    };
  }, []);
  const rolling = MODIFIERS[MODIFIER_IDS[face % MODIFIER_IDS.length]!];
  const landed = modifier ? MODIFIERS[modifier] : null;
  return (
    <div className={`reel ${spinning ? "reel--spin" : landed ? "reel--hit" : "reel--miss"}`} aria-live="polite">
      <span className="reel__emoji">{spinning ? rolling.emoji : landed ? landed.emoji : "🙂"}</span>
      <span className="reel__text">
        <span className="reel__name">{spinning ? "Rolling a twist…" : landed ? `Twist: ${landed.name}` : "No twist this turn"}</span>
        {!spinning && landed && <span className="reel__rule">{landed.rule}</span>}
      </span>
    </div>
  );
}

function Timer({ seconds, total, urgent }: { seconds: number; total: number; urgent: boolean }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, seconds / total) : 0;
  return (
    <div className={`timer ${urgent ? "timer--urgent" : ""}`} role="timer" aria-label={`${seconds} seconds left`}>
      <svg viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r={r} className="timer__track" />
        <circle cx="24" cy="24" r={r} className="timer__fill" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span>{seconds}</span>
    </div>
  );
}

function GuessFeed({ room, myId, api, amDrawer, iGuessed }: { room: RoomState; myId: string; api: RoomApi; amDrawer: boolean; iGuessed: boolean }) {
  const g = room.game!;
  const names = new Map(room.players.map((p) => [p.id, p.name]));
  const [text, setText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const canGuess = g.phase === "drawing" && !amDrawer && !iGuessed;
  const coins = g.coins[myId] ?? 0;
  const now = api.serverNow();
  const sabotageBusy = !!g.sabotage && g.sabotage.until > now;
  const iSabotaged = g.sabotagedBy.includes(myId);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [g.feed.length]);
  useEffect(() => {
    // On phones, focusing would pop the keyboard over the drawing; let people tap the box themselves.
    const touch = window.matchMedia?.("(pointer: coarse)").matches;
    if (canGuess && !touch) input.current?.focus();
  }, [canGuess]);
  useEffect(() => {
    if (!api.nudge) return;
    setToast(api.nudge.text);
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [api.nudge]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !canGuess) return;
    api.guess(t);
    setText("");
  };

  const placeholder = amDrawer && g.phase === "drawing" ? "You're drawing, no peeking" : iGuessed ? "You got it! Waiting for the others" : g.phase === "drawing" ? "Type your guess" : "Wait for the next drawing";
  const avail = api.priv.hintsAvailable;

  return (
    <aside className="glass glass--frost feed" aria-label="Guesses">
      <ol ref={list} className="feed__list" aria-live="polite">
        {g.feed.map((f) => (
          <li key={f.id} className={`feed__item feed__item--${f.kind} ${f.playerId === myId ? "feed__item--me" : ""}`}>
            {f.kind === "guess" || f.kind === "close" ? (
              <>
                <span className="feed__name">{names.get(f.playerId ?? "") ?? "Someone"}</span> {f.text}
              </>
            ) : (
              f.text
            )}
          </li>
        ))}
      </ol>

      {/* Drawer: drop hints */}
      {amDrawer && g.phase === "drawing" && room.settings.hints && avail && (
        <div className="panel">
          <p className="panel__title">
            Drop a hint <span className="panel__meta">{g.hintsLeft} left</span>
          </p>
          <div className="panel__grid">
            {(["emoji", "category", "clue", "sound"] as HintKind[]).map((k) => {
              const ok = g.hintsLeft > 0 && (k === "clue" ? avail.clue > 0 : avail[k]);
              return (
                <button key={k} className="chip-btn" disabled={!ok} onClick={() => api.useHint(k)}>
                  {HINT_META[k].icon} {HINT_META[k].label}
                  {k === "clue" && avail.clue > 0 ? ` ${4 - avail.clue}/3` : ""}
                </button>
              );
            })}
            <button className="chip-btn chip-btn--wild" disabled={g.hintsLeft <= 0} onClick={() => api.useHint("wildcard")}>
              🎲 Wildcard
            </button>
          </div>
          <p className="panel__note">
            Each hint cuts guessers' points by {Math.round(HINT_PENALTY * 100)}%. Unused hints earn you +{HINT_BONUS} each.
          </p>
        </div>
      )}

      {/* Guessers who got it: sabotage shop */}
      {!amDrawer && iGuessed && g.phase === "drawing" && room.settings.sabotage && (
        <div className="panel panel--shop">
          <p className="panel__title">
            Sabotage the drawer <span className="panel__meta">🪙 {coins}</span>
          </p>
          <div className="panel__grid">
            {SABOTAGE_KINDS.map((k) => {
              const s = SABOTAGES[k];
              return (
                <button key={k} className="chip-btn" disabled={iSabotaged || sabotageBusy || coins < s.cost} onClick={() => api.sabotage(k)} title={s.desc}>
                  {s.emoji} {s.name} <span className="chip-btn__cost">🪙{s.cost}</span>
                </button>
              );
            })}
          </div>
          <p className="panel__note">{iSabotaged ? "You've had your fun this turn." : sabotageBusy ? "Someone's already sabotaging. Wait a moment." : "Only the drawer sees it. One per turn."}</p>
        </div>
      )}

      {toast && <p className="nudge" role="status">🔥 {toast}</p>}

      <form className="feed__form" onSubmit={submit}>
        <input
          ref={input}
          className="feed__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={!canGuess}
          maxLength={60}
          autoComplete="off"
          spellCheck={false}
          aria-label="Your guess"
        />
        <button className="btn btn--primary btn--sm" disabled={!canGuess || !text.trim()}>
          Guess
        </button>
      </form>
    </aside>
  );
}
