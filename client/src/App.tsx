import { useEffect, useState } from "react";
import { GAME_NAME, type ServerInfo } from "@sketch/shared";
import { socket } from "./socket";

type Status = "connecting" | "connected" | "disconnected";

export function App() {
  const [status, setStatus] = useState<Status>(socket.connected ? "connected" : "connecting");
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const onConnect = () => {
      setStatus("connected");
      const sent = Date.now();
      socket.emit("client:ping", () => setLatency(Date.now() - sent));
    };
    const onDisconnect = () => setStatus("disconnected");
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("server:info", setInfo);
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("server:info", setInfo);
    };
  }, []);

  return (
    <main className="shell">
      <h1>
        <span aria-hidden>✏️</span> {GAME_NAME}
      </h1>
      <p className="tagline">Draw it. Guess it. Survive the twists.</p>
      <div className={`status status--${status}`} role="status">
        <span className="dot" />
        {status === "connected" ? "Connected" : status === "connecting" ? "Connecting…" : "Disconnected"}
      </div>
      {info && (
        <p className="meta">
          {info.playersOnline} {info.playersOnline === 1 ? "player" : "players"} online · v{info.version}
          {latency !== null && ` · ${latency} ms`}
        </p>
      )}
    </main>
  );
}
