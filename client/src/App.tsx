import { useEffect, useState } from "react";
import { HomeScreen } from "./home/HomeScreen";
import { socket } from "./socket";
import { Bubbles } from "./ui/Bubbles";

export function App() {
  const [online, setOnline] = useState<number | null>(null);

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

  return (
    <>
      <Bubbles />
      <HomeScreen online={online} />
    </>
  );
}
