import type { AvatarConfig } from "./avatar";
import type { PublicGame } from "./game";

export const ROOM_CODE_LENGTH = 4;
/** No I or O, so codes can't be confused with 1 and 0 when read aloud or typed. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const MAX_PLAYERS = 10;
export const MAX_AI_PLAYERS = 6;

export const ROUND_OPTIONS = [2, 3, 4, 5] as const;
export const TURN_SECONDS_OPTIONS = [60, 80, 100, 120] as const;

export interface RoomSettings {
  rounds: (typeof ROUND_OPTIONS)[number];
  turnSeconds: (typeof TURN_SECONDS_OPTIONS)[number];
  aiPlayers: number;
  hints: boolean;
  twists: boolean;
  sabotage: boolean;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  rounds: 3,
  turnSeconds: 80,
  aiPlayers: 0,
  hints: true,
  twists: true,
  sabotage: true,
};

export interface Profile {
  name: string;
  avatar: AvatarConfig;
}

/** What everyone in the room can see about a player. Never includes secrets. */
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: AvatarConfig;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
}

export interface RoomState {
  code: string;
  phase: "lobby" | "playing" | "results";
  players: PublicPlayer[];
  settings: RoomSettings;
  maxPlayers: number;
  game: PublicGame | null;
  /** Server clock when this snapshot was sent, so clients can correct for clock differences. */
  serverNow: number;
  /** How AI players think: with Claude (an API key is set on the server) or a built-in simulation. */
  aiMode: "claude" | "simulated";
}

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && [...code].every((c) => ROOM_CODE_ALPHABET.includes(c));
}

/** Where a room code is found in a URL path, e.g. /room/KXQM */
export function roomCodeFromPath(path: string): string | null {
  const m = /^\/room\/([A-Za-z]{4})\/?$/.exec(path);
  return m ? m[1]!.toUpperCase() : null;
}

export type Ack<T> = (res: { ok: true; data: T } | { ok: false; error: string }) => void;
