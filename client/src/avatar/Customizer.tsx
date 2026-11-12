import { useEffect, useRef, useState, type ReactNode } from "react";
import { Emoji, type EmojiName } from "../ui/Emoji";
import { Avatar, type AvatarCrop } from "./Avatar";
import {
  BODY_SHAPES, BOTTOMS, BROWS, CLOTH_COLORS, EXTRAS, EYES, EYEWEAR, FACIAL_HAIR, HAIR_COLORS, HAIR_STYLES, MOUTHS, SKIN_TONES, TOPS,
  isMatchingSet, isOnePiece,
  type AvatarConfig,
} from "./config";

const LABELS: Record<string, string> = {
  slim: "Slim", regular: "Regular", broad: "Broad", plus: "Plus", petite: "Petite", hourglass: "Hourglass", pear: "Pear", curvy: "Curvy",
  crop: "Crop", sidepart: "Side part", buzz: "Buzz", curly: "Curly", afro: "Afro", bob: "Bob", lob: "Lob", pixie: "Pixie",
  long: "Long", wavy: "Wavy", braid: "Side braid", boxbraids: "Box braids", bun: "Top knot", chignon: "Low bun", ponytail: "Ponytail", bald: "Bald",
  none: "None", stubble: "Stubble", mustache: "Mustache", goatee: "Goatee", beard: "Beard",
  calm: "Calm", happy: "Happy", monday: "Monday", wink: "Wink",
  relaxed: "Relaxed", curious: "Curious", skeptical: "Skeptical", focused: "Focused",
  smile: "Smile", grin: "Grin", smirk: "Smirk", neutral: "Poker face", lol: "LOL",
  suit: "Suit & tie", vest: "Waistcoat", blazer: "Blazer", blouse: "Bow blouse", sheath: "Sheath dress", wrap: "Wrap dress",
  shirt: "Shirt", turtleneck: "Turtleneck", sweater: "Sweater", jumpsuit: "Jumpsuit", tee: "Tee", hoodie: "Hoodie",
  trousers: "Trousers", pencil: "Pencil skirt", aline: "A-line skirt",
  glasses: "Glasses", round: "Round", shades: "Shades",
  headphones: "Headphones", cap: "Cap", beanie: "Beanie", earrings: "Earrings", lanyard: "ID badge", mug: "Coffee",
  on: "On", off: "Off",
};

const ACCENT_LABEL: Partial<Record<AvatarConfig["top"], string>> = {
  suit: "Tie", vest: "Tie", blazer: "Top under blazer", blouse: "Bow", sheath: "Belt", wrap: "Sash", jumpsuit: "Belt",
};

// ── One list of categories → groups → options, shared by the desktop panel and the phone rail ──

/** `picked` runs after any choice (the phone rail uses it to close itself). */
type Picked = () => void;
interface Group {
  title: string;
  render: (picked: Picked) => ReactNode;
}
interface Tab {
  id: string;
  label: string;
  icon: EmojiName;
  groups: Group[];
}

