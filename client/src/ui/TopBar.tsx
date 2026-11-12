import { useState, useSyncExternalStore, type ReactNode } from "react";
import { soundSettings } from "../game/sounds";
import { Emoji } from "./Emoji";
import { HowToPlay } from "./HowToPlay";

export function TopBar({ online, children }: { online: number | null; children?: ReactNode }) {
  const sound = useSyncExternalStore(soundSettings.subscribe, soundSettings.get);
  const [howOpen, setHowOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="logo">
        <Emoji name="Pencil" size={30} className="logo__icon" />
        <span className="logo__word">
          sketch<span className="logo__accent">party</span>
        </span>
      </div>
      <div className="topbar__right">
        {children}
        <button className="icon-btn" onClick={() => setHowOpen(true)} aria-label="How to play" title="How to play">
          ?
        </button>
        <button
          className={`icon-btn ${sound.music && !sound.muted ? "icon-btn--on" : ""}`}
          onClick={() => soundSettings.set({ music: !sound.music, muted: false })}
          aria-pressed={sound.music}
          aria-label="Background music"
          title={sound.music ? "Music on" : "Music off"}
        >
          🎵
        </button>
        <button
          className="icon-btn"
          onClick={() => soundSettings.set({ muted: !sound.muted })}
          aria-pressed={sound.muted}
          aria-label={sound.muted ? "Unmute sounds" : "Mute sounds"}
          title={sound.muted ? "Sounds off" : "Sounds on"}
        >
          {sound.muted ? "🔇" : "🔊"}
        </button>
        <div className="online" role="status">
          <span className={`online__dot ${online === null ? "online__dot--off" : ""}`} />
          {online === null ? "Connecting…" : `${online} online`}
        </div>
      </div>
      {howOpen && <HowToPlay onClose={() => setHowOpen(false)} />}
    </header>
  );
}
