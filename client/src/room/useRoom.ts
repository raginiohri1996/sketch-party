import { useCallback, useEffect, useRef, useState } from "react";
import { roomCodeFromPath, type HintKind, type PrivateGame, type SabotageKind, type Profile, type RoomSettings, type RoomState } from "@sketch/shared";
import { socket } from "../socket";

const KEY_STORAGE = "sketch-party.key.v1";
const LAST_ROOM = "sketch-party.lastRoom.v1";

/** Private id for this browser, so a refresh or flaky wifi gets you back into your seat. */
function playerKey(): string {
  try {
    const existing = localStorage.getItem(KEY_STORAGE);
    if (existing) return existing;
    const fresh = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(KEY_STORAGE, fresh);
    return fresh;
  } catch {
    // Storage blocked: fall back to a per-tab key (refresh won't keep the seat, but play still works).
    return (window as unknown as { __sketchKey?: string }).__sketchKey ??= crypto.randomUUID().replace(/-/g, "");
  }
}

const readLastRoom = () => {
  try { return localStorage.getItem(LAST_ROOM); } catch { return null; }
};
const writeLastRoom = (code: string | null) => {
  try { code ? localStorage.setItem(LAST_ROOM, code) : localStorage.removeItem(LAST_ROOM); } catch { /* ignore */ }
};

const go = (path: string) => {
  if (window.location.pathname !== path) window.history.pushState({}, "", path);
};

export interface RoomApi {
  room: RoomState | null;
  myId: string | null;
  /** Code from an invite link the visitor hasn't joined yet. */
  pendingCode: string | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  reconnecting: boolean;
  create: (profile: Profile) => void;
  join: (code: string, profile: Profile) => void;
  leave: () => void;
  updateSettings: (patch: Partial<RoomSettings>) => void;
  clearError: () => void;
  /** Your word choices / your word, when you're the drawer. */
  priv: PrivateGame;
  /** Current time on the server's clock (ms), for countdowns. */
  serverNow: () => number;
  startGame: () => void;
  chooseWord: (index: number) => void;
  guess: (text: string) => void;
  backToLobby: () => void;
  useHint: (kind: HintKind | "wildcard") => void;
  sabotage: (kind: SabotageKind) => void;
  /** Latest private "So close!" message (id changes each time). */
  nudge: { id: number; text: string } | null;
}

export function useRoom(getProfile: () => Profile): RoomApi {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(() => roomCodeFromPath(window.location.pathname));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [priv, setPriv] = useState<PrivateGame>({ options: null, word: null, hintsAvailable: null });
  const [nudge, setNudge] = useState<{ id: number; text: string } | null>(null);
  const clockOffset = useRef(0);
  const inRoom = useRef<string | null>(null);
  /** The server can send the first snapshot just before it confirms the join, so keep the latest one. */
  const latest = useRef<RoomState | null>(null);
  const profileRef = useRef(getProfile);
  profileRef.current = getProfile;

  const enter = useCallback((code: string, id: string) => {
    inRoom.current = code;
    writeLastRoom(code);
    if (latest.current?.code === code) setRoom(latest.current);
    setMyId(id);
    setPendingCode(null);
    setError(null);
    go(`/room/${code}`);
  }, []);

  const exit = useCallback((message: string | null) => {
    inRoom.current = null;
    writeLastRoom(null);
    setRoom(null);
    setMyId(null);
    setNotice(message);
    go("/");
  }, []);

  const join = useCallback(
    (code: string, profile: Profile) => {
      setBusy(true);
      setError(null);
      socket.emit("room:join", { playerKey: playerKey(), code, profile }, (res) => {
        setBusy(false);
        if (res.ok) enter(res.data.code, res.data.playerId);
        else {
          setError(res.error);
          if (inRoom.current === code) exit(null);
        }
      });
    },
    [enter, exit],
  );

  const create = useCallback(
    (profile: Profile) => {
      setBusy(true);
      setError(null);
      socket.emit("room:create", { playerKey: playerKey(), profile }, (res) => {
        setBusy(false);
        if (res.ok) enter(res.data.code, res.data.playerId);
        else setError(res.error);
      });
    },
    [enter],
  );

  const leave = useCallback(() => {
    socket.emit("room:leave");
    exit(null);
  }, [exit]);

  const updateSettings = useCallback((patch: Partial<RoomSettings>) => {
    setRoom((r) => (r ? { ...r, settings: { ...r.settings, ...patch } } : r)); // feels instant; server confirms
    socket.emit("room:settings", patch, (res) => {
      if (!res.ok) setError(res.error);
    });
  }, []);

  useEffect(() => {
    const onState = (state: RoomState) => {
      latest.current = state;
      clockOffset.current = state.serverNow - Date.now();
      if (state.code === inRoom.current) setRoom(state);
    };
    const onClosed = (reason: string) => exit(reason);
    // After any reconnect, quietly take our seat back.
    const onConnect = () => {
      setReconnecting(false);
      const code = inRoom.current;
      if (code) join(code, profileRef.current());
    };
    const onDisconnect = () => {
      if (inRoom.current) setReconnecting(true);
    };
    const onPop = () => {
      const code = roomCodeFromPath(window.location.pathname);
      if (!code && inRoom.current) {
        socket.emit("room:leave");
        exit(null);
      }
      if (code && code !== inRoom.current) setPendingCode(code);
    };
    socket.on("room:state", onState);
    socket.on("game:private", setPriv);
    const onNudge = (text: string) => setNudge({ id: Date.now(), text });
    socket.on("game:nudge", onNudge);
    socket.on("room:closed", onClosed);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    window.addEventListener("popstate", onPop);

    // Opening /room/CODE in a browser that already has a seat there (e.g. a refresh): rejoin automatically.
    const linked = roomCodeFromPath(window.location.pathname);
    if (linked && linked === readLastRoom()) {
      inRoom.current = linked;
      setPendingCode(null);
      if (socket.connected) join(linked, profileRef.current());
    }

    return () => {
      socket.off("room:state", onState);
      socket.off("game:private", setPriv);
      socket.off("game:nudge", onNudge);
      socket.off("room:closed", onClosed);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      window.removeEventListener("popstate", onPop);
    };
  }, [exit, join]);

  return {
    room,
    myId,
    pendingCode,
    busy,
    error,
    notice,
    reconnecting,
    create,
    join,
    leave,
    updateSettings,
    clearError: () => {
      setError(null);
      setNotice(null);
    },
    priv,
    serverNow: () => Date.now() + clockOffset.current,
    startGame: () => {
      setError(null);
      socket.emit("game:start", (res) => {
        if (!res.ok) setError(res.error);
      });
    },
    chooseWord: (index) => socket.emit("game:choose", index),
    guess: (text) => socket.emit("game:guess", text),
    backToLobby: () => socket.emit("game:lobby"),
    useHint: (kind) => socket.emit("game:hint", kind),
    sabotage: (kind) => socket.emit("game:sabotage", kind),
    nudge,
  };
}
