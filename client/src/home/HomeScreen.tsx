import { useRef, useState } from "react";
import { checkName, isValidRoomCode, NAME_MAX, normalizeRoomCode } from "@sketch/shared";
import { AvatarStage, type AvatarStageHandle } from "../avatar/AvatarStage";
import { Customizer } from "../avatar/Customizer";
import { randomAvatar } from "../avatar/config";
import type { Profile } from "../profile";
import type { RoomApi } from "../room/useRoom";
import { Emoji } from "../ui/Emoji";
import { TopBar } from "../ui/TopBar";

const FUN_NAMES = [
  "Ctrl+Z Hero", "Low-Key Picasso", "Scope Creep", "Out of Office", "Synergy Wizard", "Circle Back",
  "Deadline Dodger", "Unmute Yourself", "Chief Doodler", "Reply-All Rebel", "Sketchy Intern", "Coffee First",
];

type Props = {
  online: number | null;
  profile: Profile;
  onProfileChange: (update: (p: Profile) => Profile) => void;
  room: RoomApi;
};

export function HomeScreen({ online, profile, onProfileChange, room }: Props) {
  const [touched, setTouched] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const stage = useRef<AvatarStageHandle>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const check = checkName(profile.name);
  const showError = touched && !check.ok;
  const nameLength = [...profile.name].length;
  const invite = room.pendingCode;

  const shuffle = () => {
    onProfileChange((p) => ({ ...p, avatar: randomAvatar() }));
    stage.current?.spin();
  };
  const suggestName = () => {
    onProfileChange((p) => {
      const options = FUN_NAMES.filter((n) => n !== p.name);
      return { ...p, name: options[Math.floor(Math.random() * options.length)]! };
    });
    setTouched(true);
  };

  /** Every way into a room needs a valid name first. */
  const withName = (action: (p: Profile) => void) => {
    setTouched(true);
    if (!check.ok) {
      nameInput.current?.focus();
      return;
    }
    action({ ...profile, name: check.name });
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidRoomCode(code)) withName((p) => room.join(code, p));
  };

  return (
    <div className="home">
      <TopBar online={online} />

      <main className="home__main">
        <section className="glass glass--clear hero">
          <div className="hero__head">
            <h1 className="hero__title">{invite ? `You're invited to room ${invite}` : "Clock in. Draw badly. Win anyway."}</h1>
            <p className="hero__sub">{invite ? "Set up your player, then hop in." : "Make your player, then host a game or join one."}</p>
          </div>

          <AvatarStage ref={stage} config={profile.avatar} name={check.ok ? check.name : undefined} />

          <div className="hero__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => stage.current?.spin()}>
              <Emoji name="Counterclockwise arrows button" size={18} /> Spin
            </button>
            <button className="btn btn--ghost btn--sm" onClick={shuffle}>
              <Emoji name="Game die" size={18} /> Shuffle look
            </button>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="player-name">
              Display name
            </label>
            <div className={`field__box ${showError ? "field__box--bad" : ""}`}>
              <input
                ref={nameInput}
                id="player-name"
                value={profile.name}
                maxLength={NAME_MAX * 2}
                placeholder="e.g. Low-Key Picasso"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => onProfileChange((p) => ({ ...p, name: e.target.value }))}
                onBlur={() => setTouched(true)}
                aria-invalid={showError}
                aria-describedby="name-help"
              />
              <button className="field__suggest" onClick={suggestName} type="button" title="Suggest a name">
                <Emoji name="Sparkles" size={18} /> Suggest
              </button>
            </div>
            <span id="name-help" className={`field__help ${showError ? "field__help--bad" : ""}`}>
              <span>{showError && !check.ok ? (profile.name ? check.reason : "Pick a name to play") : "Shown to everyone in the room"}</span>
              <span className={nameLength > NAME_MAX ? "field__count--bad" : ""}>
                {nameLength}/{NAME_MAX}
              </span>
            </span>
          </div>

          {(room.error || room.notice) && (
            <p className="banner" role="alert">
              {room.error ?? room.notice}
              <button className="banner__close" onClick={room.clearError} aria-label="Dismiss">×</button>
            </p>
          )}

          {codeOpen && !invite ? (
            <form className="play" onSubmit={submitCode}>
              <input
                className="code-input"
                value={code}
                onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
                placeholder="ABCD"
                aria-label="Room code"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <button className="btn btn--primary" type="submit" disabled={!isValidRoomCode(code) || room.busy}>
                {room.busy ? "Joining…" : "Join room"}
              </button>
              <button className="btn btn--outline" type="button" onClick={() => setCodeOpen(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <div className="play">
              {invite ? (
                <>
                  <button className="btn btn--primary" disabled={room.busy} onClick={() => withName((p) => room.join(invite, p))}>
                    {room.busy ? "Joining…" : `Join room ${invite}`}
                  </button>
                  <button className="btn btn--outline" disabled={room.busy} onClick={() => withName((p) => room.create(p))}>
                    Host my own
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn--primary" disabled={room.busy} onClick={() => withName((p) => room.create(p))}>
                    {room.busy ? "Creating room…" : "Host a game"}
                  </button>
                  <button className="btn btn--outline" disabled={room.busy} onClick={() => setCodeOpen(true)}>
                    <Emoji name="Link" size={18} /> Join with code
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        <Customizer config={profile.avatar} onChange={(avatar) => onProfileChange((p) => ({ ...p, avatar }))} />
      </main>
    </div>
  );
}
