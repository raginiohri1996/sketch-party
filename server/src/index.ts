import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@sketch/shared";

const PORT = Number(process.env.PORT ?? 3001);
const VERSION = process.env.npm_package_version ?? "0.1.0";

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  // In dev the client runs on Vite's port and proxies /socket.io here,
  // so the browser always talks to the same origin. No CORS needed.
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

io.on("connection", (socket) => {
  broadcastInfo();
  socket.on("client:ping", (ack) => ack(Date.now()));
  socket.on("disconnect", broadcastInfo);
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