function buildTabs(config: AvatarConfig, onChange: (next: AvatarConfig) => void): Tab[] {
  const set = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K], picked: Picked) => {
    onChange({ ...config, [key]: value });
    picked();
  };
  const accentLabel = ACCENT_LABEL[config.top];
  const showBottoms = !isOnePiece(config.top);
  const showBottomColor = showBottoms && !isMatchingSet(config.top);
  const topTitle = isMatchingSet(config.top) ? "Suit" : config.top === "vest" ? "Waistcoat" : isOnePiece(config.top) && config.top !== "jumpsuit" ? "Dress" : "Top";

  const groups = (...list: (Group | false)[]) => list.filter(Boolean) as Group[];
  return [
    {
      id: "body", label: "Body", icon: "Bust in silhouette",
      groups: groups(
        { title: "Body type", render: (p) => <Previews list={BODY_SHAPES} value={config.body} crop="full" preview={(v) => ({ ...config, body: v })} onPick={(v) => set("body", v, p)} /> },
        { title: "Skin tone", render: (p) => <Swatches colors={SKIN_TONES} value={config.skin} onPick={(v) => set("skin", v, p)} /> },
      ),
    },
    {
      id: "face", label: "Face", icon: "Smiling face with smiling eyes",
      groups: groups(
        { title: "Eyes", render: (p) => <Previews list={EYES} value={config.eyes} crop="head" preview={(v) => ({ ...config, eyes: v, eyewear: "none" })} onPick={(v) => set("eyes", v, p)} /> },
        { title: "Brows", render: (p) => <Previews list={BROWS} value={config.brows} crop="head" preview={(v) => ({ ...config, brows: v, eyewear: "none" })} onPick={(v) => set("brows", v, p)} /> },
        { title: "Mouth", render: (p) => <Previews list={MOUTHS} value={config.mouth} crop="head" preview={(v) => ({ ...config, mouth: v })} onPick={(v) => set("mouth", v, p)} /> },
        { title: "Blush", render: (p) => <Pills list={["off", "on"] as const} value={config.blush ? "on" : "off"} onPick={(v) => set("blush", v === "on", p)} /> },
      ),
    },
    {
      id: "hair", label: "Hair", icon: "Scissors",
      groups: groups(
        { title: "Hairstyle", render: (p) => <Previews list={HAIR_STYLES} value={config.hair} crop="head" compact preview={(v) => ({ ...config, hair: v, extra: "none" })} onPick={(v) => set("hair", v, p)} /> },
        { title: "Hair color", render: (p) => <Swatches colors={HAIR_COLORS} value={config.hairColor} onPick={(v) => set("hairColor", v, p)} /> },
        { title: "Facial hair", render: (p) => <Previews list={FACIAL_HAIR} value={config.facialHair} crop="head" compact preview={(v) => ({ ...config, facialHair: v })} onPick={(v) => set("facialHair", v, p)} /> },
      ),
    },
    {
      id: "outfit", label: "Outfit", icon: "Necktie",
      groups: groups(
        { title: "Outfit", render: (p) => <Previews list={TOPS} value={config.top} crop="bust" preview={(v) => ({ ...config, top: v, extra: config.extra === "mug" ? "none" : config.extra })} onPick={(v) => set("top", v, p)} /> },
        showBottoms && { title: "Bottoms", render: (p) => <Previews list={BOTTOMS} value={config.bottom} crop="full" preview={(v) => ({ ...config, bottom: v })} onPick={(v) => set("bottom", v, p)} /> },
      ),
    },
    {
      id: "colors", label: "Colors", icon: "Artist palette",
      groups: groups(
        { title: topTitle, render: (p) => <Swatches colors={CLOTH_COLORS} value={config.topColor} onPick={(v) => set("topColor", v, p)} /> },
        !!accentLabel && { title: accentLabel, render: (p) => <Swatches colors={CLOTH_COLORS} value={config.accentColor} onPick={(v) => set("accentColor", v, p)} /> },
        showBottomColor && { title: config.bottom === "trousers" ? "Trousers" : "Skirt", render: (p) => <Swatches colors={CLOTH_COLORS} value={config.bottomColor} onPick={(v) => set("bottomColor", v, p)} /> },
        { title: "Shoes", render: (p) => <Swatches colors={CLOTH_COLORS} value={config.shoeColor} onPick={(v) => set("shoeColor", v, p)} /> },
      ),
    },
    {
      id: "extras", label: "Extras", icon: "Sunglasses",
      groups: groups(
        { title: "Eyewear", render: (p) => <Previews list={EYEWEAR} value={config.eyewear} crop="head" compact preview={(v) => ({ ...config, eyewear: v })} onPick={(v) => set("eyewear", v, p)} /> },
        { title: "Accessory", render: (p) => <Previews list={EXTRAS} value={config.extra} crop="bust" preview={(v) => ({ ...config, extra: v })} onPick={(v) => set("extra", v, p)} /> },
        { title: "Accessory color", render: (p) => <Swatches colors={CLOTH_COLORS} value={config.extraColor} onPick={(v) => set("extraColor", v, p)} /> },
      ),
    },
  ];
}

type Props = { config: AvatarConfig; onChange: (next: AvatarConfig) => void };
const noop = () => {};

