import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@sketch/shared";
import { RoomError, RoomManager } from "./rooms";

const PORT = Number(process.env.PORT ?? 3001);
const VERSION = process.env.npm_package_version ?? "0.1.0";

/** Abuse limits. Generous for real play, tight enough to stop floods. */
const MAX_CONNECTIONS_PER_IP = 30;
const EVENTS_PER_SECOND = 60; // drawing streams ~25 updates/s
const EVENT_BURST = 120;

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // Render (and most hosts) sit behind one proxy
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  // In dev the client runs on Vite's port and proxies /socket.io here,
  // so the browser always talks to the same origin. No CORS needed.
  maxHttpBufferSize: 64 * 1024, // no single message needs more than this
});

// Limit open connections per network address.
const connectionsByIp = new Map<string, number>();
const clientIp = (s: { handshake: { headers: Record<string, string | string[] | undefined>; address: string } }) => {
  const fwd = s.handshake.headers["x-forwarded-for"];
  return (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim() || s.handshake.address;
};
io.use((socket, next) => {
  const ip = clientIp(socket);
  const n = connectionsByIp.get(ip) ?? 0;
  if (n >= MAX_CONNECTIONS_PER_IP) return next(new Error("Too many connections from your network. Close a few tabs and try again."));
  connectionsByIp.set(ip, n + 1);
  socket.once("disconnect", () => {
    const left = (connectionsByIp.get(ip) ?? 1) - 1;
    if (left <= 0) connectionsByIp.delete(ip);
    else connectionsByIp.set(ip, left);
  });
  next();
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, version: VERSION, playersOnline: io.engine.clientsCount });
});

