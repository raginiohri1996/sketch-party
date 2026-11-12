import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@sketch/shared";

// Same origin in dev (Vite proxy) and in production (server serves the client).
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
