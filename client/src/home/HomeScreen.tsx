import { useEffect, useRef, useState } from "react";
import { checkName, NAME_MAX } from "@sketch/shared";
import { AvatarStage, type AvatarStageHandle } from "../avatar/AvatarStage";
import { Customizer } from "../avatar/Customizer";
import { randomAvatar } from "../avatar/config";
import { loadProfile, saveProfile, type Profile } from "../profile";
import { Emoji } from "../ui/Emoji";

const FUN_NAMES = [
  "Ctrl+Z Hero", "Low-Key Picasso", "Scope Creep", "Out of Office", "Synergy Wizard", "Circle Back",
  "Deadline Dodger", "Unmute Yourself", "Chief Doodler", "Reply-All Rebel", "Sketchy Intern", "Coffee First",
];

export function HomeScreen({ online }: { online: number | null }) {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [touched, setTouched] = useState(false);
  const stage = useRef<AvatarStageHandle>(null);

  useEffect(() => saveProfile(profile), [profile]);

  const check = checkName(profile.name);
  const showError = touched && !check.ok && profile.name.length > 0;
  const nameLength = [...profile.name].length;

  const shuffle = () => {
    setProfile((p) => ({ ...p, avatar: randomAvatar() }));
    stage.current?.spin();
  };
  const suggestName = () => {
    setProfile((p) => {
      const options = FUN_NAMES.filter((n) => n !== p.name);
      return { ...p, name: options[Math.floor(Math.random() * options.length)]! };
    });
    setTouched(true);
  };

  return (
    <div className="home">
      <header className="topbar">
        <div className="logo">
          <Emoji name="Pencil" size={30} className="logo__icon" />
          <span className="logo__word">
            sketch<span className="logo__accent">party</span>
          </span>
        </div>
        <div className="online" role="status">
          <span className={`online__dot ${online === null ? "online__dot--off" : ""}`} />
          {online === null ? "Connecting…" : `${online} online`}
        </div>
      </header>

      <main className="home__main">
        <section className="glass glass--clear hero">
          <div className="hero__head">
            <h1 className="hero__title">Clock in. Draw badly. Win anyway.</h1>
            <p className="hero__sub">Make your player, then grab a seat when rooms open.</p>
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
                id="player-name"
                value={profile.name}
                maxLength={NAME_MAX * 2}
                placeholder="e.g. Low-Key Picasso"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                onBlur={() => setTouched(true)}
                aria-invalid={showError}
                aria-describedby="name-help"
              />
              <button className="field__suggest" onClick={suggestName} type="button" title="Suggest a name">
                <Emoji name="Sparkles" size={18} /> Suggest
              </button>
            </div>
            <span id="name-help" className={`field__help ${showError ? "field__help--bad" : ""}`}>
              <span>{showError && !check.ok ? check.reason : "Shown to everyone in the room"}</span>
              <span className={nameLength > NAME_MAX ? "field__count--bad" : ""}>
                {nameLength}/{NAME_MAX}
              </span>
            </span>
          </div>

          <div className="play">
            <button className="btn btn--primary" disabled title="Rooms arrive in the next update">
              Host a game <span className="soon">soon</span>
            </button>
            <button className="btn btn--outline" disabled title="Rooms arrive in the next update">
              <Emoji name="Link" size={18} /> Join with code
            </button>
          </div>
        </section>

        <Customizer config={profile.avatar} onChange={(avatar) => setProfile((p) => ({ ...p, avatar }))} />
      </main>
    </div>
  );
}
