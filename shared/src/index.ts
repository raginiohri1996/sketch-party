// Types shared by the client and the server.
// Every Socket.IO event is declared here, so both sides agree on names and payloads.
import type { HintKind, PrivateGame, SabotageKind, Stroke } from "./game";
import type { Ack, Profile, RoomSettings, RoomState } from "./room";

export const GAME_NAME = "Sketch Party";

export interface ServerInfo {
  version: string;
  playersOnline: number;
}

/** Events the server sends to clients. */
export interface ServerToClientEvents {
  "server:info": (info: ServerInfo) => void;
  /** Full room snapshot, sent to everyone in the room whenever anything changes. */
  "room:state": (state: RoomState) => void;
  /** You are no longer in the room (left, or the room closed). */
  "room:closed": (reason: string) => void;
  /** Only for you: your word choices / your word when you're drawing. */
  "game:private": (data: PrivateGame) => void;
  /** Only for you: "So close!" after a near-miss guess. */
  "game:nudge": (text: string) => void;
  "draw:begin": (stroke: Stroke) => void;
  "draw:points": (data: { id: string; points: number[] }) => void;
  "draw:undo": () => void;
  "draw:clear": () => void;
  /** The whole drawing so far (on join, reconnect, or a new turn). */
  "draw:sync": (strokes: Stroke[]) => void;
}

/** Events clients send to the server. */
export interface ClientToServerEvents {
  "client:ping": (ack: (serverTime: number) => void) => void;
  /** playerKey is a private random id kept in the browser so a refresh rejoins the same seat. */
  "room:create": (req: { playerKey: string; profile: Profile }, ack: Ack<{ code: string; playerId: string }>) => void;
  "room:join": (req: { playerKey: string; code: string; profile: Profile }, ack: Ack<{ code: string; playerId: string }>) => void;
  "room:leave": () => void;
  "room:settings": (patch: Partial<RoomSettings>, ack: Ack<null>) => void;
  "game:start": (ack: Ack<null>) => void;
  "game:choose": (index: number) => void;
  "game:guess": (text: string) => void;
  "game:lobby": () => void;
  "game:hint": (kind: HintKind | "wildcard") => void;
  "game:sabotage": (kind: SabotageKind) => void;
  "draw:begin": (stroke: Stroke) => void;
  "draw:points": (data: { id: string; points: number[] }) => void;
  "draw:undo": () => void;
  "draw:clear": () => void;
}

export * from "./names";
export * from "./avatar";
export * from "./room";
export * from "./game";
