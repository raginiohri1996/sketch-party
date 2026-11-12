import { useState } from "react";
import { Avatar, type AvatarCrop } from "./Avatar";
import {
  BODY_SHAPES, BROWS, CLOTH_COLORS, EXTRAS, EYES, EYEWEAR, FACIAL_HAIR, HAIR_COLORS, HAIR_STYLES, MOUTHS, SKIN_TONES, TOPS,
  type AvatarConfig,
} from "./config";

const LABELS: Record<string, string> = {
  slim: "Slim", regular: "Regular", broad: "Broad", curvy: "Curvy",
  crop: "Crop", sidepart: "Side part", buzz: "Buzz", curly: "Curly", afro: "Afro", bob: "Bob", long: "Long", bun: "Top knot", ponytail: "Ponytail", bald: "Bald",
  none: "None", stubble: "Stubble", mustache: "Mustache", goatee: "Goatee", beard: "Beard",
  calm: "Calm", happy: "Happy", monday: "Monday", wink: "Wink",
  relaxed: "Relaxed", curious: "Curious", skeptical: "Skeptical", focused: "Focused",
  smile: "Smile", grin: "Grin", smirk: "Smirk", neutral: "Poker face", lol: "LOL",
  tee: "Tee", hoodie: "Hoodie", sweater: "Sweater", shirt: "Shirt", turtleneck: "Turtleneck", blazer: "Blazer", dress: "Dress", jumpsuit: "Jumpsuit",
  glasses: "Glasses", round: "Round", shades: "Shades",
  headphones: "Headphones", cap: "Cap", beanie: "Beanie", earrings: "Earrings", lanyard: "ID badge", mug: "Coffee",
};

const TABS = [
  { id: "look", label: "Look" },
  { id: "hair", label: "Hair" },
  { id: "outfit", label: "Outfit" },
  { id: "extras", label: "Extras" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Props = { config: AvatarConfig; onChange: (next: AvatarConfig) => void };

export function Customizer({ config, onChange }: Props) {
  const [tab, setTab] = useState<TabId>("look");
  const set = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => onChange({ ...config, [key]: value });

  return (
    <section className="glass glass--frost customizer" aria-label="Customize your avatar">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? "tab--on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="customizer__body" role="tabpanel">
        {tab === "look" && (
          <>
            <Group title="Build">
              <Previews list={BODY_SHAPES} value={config.body} crop="full" preview={(v) => ({ ...config, body: v })} onPick={(v) => set("body", v)} />
            </Group>
            <Group title="Skin">
              <Swatches colors={SKIN_TONES} value={config.skin} onPick={(v) => set("skin", v)} />
            </Group>
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
        {tab === "hair" && (
          <>
            <Group title="Style">
              <Previews list={HAIR_STYLES} value={config.hair} crop="head" preview={(v) => ({ ...config, hair: v, extra: "none" })} onPick={(v) => set("hair", v)} />
            </Group>
            <Group title="Color">
              <Swatches colors={HAIR_COLORS} value={config.hairColor} onPick={(v) => set("hairColor", v)} />
            </Group>
            <Group title="Facial hair">
              <Previews list={FACIAL_HAIR} value={config.facialHair} crop="head" preview={(v) => ({ ...config, facialHair: v })} onPick={(v) => set("facialHair", v)} />
            </Group>
          </>
        )}
        {tab === "outfit" && (
          <>
            <Group title="Top">
              <Previews list={TOPS} value={config.top} crop="bust" preview={(v) => ({ ...config, top: v, extra: config.extra === "mug" ? "none" : config.extra })} onPick={(v) => set("top", v)} />
            </Group>
            <Group title={config.top === "jumpsuit" ? "Jumpsuit color" : "Top color"}>
              <Swatches colors={CLOTH_COLORS} value={config.topColor} onPick={(v) => set("topColor", v)} />
            </Group>
            {config.top !== "dress" && config.top !== "jumpsuit" && (
              <Group title="Pants">
                <Swatches colors={CLOTH_COLORS} value={config.bottomColor} onPick={(v) => set("bottomColor", v)} />
              </Group>
            )}
            <Group title="Sneakers">
              <Swatches colors={CLOTH_COLORS} value={config.shoeColor} onPick={(v) => set("shoeColor", v)} />
            </Group>
          </>
        )}
        {tab === "extras" && (
          <>
            <Group title="Eyewear">
              <Previews list={EYEWEAR} value={config.eyewear} crop="head" preview={(v) => ({ ...config, eyewear: v })} onPick={(v) => set("eyewear", v)} />
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
  list, value, onPick, preview, crop,
}: { list: readonly T[]; value: T; onPick: (v: T) => void; preview: (v: T) => AvatarConfig; crop: AvatarCrop }) {
  return (
    <div className={`previews previews--${crop}`}>
      {list.map((v) => (
        <button key={v} className={`preview ${v === value ? "preview--on" : ""}`} aria-pressed={v === value} onClick={() => onPick(v)}>
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