/** Desktop: a panel with tabs, every group of the tab listed underneath. */
export function Customizer({ config, onChange }: Props) {
  const tabs = buildTabs(config, onChange);
  const [tabId, setTabId] = useState(tabs[0]!.id);
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0]!;

  return (
    <section className="glass glass--frost customizer" aria-label="Customize your avatar">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab.id === t.id} className={`tab ${tab.id === t.id ? "tab--on" : ""}`} onClick={() => setTabId(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="customizer__body" role="tabpanel">
        {tab.groups.map((g) => (
          <div key={g.title} className="group">
            <h3 className="group__title">{g.title}</h3>
            {g.render(noop)}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Phone: six floating icons. Tapping one slides out a horizontal bar of options (scrolls sideways).
 * Picking an option applies it and closes the bar. Categories with several parts get small switch chips.
 */
export function PhoneCustomizer({ config, onChange }: Props) {
  const tabs = buildTabs(config, onChange);
  const [openId, setOpenId] = useState<string | null>(null);
  const [groupIndex, setGroupIndex] = useState(0);
  const open = tabs.find((t) => t.id === openId) ?? null;
  const group = open?.groups[Math.min(groupIndex, open.groups.length - 1)];
  const bar = useRef<HTMLDivElement>(null);
  const close = () => setOpenId(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Show the selected option when a bar opens.
  useEffect(() => {
    bar.current?.querySelector<HTMLElement>("[aria-pressed='true']")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [openId, groupIndex]);

  const toggle = (id: string) => {
    setGroupIndex(0);
    setOpenId((cur) => (cur === id ? null : id));
  };

  return (
    // Stop the avatar stage from treating taps here as "drag to turn".
    <div className="rail-wrap" onPointerDown={(e) => e.stopPropagation()}>
      <nav className="rail" aria-label="Customize your avatar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`rail__btn ${openId === t.id ? "rail__btn--on" : ""}`}
            onClick={() => toggle(t.id)}
            aria-expanded={openId === t.id}
            aria-label={t.label}
            title={t.label}
          >
            <Emoji name={t.icon} size={22} />
          </button>
        ))}
      </nav>

      {open && group && (
        <>
          <button className="rail-scrim" aria-label="Close" onClick={close} />
          <div
            className="railbar glass glass--frost"
            role="dialog"
            aria-label={`${open.label} options`}
            // Line the bar up with its icon, but never let it hang off the bottom of the stage.
            style={{ top: `max(0px, min(calc(${tabs.indexOf(open)} * var(--rail-step)), calc(100% - var(--railbar-h))))` }}
          >
            <div className="railbar__head">
              {open.groups.length > 1 ? (
                <div className="railbar__groups" role="tablist">
                  {open.groups.map((g, i) => (
                    <button key={g.title} role="tab" aria-selected={g === group} className={`railbar__chip ${g === group ? "railbar__chip--on" : ""}`} onClick={() => setGroupIndex(i)}>
                      {g.title}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="railbar__title">{group.title}</span>
              )}
              <button className="railbar__close" onClick={close} aria-label="Close">
                ×
              </button>
            </div>
            <div ref={bar} className="railbar__options">
              {group.render(close)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Pills<T extends string>({ list, value, onPick }: { list: readonly T[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="pills">
      {list.map((v) => (
        <button key={v} className={`pill ${v === value ? "pill--on" : ""}`} aria-pressed={v === value} onClick={() => onPick(v)}>
          {LABELS[v] ?? v}
        </button>
      ))}
    </div>
  );
}

function Previews<T extends string>({
  list, value, onPick, preview, crop, compact,
}: { list: readonly T[]; value: T; onPick: (v: T) => void; preview: (v: T) => AvatarConfig; crop: AvatarCrop; compact?: boolean }) {
  return (
    <div className={`previews previews--${crop} ${compact ? "previews--compact" : ""}`}>
      {list.map((v) => (
        <button key={v} className={`preview ${v === value ? "preview--on" : ""}`} aria-pressed={v === value} onClick={() => onPick(v)} title={LABELS[v]}>
          <Avatar config={preview(v)} crop={crop} className="preview__svg" title={LABELS[v]} />
          <span>{LABELS[v] ?? v}</span>
        </button>
      ))}
    </div>
  );
}

function Swatches({ colors, value, onPick }: { colors: readonly string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="swatches">
      {colors.map((c) => (
        <button
          key={c}
          className={`swatch ${c === value ? "swatch--on" : ""}`}
          style={{ background: c }}
          aria-label={`Color ${c}`}
          aria-pressed={c === value}
          onClick={() => onPick(c)}
        />
      ))}
    </div>
  );
}
