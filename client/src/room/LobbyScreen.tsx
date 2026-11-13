import { useEffect, useRef, useState } from "react";
import { MAX_AI_PLAYERS, MIN_PLAYERS_TO_START, ROUND_OPTIONS, TURN_SECONDS_OPTIONS, type RoomState } from "@sketch/shared";
import { Avatar } from "../avatar/Avatar";
import { Emoji } from "../ui/Emoji";
import { sfx } from "../game/sounds";
import { TopBar } from "../ui/TopBar";
import type { RoomApi } from "./useRoom";

type Props = { room: RoomState; myId: string; api: RoomApi; online: number | null };

export function LobbyScreen({ room, myId, api, online }: Props) {
  const me = room.players.find((p) => p.id === myId);
  const isHost = !!me?.isHost;
  const humans = room.players.filter((p) => !p.isBot).length;
  // People who are online, plus AI players. One person + one AI player is enough for a solo game.
  const readyPlayers = room.players.filter((p) => p.isBot || p.connected).length;
  const emptySeats = Math.max(0, room.maxPlayers - room.players.length);
  const [copied, setCopied] = useState(false);
  // A soft chime when someone new takes a seat.
  const seatCount = useRef(room.players.length);
  useEffect(() => {
    if (room.players.length > seatCount.current) sfx.join();
    seatCount.current = room.players.length;
  }, [room.players.length]);
  const inviteUrl = `${window.location.origin}/room/${room.code}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      window.prompt("Copy this invite link:", inviteUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="home home--lobby">
      <TopBar online={online}>
        {api.reconnecting && <span className="online online--warn">Reconnecting…</span>}
        <button className="btn btn--ghost btn--sm" onClick={api.leave}>
          Leave room
        </button>
      </TopBar>

      <main className="home__main">
        <section className="glass glass--clear lobby">
          <div className="lobby__head">
            <div>
              <p className="lobby__label">Room code</p>
              <p className="lobby__code" aria-label={`Room code ${room.code.split("").join(" ")}`}>
                {room.code.split("").map((ch, i) => (
                  <span key={i}>{ch}</span>
                ))}
              </p>
            </div>
            <button className="btn btn--ghost" onClick={copyInvite}>
              <Emoji name={copied ? "Check mark button" : "Clipboard"} size={18} /> {copied ? "Link copied" : "Copy invite link"}
            </button>
          </div>

          <div className="lobby__count">
            <span>
              {room.players.length} of {room.maxPlayers} seats filled
            </span>
            <span>{humans === 1 ? "Send the link to your team" : `${humans} people here`}</span>
          </div>

          <ul className="seats">
            {room.players.map((p) => (
              <li key={p.id} className={`seat ${p.id === myId ? "seat--me" : ""} ${p.connected ? "" : "seat--away"}`}>
                <Avatar config={p.avatar} crop="bust" className="seat__avatar" title={p.name} />
                <span className="seat__name">{p.name}</span>
                <span className="seat__tags">
                  {p.isHost && (
                    <span className="tag tag--host">
                      <Emoji name="Crown" size={13} /> Host
                    </span>
                  )}
                  {p.id === myId && <span className="tag tag--me">You</span>}
                  {p.isBot && (
                    <span className="tag">
                      <Emoji name="Robot" size={13} /> AI
                    </span>
                  )}
                  {!p.connected && <span className="tag tag--away">Reconnecting</span>}
                </span>
              </li>
            ))}
            {Array.from({ length: Math.min(emptySeats, 12) }, (_, i) => (
              <li key={`empty-${i}`} className="seat seat--empty" aria-hidden>
                <span>Open seat</span>
              </li>
            ))}
          </ul>
        </section>

        {isHost ? (
        <section className="glass glass--frost settings" aria-label="Game settings">
          <div className="settings__head">
            <h2 className="settings__title">Game settings</h2>
            <p className="settings__sub">{isHost ? "You're the host, so you set the rules." : "Only the host can change these."}</p>
          </div>

          <div className="settings__body">
            <Setting label="Rounds" hint="Everyone draws once per round.">
              <Choice
                options={ROUND_OPTIONS}
                value={room.settings.rounds}
                format={(v) => String(v)}
                disabled={!isHost}
                onPick={(rounds) => api.updateSettings({ rounds })}
              />
            </Setting>

            <Setting label="Time to draw" hint="How long each drawing turn lasts.">
              <Choice
                options={TURN_SECONDS_OPTIONS}
                value={room.settings.turnSeconds}
                format={(v) => `${v}s`}
                disabled={!isHost}
                onPick={(turnSeconds) => api.updateSettings({ turnSeconds })}
              />
            </Setting>

            <Setting label="AI players" hint={room.aiMode === "claude" ? "Powered by Claude: they look at the drawing to guess, and draw on their turn." : "Simulated players for now. Add an Anthropic API key on the server for Claude-powered ones."}>
              <div className="stepper">
                <button
                  className="stepper__btn"
                  disabled={!isHost || room.settings.aiPlayers <= 0}
                  onClick={() => api.updateSettings({ aiPlayers: room.settings.aiPlayers - 1 })}
                  aria-label="Fewer AI players"
                >
                  −
                </button>
                <span className="stepper__value">{room.settings.aiPlayers}</span>
                <button
                  className="stepper__btn"
                  disabled={!isHost || room.settings.aiPlayers >= MAX_AI_PLAYERS}
                  onClick={() => api.updateSettings({ aiPlayers: room.settings.aiPlayers + 1 })}
                  aria-label="More AI players"
                >
                  +
                </button>
              </div>
            </Setting>

            <Toggle label="Hints" hint="Drawers can drop emoji, sound and clue hints." value={room.settings.hints} disabled={!isHost} onChange={(hints) => api.updateSettings({ hints })} />
            <Toggle label="Twists" hint="Half the turns roll a surprise rule: one line, mirror hands, flashlight…" value={room.settings.twists} disabled={!isHost} onChange={(twists) => api.updateSettings({ twists })} />
            <Toggle label="Sabotage" hint="Guess right, earn coins, then mess with the drawer. Best with 3+ players." value={room.settings.sabotage} disabled={!isHost} onChange={(sabotage) => api.updateSettings({ sabotage })} />
          </div>

          {api.error && (
            <p className="banner" role="alert">
              {api.error}
              <button className="banner__close" onClick={api.clearError} aria-label="Dismiss">×</button>
            </p>
          )}

          <div className="settings__foot">
            {isHost ? (
              <button className="btn btn--primary" disabled={readyPlayers < MIN_PLAYERS_TO_START} onClick={api.startGame}>
                {readyPlayers < MIN_PLAYERS_TO_START ? "Invite someone or add an AI player" : humans === 1 ? "Start solo game" : "Start game"}
              </button>
            ) : (
              <p className="waiting">
                <Emoji name="Hourglass not done" size={18} /> Waiting for the host to start
              </p>
            )}
          </div>
        </section>
        ) : (
          <WaitingPanel room={room} />
        )}
      </main>
    </div>
  );
}

function Setting({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="setting">
      <div className="setting__text">
        <span className="setting__label">{label}</span>
        <span className="setting__hint">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function Choice<T extends number>({
  options, value, format, disabled, onPick,
}: { options: readonly T[]; value: T; format: (v: T) => string; disabled: boolean; onPick: (v: T) => void }) {
  return (
    <div className="choice" role="radiogroup">
      {options.map((o) => (
        <button key={o} role="radio" aria-checked={o === value} className={`choice__opt ${o === value ? "choice__opt--on" : ""}`} disabled={disabled} onClick={() => onPick(o)}>
          {format(o)}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, hint, value, disabled, onChange }: { label: string; hint: string; value: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="setting setting--toggle">
      <div className="setting__text">
        <span className="setting__label">{label}</span>
        <span className="setting__hint">{hint}</span>
      </div>
      <button role="switch" aria-checked={value} aria-label={label} className={`switch ${value ? "switch--on" : ""}`} disabled={disabled} onClick={() => onChange(!value)}>
        <span className="switch__knob" />
      </button>
    </div>
  );
}

/** What people who joined see instead of the settings: who's hosting and what happens next. */
function WaitingPanel({ room }: { room: RoomState }) {
  const host = room.players.find((p) => p.isHost);
  return (
    <section className="glass glass--frost waitroom" aria-label="Waiting for the host">
      {host && <Avatar config={host.avatar} crop="bust" className="waitroom__avatar" title={host.name} />}
      <h2 className="waitroom__title">Waiting for {host?.name ?? "the host"} to start</h2>
      <p className="waitroom__sub">
        You're in! The host picks the rules and starts the game. Each round, everyone draws once and guesses the rest.
      </p>
      <p className="waiting">
        <Emoji name="Hourglass not done" size={18} /> Hang tight…
      </p>
    </section>
  );
}
