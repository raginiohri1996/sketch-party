// Types shared by the client and the server.
// Every Socket.IO event is declared here, so both sides agree on names and payloads.

export const GAME_NAME = "Sketch Party";

export interface ServerInfo {
  version: string;
  playersOnline: number;
}

/** Events the server sends to clients. */
export interface ServerToClientEvents {
  "server:info": (info: ServerInfo) => void;
}

/** Events clients send to the server. */
export interface ClientToServerEvents {
  "client:ping": (ack: (serverTime: number) => void) => void;
}
