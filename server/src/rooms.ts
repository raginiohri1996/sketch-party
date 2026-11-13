import { randomUUID } from "node:crypto";
import {
  BRUSH_SIZES, CHOOSE_SECONDS, checkName, DEFAULT_SETTINGS, DRAW_COLORS, HINT_BONUS, HINT_PENALTY, HINTS_PER_TURN, INK_BUDGET,
  isCloseGuess, isCorrectGuess, MAX_AI_PLAYERS, MAX_PLAYERS, MIN_PLAYERS_TO_START, MODIFIER_IDS, MODIFIERS, randomAvatar,
  REVEAL_SECONDS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, ROUND_OPTIONS, SABOTAGES, sanitizeAvatar, TURN_SECONDS_OPTIONS, HUGE_BRUSH,
  type AvatarConfig, type FeedItem, type GamePhase, type Hint, type HintKind, type ModifierId, type PrivateGame, type Profile,
  type RoomSettings, type RoomState, type SabotageKind, type Stroke,
} from "@sketch/shared";
import { aiEnabled, drawWord, guessDrawing } from "./ai";
import { strokesToPng } from "./raster";
import { pickWordOptions, WORDS, type WordEntry } from "./words";

/** Cost guard: at most this many Claude calls per game (guesses + drawings). */
const AI_BUDGET = Number(process.env.AI_MAX_CALLS_PER_GAME) || 150;
const clamp01 = (n: unknown) => Math.round(Math.min(1, Math.max(0, Number(n) || 0)) * 1e4) / 1e4;

/** Safety cap on open rooms, to protect the server's memory. */
const MAX_ROOMS = 500;
/** A disconnected player keeps their seat this long (refreshes, flaky wifi). */
export const RECONNECT_GRACE_MS = 60_000;
/** If the drawer drops out mid-turn for this long, skip their turn. */
const DRAWER_AWAY_MS = 10_000;
const FEED_LIMIT = 60;
const MAX_STROKES = 1500;
const MAX_POINTS_PER_STROKE = 6000;

const BOT_NAMES = ["Auto-Reply", "Cron Job", "Beta Tester", "Pixel Pusher", "Null Pointer", "Sudo Sketch", "Lo-Fi Bot", "Ping Pong"];

interface Player {
  id: string;
  /** Private: only the owning browser knows it. Used to reclaim the seat after a refresh. */
  key: string | null;
  name: string;
  avatar: AvatarConfig;
  isBot: boolean;
  socketId: string | null;
  joinedAt: number;
  disconnectedAt: number | null;
}

interface Game {
  round: number;
  order: string[];
  turnIndex: number;
  phase: GamePhase;
  drawerId: string;
  endsAt: number;
  turnStartedAt: number;
  options: WordEntry[];
  entry: WordEntry | null;
  word: string;
  hints: Hint[];
  hintsLeft: number;
  modifier: ModifierId | null;
  palette: string[] | null;
  inkUsed: number;
  coins: Map<string, number>;
  sabotage: { kind: SabotageKind; until: number; byId: string } | null;
  sabotagedBy: Set<string>;
  guessed: Map<string, number>;
  turnPoints: Record<string, number>;
  scores: Map<string, number>;
  strokes: Stroke[];
  feed: FeedItem[];
  feedSeq: number;
  lastGuessAt: Map<string, number>;
  usedWords: Set<string>;
  /** Increments every turn, so late AI answers from a previous turn are ignored. */
  turnId: number;
  choosingStartedAt: number;
  bots: BotTurn;
  /** Upcoming twist slots (true = twist), refilled in pairs. */
  twistBag: boolean[];
  lastTwist: ModifierId | null;
}

/** Per-turn memory for AI players. */
interface BotTurn {
  nextThinkAt: Map<string, number>;
  aiCalls: Map<string, number>;
  pending: Set<string>;
  wrong: Map<string, string[]>;
  /** For an AI drawer: strokes still to be drawn, and when to drop each hint. */
  drawQueue: { stroke: Stroke; rest: number[] }[];
  drawStarted: boolean;
  hintTimes: number[];
  /** True when the AI drawer couldn't draw (no key / error) and is acting it out with hints. */
  hintsOnly: boolean;
}

const newBotTurn = (): BotTurn => ({
  nextThinkAt: new Map(), aiCalls: new Map(), pending: new Set(), wrong: new Map(),
  drawQueue: [], drawStarted: false, hintTimes: [], hintsOnly: false,
});

interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  settings: RoomSettings;
  phase: RoomState["phase"];
  game: Game | null;
  /** Claude calls used this game (cost guard). */
  aiCalls: number;
}

/** How the room manager tells the socket layer that something needs sending. */
export interface RoomHooks {
  /** Room snapshot changed: broadcast it. */
  changed(code: string): void;
  /** Private info (word choices / the word) may have changed for players in this room. */
  privateChanged(code: string): void;
  /** The drawing was wiped (new turn). */
  canvasReset(code: string): void;
  /** A private message for one player ("So close!"). */
  nudge(code: string, playerId: string, text: string): void;
  /** Strokes drawn by an AI player, to send to everyone. */
  draw(code: string, event: "draw:begin", data: Stroke): void;
  draw(code: string, event: "draw:points", data: { id: string; points: number[] }): void;
}