// In production the server also serves the built client (one URL for everything).
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, "../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Any other path (e.g. /room/ABCD invite links) gets the single-page app.
  app.get(/^(?!\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

function broadcastInfo() {
  io.emit("server:info", { version: VERSION, playersOnline: io.engine.clientsCount });
}

function pushState(code: string | null) {
  if (!code) return;
  const state = rooms.state(code);
  if (state) io.to(code).emit("room:state", state);
}

function pushPrivate(code: string) {
  for (const m of rooms.members(code)) io.to(m.socketId).emit("game:private", rooms.privateFor(code, m.playerId));
}

const rooms = new RoomManager({
  changed: pushState,
  privateChanged: pushPrivate,
  canvasReset: (code) => io.to(code).emit("draw:sync", []),
  draw: (code: string, event: "draw:begin" | "draw:points", data: never) => io.to(code).emit(event, data),
  nudge: (code, playerId, text) => {
    for (const m of rooms.members(code)) if (m.playerId === playerId) io.to(m.socketId).emit("game:nudge", text);
  },
});

// Phase timers: check deadlines a few times a second.
setInterval(() => rooms.tick(), 250).unref();

/** Runs a room action and answers the client with ok/error instead of crashing on bad input. */
function handle<T>(ack: unknown, fn: () => T) {
  const reply = typeof ack === "function" ? (ack as (r: unknown) => void) : () => {};
  try {
    reply({ ok: true, data: fn() });
  } catch (err) {
    const message = err instanceof RoomError ? err.message : "Something went wrong. Try again.";
    if (!(err instanceof RoomError)) console.error(err);
    reply({ ok: false, error: message });
  }
}

const validKey = (k: unknown): k is string => typeof k === "string" && /^[A-Za-z0-9-]{16,64}$/.test(k);

io.on("connection", (socket) => {
  // Token bucket per connection: events beyond the limit are quietly dropped.
  let tokens = EVENT_BURST;
  let refilledAt = Date.now();
  socket.use((_packet, next) => {
    const now = Date.now();
    tokens = Math.min(EVENT_BURST, tokens + ((now - refilledAt) / 1000) * EVENTS_PER_SECOND);
    refilledAt = now;
    if (tokens < 1) return; // drop
    tokens -= 1;
    next();
  });

  broadcastInfo();
  socket.on("client:ping", (ack) => typeof ack === "function" && ack(Date.now()));

  let key: string | null = null;
  let currentRoom: string | null = null;
  const createTimes: number[] = [];

  const enter = (code: string, playerId: string) => {
    if (currentRoom && currentRoom !== code) socket.leave(currentRoom);
    currentRoom = code;
    socket.join(code);
    pushState(code);
    // Catch up on a game in progress: the drawing so far, and the word if it's your turn.
    socket.emit("draw:sync", rooms.strokes(code));
    socket.emit("game:private", rooms.privateFor(code, playerId));
  };

  socket.on("room:create", (req, ack) =>
    handle(ack, () => {
      if (!validKey(req?.playerKey)) throw new RoomError("Please refresh the page and try again.");
      const now = Date.now();
      while (createTimes.length && now - createTimes[0]! > 60_000) createTimes.shift();
      if (createTimes.length >= 5) throw new RoomError("Too many rooms created. Wait a minute and try again.");
      createTimes.push(now);
      key = req.playerKey;
      const previous = currentRoom;
      const { room, player } = rooms.create(key, req.profile, socket.id);
      if (previous && previous !== room.code) pushState(previous);
      enter(room.code, player.id);
      return { code: room.code, playerId: player.id };
    }),
  );

  socket.on("room:join", (req, ack) =>
    handle(ack, () => {
      if (!validKey(req?.playerKey)) throw new RoomError("Please refresh the page and try again.");
      key = req.playerKey;
      const code = String(req.code ?? "").toUpperCase();
      const previous = currentRoom;
      const { room, player } = rooms.join(key, code, req.profile, socket.id);
      if (previous && previous !== room.code) pushState(previous);
      enter(room.code, player.id);
      return { code: room.code, playerId: player.id };
    }),
  );

  socket.on("room:leave", () => {
    if (!key) return;
    const code = rooms.leave(key);
    if (currentRoom) socket.leave(currentRoom);
    currentRoom = null;
    pushState(code);
  });

  socket.on("room:settings", (patch, ack) =>
    handle(ack, () => {
      if (!key) throw new RoomError("You're not in a room.");
      const room = rooms.updateSettings(key, patch ?? {});
      pushState(room.code);
      return null;
    }),
  );

  // ── Game ──
  socket.on("game:start", (ack) =>
    handle(ack, () => {
      if (!key) throw new RoomError("You're not in a room.");
      rooms.startGame(key);
      return null;
    }),
  );
  const safely = (fn: () => void) => {
    try {
      if (key) fn();
    } catch (err) {
      if (!(err instanceof RoomError)) console.error(err);
    }
  };
  socket.on("game:choose", (index) => safely(() => rooms.choose(key!, Number(index))));
  socket.on("game:guess", (text) => safely(() => rooms.guess(key!, String(text))));
  socket.on("game:lobby", () => safely(() => rooms.backToLobby(key!)));
  socket.on("game:hint", (kind) => safely(() => rooms.useHint(key!, kind)));
  socket.on("game:sabotage", (kind) => safely(() => rooms.sabotage(key!, kind)));

  // ── Drawing: only the current drawer's strokes are accepted, then relayed to everyone else ──
  socket.on("draw:begin", (stroke) =>
    safely(() => {
      const r = rooms.drawBegin(key!, stroke);
      if (r) socket.to(r.code).emit("draw:begin", r.stroke);
    }),
  );
  socket.on("draw:points", (data) =>
    safely(() => {
      const r = rooms.drawPoints(key!, data);
      if (r && r.points.length) socket.to(r.code).emit("draw:points", { id: r.id, points: r.points });
    }),
  );
  socket.on("draw:undo", () =>
    safely(() => {
      const code = rooms.drawUndo(key!);
      if (code) socket.to(code).emit("draw:undo");
    }),
  );
  socket.on("draw:clear", () =>
    safely(() => {
      const code = rooms.drawClear(key!);
      if (code) socket.to(code).emit("draw:clear");
    }),
  );

  socket.on("disconnect", () => {
    broadcastInfo();
    pushState(rooms.disconnect(socket.id));
  });
});

// Every few seconds, free seats whose owners didn't come back and close empty rooms.
setInterval(() => {
  const { changed, closed } = rooms.sweep();
  changed.forEach(pushState);
  closed.forEach((code) => io.to(code).emit("room:closed", "This room closed because everyone left."));
}, 5_000).unref();

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
