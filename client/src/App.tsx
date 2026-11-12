import { useCallback, useEffect, useRef, useState } from "react";
import { GameScreen } from "./game/GameScreen";
import { ResultsScreen } from "./game/ResultsScreen";
import { HomeScreen } from "./home/HomeScreen";
import { LobbyScreen } from "./room/LobbyScreen";
import { useRoom } from "./room/useRoom";
import { loadProfile, saveProfile, type Profile } from "./profile";
import { socket } from "./socket";
import { Bubbles } from "./ui/Bubbles";

export function App() {
  const [online, setOnline] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  useEffect(() => saveProfile(profile), [profile]);

  const room = useRoom(useCallback(() => profileRef.current, []));

  useEffect(() => {
    const onInfo = (info: { playersOnline: number }) => setOnline(info.playersOnline);
    const onDisconnect = () => setOnline(null);
    socket.on("server:info", onInfo);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("server:info", onInfo);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // The free server sleeps when nobody's playing. If we can't connect within a few seconds, say why.
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    if (online !== null) {
      setWaking(false);
      return;
    }
    const t = window.setTimeout(() => setWaking(true), 3000);
    return () => window.clearTimeout(t);
  }, [online]);

  const r = room.room;
  const me = room.myId;
  let screen;
  if (r && me && r.phase === "playing" && r.game) screen = <GameScreen room={r} myId={me} api={room} online={online} />;
  else if (r && me && r.phase === "results") screen = <ResultsScreen room={r} myId={me} api={room} online={online} />;
  else if (r && me) screen = <LobbyScreen room={r} myId={me} api={room} online={online} />;
  else screen = <HomeScreen online={online} profile={profile} onProfileChange={setProfile} room={room} />;

  return (
    <>
      <Bubbles />
      {screen}
      {waking && (
        <p className="wake" role="status">
          <span className="wake__spinner" aria-hidden />
          {r ? "Connection lost. Reconnecting you to your seat…" : "Waking up the game server. This can take up to a minute after a quiet spell."}
        </p>
      )}
    </>
  );
}