export class RoomError extends Error {}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private roomByKey = new Map<string, string>();

  constructor(private hooks: RoomHooks) {}

  get roomCount() {
    return this.rooms.size;
  }

  // ── Rooms & seats ──────────────────────────────────────────

  create(key: string, profile: Profile, socketId: string): { room: Room; player: Player } {
    this.leave(key);
    if (this.rooms.size >= MAX_ROOMS) throw new RoomError("The server is full right now. Try again in a few minutes.");
    const code = this.newCode();
    const room: Room = { code, hostId: "", players: new Map(), settings: { ...DEFAULT_SETTINGS }, phase: "lobby", game: null, aiCalls: 0 };
    this.rooms.set(code, room);
    const player = this.addHuman(room, key, profile, socketId);
    room.hostId = player.id;
    return { room, player };
  }

  join(key: string, code: string, profile: Profile, socketId: string): { room: Room; player: Player } {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError("That room doesn't exist. Check the code and try again.");

    // Same browser coming back (refresh / reconnect): reclaim the seat.
    const existing = [...room.players.values()].find((p) => p.key === key);
    if (existing) {
      existing.socketId = socketId;
      existing.disconnectedAt = null;
      existing.name = this.uniqueName(room, this.validName(profile?.name), existing.id);
      existing.avatar = sanitizeAvatar(profile?.avatar);
      return { room, player: existing };
    }

    this.leave(key);
    if (this.humans(room).length >= MAX_PLAYERS) throw new RoomError("This room is full.");
    // AI players are seat-fillers: a real person always gets the seat.
    if (room.players.size >= MAX_PLAYERS) this.removeOneBot(room);
    const player = this.addHuman(room, key, profile, socketId);
    if (room.game) {
      room.game.scores.set(player.id, 0);
      this.feed(room.game, "system", `${player.name} joined. They'll draw next round.`);
    }
    this.syncBots(room);
    return { room, player };
  }

  /** Leave on purpose. Returns the room code if the room still exists. */
  leave(key: string): string | null {
    const code = this.roomByKey.get(key);
    if (!code) return null;
    const room = this.rooms.get(code);
    this.roomByKey.delete(key);
    if (!room) return null;
    const player = [...room.players.values()].find((p) => p.key === key);
    if (player) this.removePlayer(room, player);
    return this.rooms.has(code) ? code : null;
  }

  /** Socket dropped. The seat is kept for RECONNECT_GRACE_MS. Returns the affected room code. */
  disconnect(socketId: string): string | null {
    for (const room of this.rooms.values()) {
      for (const p of room.players.values()) {
        if (p.socketId === socketId) {
          p.socketId = null;
          p.disconnectedAt = Date.now();
          return room.code;
        }
      }
    }
    return null;
  }

  updateSettings(key: string, patch: Partial<RoomSettings>): Room {
    const { room, me } = this.mine(key);
    if (room.hostId !== me.id) throw new RoomError("Only the host can change settings.");
    if (room.phase === "playing") throw new RoomError("Settings are locked while a game is running.");
    const s = room.settings;
    if (patch.rounds !== undefined && ROUND_OPTIONS.includes(patch.rounds)) s.rounds = patch.rounds;
    if (patch.turnSeconds !== undefined && TURN_SECONDS_OPTIONS.includes(patch.turnSeconds)) s.turnSeconds = patch.turnSeconds;
    if (typeof patch.aiPlayers === "number" && Number.isInteger(patch.aiPlayers)) {
      s.aiPlayers = Math.max(0, Math.min(MAX_AI_PLAYERS, patch.aiPlayers));
    }
    for (const k of ["hints", "twists", "sabotage"] as const) {
      if (typeof patch[k] === "boolean") s[k] = patch[k];
    }
    this.syncBots(room);
    return room;
  }

  // ── Game flow ──────────────────────────────────────────────

  startGame(key: string): Room {
    const { room, me } = this.mine(key);
    if (room.hostId !== me.id) throw new RoomError("Only the host can start the game.");
    if (room.phase === "playing") throw new RoomError("The game is already running.");
    const ready = [...room.players.values()].filter((p) => this.active(p));
    if (ready.length < MIN_PLAYERS_TO_START) {
      throw new RoomError("You need at least one more player. Invite a colleague or add an AI player.");
    }
    room.phase = "playing";
    room.game = {
      round: 1,
      order: [],
      turnIndex: 0,
      phase: "choosing",
      drawerId: "",
      endsAt: 0,
      turnStartedAt: 0,
      options: [],
      entry: null,
      word: "",
      hints: [],
      hintsLeft: HINTS_PER_TURN,
      modifier: null,
      palette: null,
      inkUsed: 0,
      coins: new Map(),
      sabotage: null,
      sabotagedBy: new Set(),
      guessed: new Map(),
      turnPoints: {},
      scores: new Map([...room.players.values()].map((p) => [p.id, 0])),
      strokes: [],
      feed: [],
      feedSeq: 0,
      lastGuessAt: new Map(),
      usedWords: room.game?.usedWords ?? new Set(),
      turnId: 0,
      choosingStartedAt: 0,
      bots: newBotTurn(),
      twistBag: [],
      lastTwist: null,
    };
    room.aiCalls = 0;
    this.feed(room.game, "system", `Round 1 of ${room.settings.rounds}. Good luck!`);
    this.startRound(room);
    return room;
  }

  choose(key: string, index: number) {
    const { room, me } = this.mine(key);
    const g = room.game;
    if (!g || g.phase !== "choosing" || g.drawerId !== me.id) return;
    const entry = g.options[Math.floor(index)];
    if (entry) this.beginDrawing(room, entry);
  }

  /** The drawer drops a hint. Each one lowers everyone's max points; unused ones become a drawer bonus. */
  useHint(key: string, requested: HintKind | "wildcard") {
    const { room, me } = this.mine(key);
    this.dropHint(room, me, requested);
  }

  private dropHint(room: Room, me: Player, requested: HintKind | "wildcard") {
    const g = room.game;
    if (!room.settings.hints || !g || g.phase !== "drawing" || g.drawerId !== me.id || g.hintsLeft <= 0 || !g.entry) return;
    const available = this.hintsAvailable(g)!;
    const open = (Object.keys(available) as HintKind[]).filter((k) => (k === "clue" ? available.clue > 0 : available[k]));
    if (open.length === 0) return;
    const kind = requested === "wildcard" ? open[Math.floor(Math.random() * open.length)]! : requested;
    if (!open.includes(kind)) return;

    const e = g.entry;
    const hint: Hint =
      kind === "emoji" ? { kind, text: e.emoji }
      : kind === "category" ? { kind, text: e.category }
      : kind === "sound" ? { kind, text: "Listen…", sound: e.sound! }
      : { kind, text: e.clues[3 - available.clue]! };
    g.hints.push(hint);
    g.hintsLeft--;
    const label = { emoji: "an emoji riddle", category: "the category", clue: "a clue", sound: "a sound" }[kind];
    this.feed(g, "system", `${me.name} dropped ${requested === "wildcard" ? "a wildcard: " : ""}${label}.`);
    this.hooks.privateChanged(room.code);
    this.hooks.changed(room.code);
  }

  /** A guesser who already got it spends coins to mess with the drawer. Only the drawer sees the effect. */
  sabotage(key: string, kind: SabotageKind) {
    const { room, me } = this.mine(key);
    const g = room.game;
    const spec = SABOTAGES[kind];
    if (!room.settings.sabotage || !spec || !g || g.phase !== "drawing") return;
    if (!g.guessed.has(me.id) || g.sabotagedBy.has(me.id)) return;
    if (g.sabotage && g.sabotage.until > Date.now()) return; // one at a time
    const coins = g.coins.get(me.id) ?? 0;
    if (coins < spec.cost) return;
    g.coins.set(me.id, coins - spec.cost);
    g.sabotagedBy.add(me.id);
    g.sabotage = { kind, until: Date.now() + spec.seconds * 1000, byId: me.id };
    this.feed(g, "system", `${spec.emoji} ${me.name} ${spec.verb}!`);
    this.hooks.changed(room.code);
  }

  guess(key: string, raw: string) {
    const { room, me } = this.mine(key);
    this.submitGuess(room, me, raw);
  }

  /** Shared by people and AI players. */
  private submitGuess(room: Room, me: Player, raw: string) {
    const g = room.game;
    if (!g || g.phase !== "drawing" || g.drawerId === me.id || g.guessed.has(me.id)) return;
    const now = Date.now();
    if (now - (g.lastGuessAt.get(me.id) ?? 0) < 400) return; // gentle spam guard
    g.lastGuessAt.set(me.id, now);
    const text = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!text) return;

    if (isCorrectGuess(text, g.word, g.entry?.alts)) {
      const total = g.endsAt - g.turnStartedAt;
      const remaining = Math.max(0, g.endsAt - now) / total;
      const first = g.guessed.size === 0;
      const hintFactor = Math.max(0.4, 1 - HINT_PENALTY * g.hints.length);
      const speedFactor = g.modifier === "speed" ? 2 : 1;
      const points = Math.round(((60 + 240 * remaining) * hintFactor + (first ? 50 : 0)) * speedFactor);
      g.guessed.set(me.id, points);
      g.coins.set(me.id, (g.coins.get(me.id) ?? 0) + (first ? 2 : 1));
      this.feed(g, "correct", `${me.name} got it!`, me.id);
      if (this.eligibleGuessers(room).every((p) => g.guessed.has(p.id))) this.endTurn(room);
      else this.hooks.changed(room.code);
    } else if (isCloseGuess(text, g.word, g.entry?.near)) {
      // Don't show a near-miss to everyone: it would give the word away.
      this.feed(g, "close", "is getting warm 🔥", me.id);
      this.hooks.nudge(room.code, me.id, `"${text}" is close!`);
      this.hooks.changed(room.code);
    } else {
      this.feed(g, "guess", text, me.id);
      this.hooks.changed(room.code);
    }
  }

  backToLobby(key: string) {
    const { room, me } = this.mine(key);
    if (room.hostId !== me.id || room.phase !== "results") return;
    room.phase = "lobby";
    if (room.game) room.game = { ...room.game, scores: new Map() }; // keep usedWords so the next game has fresh words
    this.hooks.changed(room.code);
  }

  /** Called a few times a second: moves phases on when their time runs out, and handles drop-outs. */
  tick(now = Date.now()) {
    for (const room of this.rooms.values()) {
      const g = room.game;
      if (room.phase !== "playing" || !g) continue;

      if ([...room.players.values()].filter((p) => this.active(p)).length < MIN_PLAYERS_TO_START || !this.humans(room).some((p) => p.socketId)) {
        this.feed(g, "system", "Not enough players left, so the game ended early.");
        this.finish(room);
        continue;
      }

      const drawer = room.players.get(g.drawerId);
      const drawerGone = !drawer || (drawer.disconnectedAt !== null && now - drawer.disconnectedAt > DRAWER_AWAY_MS);
      if ((g.phase === "choosing" || g.phase === "drawing") && drawerGone) {
        this.feed(g, "system", `${drawer?.name ?? "The drawer"} dropped out, so we're skipping their turn.`);
        this.endTurn(room, true);
        continue;
      }

      if (g.sabotage && now >= g.sabotage.until) {
        g.sabotage = null;
        this.hooks.changed(room.code);
      }

      this.botTick(room, now);
      if (room.phase !== "playing" || g.phase === "reveal" && now < g.endsAt) continue;

      if (now < g.endsAt) continue;
      if (g.phase === "choosing") this.beginDrawing(room, g.options[Math.floor(Math.random() * g.options.length)]!);
      else if (g.phase === "drawing") this.endTurn(room);
      else this.nextTurn(room);
    }
  }

  // ── Drawing ────────────────────────────────────────────────

  /** Returns the cleaned stroke if this player may draw it, otherwise null. */
  drawBegin(key: string, raw: Stroke): { code: string; stroke: Stroke } | null {
    const ctx = this.drawer(key);
    if (!ctx) return null;
    const { room, g } = ctx;
    if (g.strokes.length >= MAX_STROKES || !raw || typeof raw.id !== "string" || raw.id.length > 24) return null;
    if (g.modifier === "oneLine" && g.strokes.length >= 1) return null;
    if (g.modifier === "limitedInk" && g.inkUsed >= INK_BUDGET) return null;
    const effect = g.sabotage && g.sabotage.until > Date.now() ? g.sabotage.kind : null;
    if (effect === "freeze") return null;
    // Rainbow Pen: the drawer's browser picks a random colour per line, so any palette colour is fine.
    const allowed: readonly string[] = effect === "rainbow" ? DRAW_COLORS : g.palette ?? DRAW_COLORS;
    const stroke: Stroke = {
      id: raw.id,
      tool: raw.tool === "eraser" && g.modifier !== "oneLine" ? "eraser" : "pen",
      color: allowed.includes(raw.color) ? raw.color : allowed[0]!,
      size: effect === "hugeBrush" ? HUGE_BRUSH : (BRUSH_SIZES as readonly number[]).includes(raw.size) ? raw.size : BRUSH_SIZES[1],
      points: cleanPoints(raw.points).slice(0, 2),
    };
    g.strokes.push(stroke);
    return { code: room.code, stroke };
  }

  drawPoints(key: string, data: { id: string; points: number[] }): { code: string; id: string; points: number[] } | null {
    const ctx = this.drawer(key);
    if (!ctx || !data) return null;
    const g = ctx.g;
    const stroke = g.strokes.find((s) => s.id === data.id);
    if (!stroke || stroke.points.length >= MAX_POINTS_PER_STROKE) return null;
    if (g.sabotage?.kind === "freeze" && g.sabotage.until > Date.now()) return null;
    let points = cleanPoints(data.points);
    if (g.modifier === "limitedInk" && stroke.tool === "pen") {
      // Spend ink segment by segment; stop exactly where it runs out.
      let lx = stroke.points[stroke.points.length - 2] ?? points[0]!;
      let ly = stroke.points[stroke.points.length - 1] ?? points[1]!;
      let keep = 0;
      for (let i = 0; i + 1 < points.length; i += 2) {
        const d = Math.hypot(points[i]! - lx, (points[i + 1]! - ly) * 0.75);
        if (g.inkUsed + d > INK_BUDGET) break;
        g.inkUsed += d;
        lx = points[i]!;
        ly = points[i + 1]!;
        keep = i + 2;
      }
      points = points.slice(0, keep);
    }
    stroke.points.push(...points);
    return { code: ctx.room.code, id: stroke.id, points };
  }

  drawUndo(key: string): string | null {
    const ctx = this.drawer(key);
    if (!ctx || ctx.g.modifier === "oneLine") return null;
    ctx.g.strokes.pop();
    return ctx.room.code;
  }

  drawClear(key: string): string | null {
    const ctx = this.drawer(key);
    if (!ctx || ctx.g.modifier === "oneLine") return null;
    ctx.g.strokes = [];
    return ctx.room.code;
  }

  strokes(code: string): Stroke[] {
    return this.rooms.get(code)?.game?.strokes ?? [];
  }

  // ── Snapshots ──────────────────────────────────────────────

  /** Drops seats whose grace period ran out and closes rooms nobody is in. */
  sweep(now = Date.now()): { changed: string[]; closed: string[] } {
    const changed: string[] = [];
    const closed: string[] = [];
    for (const room of [...this.rooms.values()]) {
      let touched = false;
      for (const p of [...room.players.values()]) {
        if (!p.isBot && p.disconnectedAt && now - p.disconnectedAt > RECONNECT_GRACE_MS) {
          if (p.key) this.roomByKey.delete(p.key);
          this.removePlayer(room, p);
          touched = true;
        }
      }
      if (!this.rooms.has(room.code)) closed.push(room.code);
      else if (touched) changed.push(room.code);
    }
    return { changed, closed };
  }

  state(code: string): RoomState | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const players = [...room.players.values()]
      .sort((a, b) => Number(a.isBot) - Number(b.isBot) || a.joinedAt - b.joinedAt)
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.id === room.hostId,
        isBot: p.isBot,
        connected: p.isBot || p.socketId !== null,
      }));
    const g = room.game;
    const game =
      g && room.phase !== "lobby"
        ? {
            round: Math.min(g.round, room.settings.rounds),
            rounds: room.settings.rounds,
            phase: g.phase,
            drawerId: g.drawerId,
            endsAt: g.endsAt,
            wordCount: g.word ? g.word.split(" ").length : 0,
            revealedWord: (g.phase === "reveal" || room.phase === "results") && g.word ? g.word : null,
            guessedIds: [...g.guessed.keys()],
            scores: Object.fromEntries(g.scores),
            turnPoints: g.turnPoints,
            feed: g.feed,
            hints: g.hints,
            hintsLeft: room.settings.hints ? g.hintsLeft : 0,
            modifier: g.modifier,
            palette: g.palette,
            coins: Object.fromEntries(g.coins),
            sabotage: g.sabotage && g.sabotage.until > Date.now() ? g.sabotage : null,
            sabotagedBy: [...g.sabotagedBy],
          }
        : null;
    return { code: room.code, phase: room.phase, players, settings: { ...room.settings }, maxPlayers: MAX_PLAYERS, game, serverNow: Date.now(), aiMode: aiEnabled ? "claude" : "simulated" };
  }

  /** Word choices / word for one player. Everyone else gets nulls. */
  privateFor(code: string, playerId: string): PrivateGame {
    const room = this.rooms.get(code);
    const g = room?.game;
    const none: PrivateGame = { options: null, word: null, hintsAvailable: null };
    if (!room || !g || g.drawerId !== playerId || room.phase !== "playing") return none;
    if (g.phase === "choosing") return { ...none, options: g.options.map((o) => o.word) };
    if (g.phase === "drawing") return { ...none, word: g.word, hintsAvailable: room.settings.hints ? this.hintsAvailable(g) : null };
    return none;
  }

  private hintsAvailable(g: Game) {
    if (!g.entry) return null;
    const used = (k: HintKind) => g.hints.some((h) => h.kind === k);
    return {
      emoji: !used("emoji"),
      category: !used("category"),
      clue: 3 - g.hints.filter((h) => h.kind === "clue").length,
      sound: !!g.entry.sound && !used("sound"),
    };
  }

  /** Socket ids currently connected to a room, with the player each one belongs to. */
  members(code: string): { socketId: string; playerId: string }[] {
    const room = this.rooms.get(code);
    if (!room) return [];
    return [...room.players.values()].filter((p) => p.socketId).map((p) => ({ socketId: p.socketId!, playerId: p.id }));
  }

  // ── internals: game ────────────────────────────────────────

  private startRound(room: Room) {
    const g = room.game!;
    // Everyone present at the start of a round draws once. AI players join turns in a later update.
    g.order = [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt).map((p) => p.id);
    g.turnIndex = 0;
    if (g.round > 1) this.feed(g, "system", `Round ${g.round} of ${room.settings.rounds}.`);
    this.startTurn(room);
  }

  private startTurn(room: Room) {
    const g = room.game!;
    // Skip anyone who left or is offline when their turn comes up.
    while (g.turnIndex < g.order.length) {
      const p = room.players.get(g.order[g.turnIndex]!);
      if (p && this.active(p)) break;
      g.turnIndex++;
    }
    if (g.turnIndex >= g.order.length) return this.nextRound(room);

    const drawer = room.players.get(g.order[g.turnIndex]!)!;
    g.phase = "choosing";
    g.drawerId = drawer.id;
    g.options = pickWordOptions(g.usedWords);
    g.entry = null;
    g.word = "";
    g.guessed = new Map();
    g.turnPoints = {};
    g.strokes = [];
    g.hints = [];
    g.hintsLeft = HINTS_PER_TURN;
    g.inkUsed = 0;
    g.sabotage = null;
    g.sabotagedBy = new Set();
    g.turnId++;
    g.choosingStartedAt = Date.now();
    g.bots = newBotTurn();
    // Twist roll: shown during the choosing phase as a slot machine.
    g.modifier = room.settings.twists ? this.rollTwist(g) : null;
    g.palette = g.modifier === "threeColors" ? [...DRAW_COLORS].sort(() => Math.random() - 0.5).slice(0, 3) : null;
    g.endsAt = Date.now() + CHOOSE_SECONDS * 1000;
    this.feed(g, "system", `${drawer.name} is choosing a word.`);
    if (g.modifier) this.feed(g, "system", `Twist: ${MODIFIERS[g.modifier].name}. ${MODIFIERS[g.modifier].rule}`);
    this.hooks.canvasReset(room.code);
    this.hooks.privateChanged(room.code);
    this.hooks.changed(room.code);
  }

  /**
   * Exactly half the turns get a twist: every pair of turns holds one twisted and one plain turn, in random order.
   * The same twist never comes up twice in a row.
   */
  private rollTwist(g: Game): ModifierId | null {
    if (g.twistBag.length === 0) g.twistBag = Math.random() < 0.5 ? [true, false] : [false, true];
    if (!g.twistBag.shift()) return null;
    const options = MODIFIER_IDS.filter((m) => m !== g.lastTwist);
    g.lastTwist = options[Math.floor(Math.random() * options.length)]!;
    return g.lastTwist;
  }

  private beginDrawing(room: Room, entry: WordEntry) {
    const g = room.game!;
    g.entry = entry;
    g.word = entry.word;
    g.usedWords.add(entry.word);
    g.phase = "drawing";
    g.turnStartedAt = Date.now();
    const seconds = g.modifier === "speed" ? Math.round(room.settings.turnSeconds / 2) : room.settings.turnSeconds;
    g.endsAt = g.turnStartedAt + seconds * 1000;
    if (room.players.get(g.drawerId)?.isBot) this.startBotDrawing(room);
    this.hooks.privateChanged(room.code);
    this.hooks.changed(room.code);
  }

  private endTurn(room: Room, skipped = false) {
    const g = room.game!;
    const points: Record<string, number> = {};
    for (const [id, pts] of g.guessed) points[id] = pts;
    if (!skipped && g.word && g.guessed.size > 0) {
      const everyone = this.eligibleGuessers(room).length;
      const unusedHints = room.settings.hints ? g.hintsLeft : 0;
      const speedFactor = g.modifier === "speed" ? 2 : 1;
      const drawerPts = (g.guessed.size * 60 + (g.guessed.size === everyone ? 40 : 0) + unusedHints * HINT_BONUS) * speedFactor;
      points[g.drawerId] = drawerPts;
      g.coins.set(g.drawerId, (g.coins.get(g.drawerId) ?? 0) + 1);
    }
    g.sabotage = null;
    for (const [id, pts] of Object.entries(points)) g.scores.set(id, (g.scores.get(id) ?? 0) + pts);
    g.turnPoints = points;
    g.phase = "reveal";
    g.endsAt = Date.now() + REVEAL_SECONDS * 1000;
    if (g.word) this.feed(g, "system", `The word was "${g.word}".`);
    this.hooks.privateChanged(room.code);
    this.hooks.changed(room.code);
  }

  private nextTurn(room: Room) {
    room.game!.turnIndex++;
    this.startTurn(room);
  }

  private nextRound(room: Room) {
    const g = room.game!;
    g.round++;
    if (g.round > room.settings.rounds) return this.finish(room);
    this.startRound(room);
  }

  private finish(room: Room) {
    room.phase = "results";
    this.hooks.privateChanged(room.code);
    this.hooks.changed(room.code);
  }

  private eligibleGuessers(room: Room) {
    const g = room.game!;
    return [...room.players.values()].filter((p) => p.id !== g.drawerId && this.active(p));
  }

  private drawer(key: string): { room: Room; g: Game } | null {
    const code = this.roomByKey.get(key);
    const room = code ? this.rooms.get(code) : undefined;
    const g = room?.game;
    if (!room || !g || room.phase !== "playing" || g.phase !== "drawing") return null;
    const me = [...room.players.values()].find((p) => p.key === key);
    return me && me.id === g.drawerId ? { room, g } : null;
  }

  private feed(g: Game, kind: FeedItem["kind"], text: string, playerId?: string) {
    g.feed = [...g.feed, { id: ++g.feedSeq, kind, text, playerId }].slice(-FEED_LIMIT);
  }

  // ── internals: AI players ──────────────────────────────────

  /** People with an open connection, and AI players (always "here"). */
  private active(p: Player) {
    return p.isBot || p.socketId !== null;
  }

  private botTick(room: Room, now: number) {
    const g = room.game!;
    const drawer = room.players.get(g.drawerId);

    if (g.phase === "choosing" && drawer?.isBot && now - g.choosingStartedAt > 2200) {
      // AI players mostly pick the easy or medium word.
      this.beginDrawing(room, g.options[Math.random() < 0.6 ? 0 : 1] ?? g.options[0]!);
      return;
    }
    if (g.phase !== "drawing") return;
    if (drawer?.isBot) this.botDrawStep(room, now);

    for (const p of room.players.values()) {
      if (!p.isBot || p.id === g.drawerId || g.guessed.has(p.id) || room.game?.phase !== "drawing") continue;
      const b = g.bots;
      if (!b.nextThinkAt.has(p.id)) {
        b.nextThinkAt.set(p.id, g.turnStartedAt + 6000 + Math.random() * 5000); // stagger the bots
        continue;
      }
      if (now < b.nextThinkAt.get(p.id)! || b.pending.has(p.id)) continue;
      b.nextThinkAt.set(p.id, now + 7000 + Math.random() * 5000);

      const inked = g.strokes.reduce((n, s) => n + s.points.length, 0) > 30;
      const useClaude = aiEnabled && room.aiCalls < AI_BUDGET && (b.aiCalls.get(p.id) ?? 0) < 6 && inked && !b.hintsOnly;
      if (useClaude) this.botAskClaude(room, p);
      else this.botSimulateGuess(room, p, now);
    }
  }

  /** Show Claude the canvas and post whatever it guesses (right or wrong, like a person would). */
  private botAskClaude(room: Room, bot: Player) {
    const g = room.game!;
    const turn = g.turnId;
    g.bots.pending.add(bot.id);
    g.bots.aiCalls.set(bot.id, (g.bots.aiCalls.get(bot.id) ?? 0) + 1);
    room.aiCalls++;
    const wrong = g.bots.wrong.get(bot.id) ?? [];
    guessDrawing({ png: strokesToPng(g.strokes), wordCount: g.word.split(" ").length, hints: g.hints, wrongGuesses: wrong })
      .then((guess) => {
        g.bots.pending.delete(bot.id);
        const now = room.game;
        if (!guess || !now || now.turnId !== turn || now.phase !== "drawing" || room.phase !== "playing") return;
        if (!isCorrectGuess(guess, now.word, now.entry?.alts)) g.bots.wrong.set(bot.id, [...wrong, guess].slice(-8));
        this.submitGuess(room, bot, guess);
      })
      .catch((err: unknown) => {
        g.bots.pending.delete(bot.id);
        console.warn(`AI guess failed: ${err instanceof Error ? err.message : err}`);
      });
  }

  /**
   * No API key (or out of budget): simulate a player. The chance of getting it right grows with time and hints,
   * so AI players feel like decent but beatable colleagues. Sometimes they throw out a wrong guess for fun.
   */
  private botSimulateGuess(room: Room, bot: Player, now: number) {
    const g = room.game!;
    const elapsed = Math.min(1, (now - g.turnStartedAt) / Math.max(1, g.endsAt - g.turnStartedAt));
    const levelFactor = g.entry?.level === "easy" ? 1.25 : g.entry?.level === "hard" ? 0.7 : 1;
    const somethingToGoOn = g.strokes.length > 0 || g.hints.length > 0;
    const chance = somethingToGoOn ? Math.min(0.75, (0.05 + 0.12 * g.hints.length + 0.35 * elapsed) * levelFactor) : 0;
    if (Math.random() < chance) {
      this.submitGuess(room, bot, g.word);
    } else if (somethingToGoOn && Math.random() < 0.55) {
      const sameCategory = WORDS.filter((w) => w.category === g.entry?.category && w.word !== g.word);
      const pool = [...(g.entry?.near ?? []), ...sameCategory.map((w) => w.word)];
      if (pool.length) this.submitGuess(room, bot, pool[Math.floor(Math.random() * pool.length)]!);
    }
  }

  /** An AI player's turn to draw: ask Claude for strokes, or act it out with hints when that's not possible. */
  private startBotDrawing(room: Room) {
    const g = room.game!;
    const turn = g.turnId;
    const total = g.endsAt - g.turnStartedAt;
    g.bots.hintTimes = room.settings.hints ? [0.4, 0.6, 0.8].map((f) => g.turnStartedAt + f * total) : [];
    if (!aiEnabled || room.aiCalls >= AI_BUDGET) return this.botHintsOnly(room, turn);

    room.aiCalls++;
    drawWord(g.word)
      .then((drawing) => {
        const now = room.game;
        if (!now || now.turnId !== turn || now.phase !== "drawing") return;
        const strokes = (drawing?.strokes ?? []).filter((s) => s.points.length >= 2).slice(0, 16);
        if (!strokes.length) return this.botHintsOnly(room, turn);
        const allowed: readonly string[] = now.palette ?? DRAW_COLORS;
        let queue = strokes.map((s, i) => {
          const flat = s.points.slice(0, 40).flatMap((pt) => [clamp01(pt[0]), clamp01(pt[1])]);
          const stroke: Stroke = {
            id: `bot${turn}-${i}`,
            tool: "pen",
            color: allowed.includes(s.color) ? s.color : allowed[i % allowed.length]!,
            size: s.thick ? BRUSH_SIZES[1] : BRUSH_SIZES[0],
            points: flat.slice(0, 2),
          };
          return { stroke, rest: flat.slice(2) };
        });
        // One Line twist: join everything into a single stroke.
        if (now.modifier === "oneLine") queue = [{ stroke: queue[0]!.stroke, rest: queue.flatMap((q, i) => (i === 0 ? q.rest : [...q.stroke.points, ...q.rest])) }];
        now.bots.drawQueue = queue;
      })
      .catch((err: unknown) => {
        console.warn(`AI drawing failed: ${err instanceof Error ? err.message : err}`);
        this.botHintsOnly(room, turn);
      });
  }

  private botHintsOnly(room: Room, turn: number) {
    const g = room.game;
    if (!g || g.turnId !== turn || g.phase !== "drawing") return;
    const drawer = room.players.get(g.drawerId);
    g.bots.hintsOnly = true;
    const now = Date.now();
    g.bots.hintTimes = [now + 1500, now + 12000, now + 24000];
    this.feed(g, "system", `${drawer?.name ?? "The AI player"} can't draw right now, so they're acting it out with hints.`);
    this.hooks.changed(room.code);
  }

  /** Feeds the AI drawer's strokes out a few points at a time, so it looks like live drawing. */
  private botDrawStep(room: Room, now: number) {
    const g = room.game!;
    const b = g.bots;
    const drawer = room.players.get(g.drawerId)!;
    while (b.hintTimes.length && now >= b.hintTimes[0]!) {
      b.hintTimes.shift();
      const order: (HintKind | "wildcard")[] = b.hintsOnly ? ["category", "emoji", "clue"] : ["emoji", "clue", "category"];
      this.dropHint(room, drawer, order[HINTS_PER_TURN - g.hintsLeft] ?? "clue");
    }
    const cur = b.drawQueue[0];
    if (!cur) return;
    if (!b.drawStarted) {
      b.drawStarted = true;
      g.strokes.push(cur.stroke);
      this.hooks.draw(room.code, "draw:begin", { ...cur.stroke, points: [...cur.stroke.points] });
    }
    const chunk = cur.rest.splice(0, 10);
    if (chunk.length) {
      cur.stroke.points.push(...chunk);
      this.hooks.draw(room.code, "draw:points", { id: cur.stroke.id, points: chunk });
    }
    if (!cur.rest.length) {
      b.drawQueue.shift();
      b.drawStarted = false;
    }
  }

  // ── internals: seats ───────────────────────────────────────

  private mine(key: string): { room: Room; me: Player } {
    const code = this.roomByKey.get(key);
    const room = code ? this.rooms.get(code) : undefined;
    const me = room && [...room.players.values()].find((p) => p.key === key);
    if (!room || !me) throw new RoomError("You're not in a room.");
    return { room, me };
  }

  private humans(room: Room) {
    return [...room.players.values()].filter((p) => !p.isBot);
  }

  private validName(raw: unknown): string {
    const check = checkName(String(raw ?? ""));
    if (!check.ok) throw new RoomError(`Name: ${check.reason}`);
    return check.name;
  }

  private uniqueName(room: Room, name: string, selfId?: string): string {
    const taken = new Set([...room.players.values()].filter((p) => p.id !== selfId).map((p) => p.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let n = 2; ; n++) {
      const candidate = `${name.slice(0, 13)} ${n}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  private addHuman(room: Room, key: string, profile: Profile, socketId: string): Player {
    const name = this.validName(profile?.name);
    const player: Player = {
      id: randomUUID().slice(0, 8),
      key,
      name: this.uniqueName(room, name),
      avatar: sanitizeAvatar(profile?.avatar),
      isBot: false,
      socketId,
      joinedAt: Date.now(),
      disconnectedAt: null,
    };
    room.players.set(player.id, player);
    this.roomByKey.set(key, room.code);
    return player;
  }

  private removePlayer(room: Room, player: Player) {
    room.players.delete(player.id);
    const humans = this.humans(room);
    if (humans.length === 0) {
      this.rooms.delete(room.code);
      return;
    }
    if (room.hostId === player.id) {
      // Hand the crown to whoever has been here longest, preferring someone online.
      const next = humans.sort((a, b) => Number(a.socketId === null) - Number(b.socketId === null) || a.joinedAt - b.joinedAt)[0]!;
      room.hostId = next.id;
    }
    if (room.game) this.feed(room.game, "system", `${player.name} left.`);
    this.syncBots(room);
  }

  private syncBots(room: Room) {
    const bots = [...room.players.values()].filter((p) => p.isBot);
    const target = Math.min(room.settings.aiPlayers, MAX_PLAYERS - this.humans(room).length);
    for (let i = bots.length; i < target; i++) {
      const used = new Set([...room.players.values()].map((p) => p.name));
      const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${i + 1}`;
      const bot: Player = { id: randomUUID().slice(0, 8), key: null, name, avatar: randomAvatar(), isBot: true, socketId: null, joinedAt: Date.now() + i, disconnectedAt: null };
      room.players.set(bot.id, bot);
    }
    for (let i = bots.length; i > target; i--) this.removeOneBot(room);
  }

  private removeOneBot(room: Room) {
    const bots = [...room.players.values()].filter((p) => p.isBot).sort((a, b) => b.joinedAt - a.joinedAt);
    if (bots[0]) room.players.delete(bots[0].id);
  }

  private newCode(): string {
    for (;;) {
      let code = "";
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }
}

/** Keep only finite numbers in 0–1, rounded to 4 decimals, as x/y pairs. */
function cleanPoints(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (let i = 0; i + 1 < raw.length && out.length < 800; i += 2) {
    const x = Number(raw[i]);
    const y = Number(raw[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push(Math.round(Math.min(1, Math.max(0, x)) * 1e4) / 1e4, Math.round(Math.min(1, Math.max(0, y)) * 1e4) / 1e4);
  }
  return out;
}
