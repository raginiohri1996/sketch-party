import { useState } from "react";
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
};

const ACCENT_LABEL: Partial<Record<AvatarConfig["top"], string>> = {
  suit: "Tie", vest: "Tie", blazer: "Top under blazer", blouse: "Bow", sheath: "Belt", wrap: "Sash", jumpsuit: "Belt",
};

const TABS = ["Body", "Face", "Hair", "Outfit", "Colors", "Extras"] as const;
type TabId = (typeof TABS)[number];

type Props = { config: AvatarConfig; onChange: (next: AvatarConfig) => void };

export function Customizer({ config, onChange }: Props) {
  const [tab, setTab] = useState<TabId>("Body");
  const set = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => onChange({ ...config, [key]: value });
  const accentLabel = ACCENT_LABEL[config.top];
  const showBottoms = !isOnePiece(config.top);
  const showBottomColor = showBottoms && !isMatchingSet(config.top);

  return (
    <section className="glass glass--frost customizer" aria-label="Customize your avatar">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? "tab--on" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="customizer__body" role="tabpanel">
        {tab === "Body" && (
          <>
            <Group title="Body type">
              <Previews list={BODY_SHAPES} value={config.body} crop="full" preview={(v) => ({ ...config, body: v })} onPick={(v) => set("body", v)} />
            </Group>
            <Group title="Skin tone">
              <Swatches colors={SKIN_TONES} value={config.skin} onPick={(v) => set("skin", v)} />
            </Group>
          </>
        )}
        {tab === "Face" && (
          <>
            <Group title="Eyes">
              <Previews list={EYES} value={config.eyes} crop="head" preview={(v) => ({ ...config, eyes: v, eyewear: "none" })} onPick={(v) => set("eyes", v)} />
            </Group>
            <Group title="Brows">
              <Previews list={BROWS} value={config.brows} crop="head" preview={(v) => ({ ...config, brows: v, eyewear: "none" })} onPick={(v) => set("brows", v)} />
            </Group>
            <Group title="Mouth">
              <Previews list={MOUTHS} value={config.mouth} crop="head" preview={(v) => ({ ...config, mouth: v })} onPick={(v) => set("mouth", v)} />
            </Group>
            <Group title="Blush">
              <Pills list={["off", "on"] as const} value={config.blush ? "on" : "off"} onPick={(v) => set("blush", v === "on")} labels={{ on: "On", off: "Off" }} />
            </Group>
          </>
        )}
        {tab === "Hair" && (
          <>
            <Group title="Hairstyle">
              <Previews list={HAIR_STYLES} value={config.hair} crop="head" compact preview={(v) => ({ ...config, hair: v, extra: "none" })} onPick={(v) => set("hair", v)} />
            </Group>
            <Group title="Hair color">
              <Swatches colors={HAIR_COLORS} value={config.hairColor} onPick={(v) => set("hairColor", v)} />
            </Group>
            <Group title="Facial hair">
              <Previews list={FACIAL_HAIR} value={config.facialHair} crop="head" compact preview={(v) => ({ ...config, facialHair: v })} onPick={(v) => set("facialHair", v)} />
            </Group>
          </>
        )}
        {tab === "Outfit" && (
          <>
            <Group title="Outfit">
              <Previews list={TOPS} value={config.top} crop="bust" preview={(v) => ({ ...config, top: v, extra: config.extra === "mug" ? "none" : config.extra })} onPick={(v) => set("top", v)} />
            </Group>
            {showBottoms && (
              <Group title="Bottoms">
                <Previews list={BOTTOMS} value={config.bottom} crop="full" preview={(v) => ({ ...config, bottom: v })} onPick={(v) => set("bottom", v)} />
              </Group>
            )}
          </>
        )}
        {tab === "Colors" && (
          <>
            <Group title={isMatchingSet(config.top) ? "Suit" : config.top === "vest" ? "Waistcoat" : isOnePiece(config.top) && config.top !== "jumpsuit" ? "Dress" : "Top"}>
              <Swatches colors={CLOTH_COLORS} value={config.topColor} onPick={(v) => set("topColor", v)} />
            </Group>
            {accentLabel && (
              <Group title={accentLabel}>
                <Swatches colors={CLOTH_COLORS} value={config.accentColor} onPick={(v) => set("accentColor", v)} />
              </Group>
            )}
            {showBottomColor && (
              <Group title={config.bottom === "trousers" ? "Trousers" : "Skirt"}>
                <Swatches colors={CLOTH_COLORS} value={config.bottomColor} onPick={(v) => set("bottomColor", v)} />
              </Group>
            )}
            <Group title="Shoes">
              <Swatches colors={CLOTH_COLORS} value={config.shoeColor} onPick={(v) => set("shoeColor", v)} />
            </Group>
          </>
        )}
        {tab === "Extras" && (
          <>
            <Group title="Eyewear">
              <Previews list={EYEWEAR} value={config.eyewear} crop="head" compact preview={(v) => ({ ...config, eyewear: v })} onPick={(v) => set("eyewear", v)} />
            </Group>
            <Group title="Accessory">
              <Previews list={EXTRAS} value={config.extra} crop="bust" preview={(v) => ({ ...config, extra: v })} onPick={(v) => set("extra", v)} />
            </Group>
            <Group title="Accessory color">
              <Swatches colors={CLOTH_COLORS} value={config.extraColor} onPick={(v) => set("extraColor", v)} />
            </Group>
          </>
        )}
      </div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="group">
      <h3 className="group__title">{title}</h3>
      {children}
    </div>
  );
}

function Pills<T extends string>({ list, value, onPick, labels }: { list: readonly T[]; value: T; onPick: (v: T) => void; labels?: Record<string, string> }) {
  return (
    <div className="pills">
      {list.map((v) => (
        <button key={v} className={`pill ${v === value ? "pill--on" : ""}`} aria-pressed={v === value} onClick={() => onPick(v)}>
          {labels?.[v] ?? LABELS[v] ?? v}
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
