import { useId, type ReactNode } from "react";
import { isMatchingSet, isOnePiece, shade, type AvatarConfig } from "./config";

/**
 * 2.5D avatar in a modern flat-illustration style with adult proportions.
 * Each part is drawn flat but placed in a tiny 3D space:
 *   x0 = sideways position, z = depth (toward viewer is positive).
 * Turning by `angle` slides parts sideways, squashes flat ones and re-sorts them
 * by depth, so the face moves around and hides behind the head, a ponytail swings
 * out, the far arm goes behind the body, and so on.
 */

type Flat = "none" | "face" | "hair" | "torso";
interface Part {
  key: string;
  x0: number;
  z: number;
  bias?: number;
  flat?: Flat;
  node: ReactNode;
}

export type AvatarCrop = "full" | "head" | "bust";
const VIEWBOX: Record<AvatarCrop, string> = {
  full: "-110 -212 220 352",
  head: "-52 -218 104 112",
  bust: "-78 -214 156 200",
};

const INK = "#1d1a26";
const SHIRT = "#f2efe8";
const HEAD = { y: -150, rx: 29, ry: 34 };
const LINE = 1.8;

/** s = shoulder half-width, w = waist, h = hips, leg = leg spacing, bust = curved chest line. */
const BODY = {
  slim: { s: 31, w: 25, h: 26, leg: 11, bust: false },
  regular: { s: 36, w: 30, h: 30, leg: 13, bust: false },
  broad: { s: 43, w: 37, h: 33, leg: 15, bust: false },
  plus: { s: 42, w: 40, h: 42, leg: 17, bust: false },
  petite: { s: 28, w: 21, h: 28, leg: 12, bust: true },
  hourglass: { s: 33, w: 22, h: 36, leg: 15, bust: true },
  pear: { s: 29, w: 23, h: 39, leg: 16, bust: true },
  curvy: { s: 35, w: 27, h: 40, leg: 16, bust: true },
} as const;
type Body = (typeof BODY)[keyof typeof BODY];

export function Avatar({
  config,
  angle = 0,
  crop = "full",
  className,
  title,
}: {
  config: AvatarConfig;
  angle?: number;
  crop?: AvatarCrop;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const a = (angle * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const ac = Math.abs(c);

  const placed = buildParts(config, uid)
    .map((p) => {
      const depth = -p.x0 * s + p.z * c + (p.bias ?? 0);
      const dx = p.x0 * (c - 1) + p.z * s;
      const sx =
        p.flat === "face" ? Math.max(ac, 0.15)
        : p.flat === "hair" ? 0.7 + 0.3 * ac
        : p.flat === "torso" ? Math.min(1.08, ac + 0.62 * Math.abs(s))
        : 1;
      const transform = `translate(${dx.toFixed(2)} 0) translate(${p.x0} 0) scale(${sx.toFixed(3)} 1) translate(${-p.x0} 0)`;
      return { ...p, depth, transform };
    })
    .sort((p, q) => p.depth - q.depth);

  return (
    <svg viewBox={VIEWBOX[crop]} className={className} role="img" aria-label={title ?? "Player avatar"}>
      {crop === "full" && <ellipse cx={0} cy={128} rx={50} ry={8} fill="rgba(0,0,0,0.28)" />}
      {placed.map((p) => (
        <g key={p.key} transform={p.transform}>
          {p.node}
        </g>
      ))}
    </svg>
  );
}

function buildParts(cfg: AvatarConfig, uid: string): Part[] {
  const b = BODY[cfg.body];
  const skinLine = shade(cfg.skin, 0.28);
  const hairLine = shade(cfg.hairColor, 0.3);
  const topLine = shade(cfg.topColor, 0.32);
  const onePiece = isOnePiece(cfg.top);
  const isDress = cfg.top === "sheath" || cfg.top === "wrap";
  const skirt = !onePiece && cfg.bottom !== "trousers";
  const lowerColor = cfg.top === "jumpsuit" || isMatchingSet(cfg.top) ? cfg.topColor : cfg.bottomColor;
  const stroke = (color: string) => ({ stroke: color, strokeWidth: LINE, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });
  const parts: Part[] = [];

  // ── Head, neck, ears, face ─────────────────────────────────
  parts.push({
    key: "neck",
    x0: 0,
    z: -1,
    node: (
      <>
        <rect x={-9} y={-128} width={18} height={22} rx={6} fill={cfg.skin} {...stroke(skinLine)} />
        <path d="M -9 -120 Q 0 -112 9 -120 L 9 -114 Q 0 -108 -9 -114 Z" fill={shade(cfg.skin, 0.12)} />
      </>
    ),
  });
  parts.push({ key: "head", x0: 0, z: 0, bias: 1, node: <ellipse cx={0} cy={HEAD.y} rx={HEAD.rx} ry={HEAD.ry} fill={cfg.skin} {...stroke(skinLine)} /> });
  for (const side of [-1, 1]) {
    parts.push({ key: `ear${side}`, x0: side * 28, z: -4, node: <ellipse cx={side * 28} cy={-148} rx={5.5} ry={8} fill={cfg.skin} {...stroke(skinLine)} /> });
  }
  parts.push({ key: "face", x0: 0, z: 27, flat: "face", node: <Face cfg={cfg} /> });

  // ── Hair ───────────────────────────────────────────────────
  const hair = hairShapes(cfg.hair, hairLine);
  const hairProps = { fill: cfg.hairColor, ...stroke(hairLine) };
  if (hair.back) parts.push({ key: "hairBack", x0: 0, z: -18, flat: "hair", node: <g {...hairProps}>{hair.back}</g> });
  if (cfg.hair !== "bald") {
    // Covers the top of the scalp at every angle, so turning never reveals a bald patch.
    parts.push({
      key: "hairCap",
      x0: 0,
      z: 0,
      bias: 1.2,
      node: <path d="M -29.6 -158 C -31 -191 31 -191 29.6 -158 Q 0 -174 -29.6 -158 Z" {...hairProps} opacity={cfg.hair === "buzz" ? 0.92 : 1} />,
    });
  }
  // Hair sits close to the skull, so it slides less than the face; the bias keeps it drawn over the forehead.
  if (hair.front) parts.push({ key: "hairFront", x0: 0, z: 14, bias: 14.5, flat: "hair", node: <g {...hairProps}>{hair.front}</g> });
  if (cfg.hair === "ponytail") {
    parts.push({ key: "tail", x0: 0, z: -34, node: <path d="M -7 -172 Q 0 -178 7 -172 Q 15 -140 9 -100 Q 0 -92 -9 -100 Q -15 -140 -7 -172 Z" {...hairProps} /> });
  }
  if (cfg.hair === "bun") parts.push({ key: "bun", x0: 0, z: -8, node: <circle cx={0} cy={-188} r={13} {...hairProps} /> });
  if (cfg.hair === "chignon") parts.push({ key: "chignon", x0: 0, z: -30, node: <ellipse cx={0} cy={-130} rx={15} ry={12} {...hairProps} /> });
  if (cfg.hair === "braid") {
    parts.push({
      key: "braid",
      x0: 20,
      z: 22,
      node: (
        <g {...hairProps}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <ellipse key={i} cx={21 + i * 1.6} cy={-126 + i * 9} rx={6.2 - i * 0.25} ry={6.5} transform={`rotate(${i % 2 ? 18 : -18} ${21 + i * 1.6} ${-126 + i * 9})`} />
          ))}
          <path d="M 27 -66 L 33 -54 L 29 -52 L 25 -64 Z" />
        </g>
      ),
    });
  }

  // ── Torso & clothes ────────────────────────────────────────
  const top = -112;
  const bottom = cfg.top === "sheath" ? 48 : cfg.top === "wrap" ? 44 : -6;
  const hem = cfg.top === "sheath" ? b.h + 1 : cfg.top === "wrap" ? b.h + 14 : b.h;
  const chest = b.bust ? b.s + 2 : b.s - 1;
  const torsoPath = `M ${-b.s + 13} ${top} L ${b.s - 13} ${top} Q ${b.s} ${top} ${b.s} ${top + 15} Q ${chest} -78 ${b.w} -46 Q ${b.h} -24 ${hem} ${bottom} L ${-hem} ${bottom} Q ${-b.h} -24 ${-b.w} -46 Q ${-chest} -78 ${-b.s} ${top + 15} Q ${-b.s} ${top} ${-b.s + 13} ${top} Z`;
  const clipId = `torso-${uid}`;

  if (!isDress && !skirt) {
    parts.push({ key: "hips", x0: 0, z: 0, bias: 0.2, flat: "torso", node: <path d={roundedRect(-b.h, -26, b.h * 2, 40, 12)} fill={lowerColor} {...stroke(shade(lowerColor, 0.3))} /> });
  }
  if (skirt) {
    const skirtPath =
      cfg.bottom === "pencil"
        ? `M ${-b.w - 1} -32 L ${b.w + 1} -32 Q ${b.h} -16 ${b.h} -4 L ${b.h - 3} 46 L ${-b.h + 3} 46 L ${-b.h} -4 Q ${-b.h} -16 ${-b.w - 1} -32 Z`
        : `M ${-b.w - 1} -32 L ${b.w + 1} -32 L ${b.h + 15} 40 Q 0 47 ${-b.h - 15} 40 Z`;
    parts.push({ key: "skirt", x0: 0, z: 0, bias: 0.3, flat: "torso", node: <path d={skirtPath} fill={lowerColor} {...stroke(shade(lowerColor, 0.3))} /> });
  }
  parts.push({
    key: "torso",
    x0: 0,
    z: 0,
    bias: 0.5,
    flat: "torso",
    node: (
      <>
        <defs>
          <clipPath id={clipId}>
            <path d={torsoPath} />
          </clipPath>
        </defs>
        <path d={torsoPath} fill={cfg.top === "vest" ? cfg.topColor : cfg.topColor} />
        {cfg.top === "sweater" && <rect x={-60} y={-18} width={120} height={14} fill={shade(cfg.topColor, 0.14)} clipPath={`url(#${clipId})`} />}
        <path d={`M ${b.s * 0.55} ${top} L 60 ${top} L 60 60 L ${b.h * 0.5} 60 Z`} fill="#000" opacity={0.08} clipPath={`url(#${clipId})`} />
        <path d={torsoPath} fill="none" {...stroke(topLine)} />
      </>
    ),
  });
  if (cfg.top === "hoodie") {
    parts.push({ key: "hood", x0: 0, z: -12, node: <path d="M -22 -100 Q -26 -126 0 -128 Q 26 -126 22 -100 Z" fill={shade(cfg.topColor, 0.1)} {...stroke(topLine)} /> });
  }
  if (cfg.top === "turtleneck") {
    parts.push({ key: "collar", x0: 0, z: 0, bias: 0.8, node: <rect x={-12} y={-126} width={24} height={20} rx={7} fill={shade(cfg.topColor, 0.06)} {...stroke(topLine)} /> });
  }
  parts.push({ key: "torsoFront", x0: 0, z: b.s * 0.55, flat: "face", node: <TorsoFront cfg={cfg} b={b} /> });

  // ── Arms (the right hand may hold a mug) ───────────────────
  const sleeve = cfg.top === "tee" || cfg.top === "sheath" ? "short" : cfg.top === "wrap" ? "three" : "long";
  const sleeveColor = cfg.top === "vest" ? SHIRT : cfg.topColor;
  const sleeveLine = shade(sleeveColor, 0.32);
  const cuff = cfg.top === "suit" ? SHIRT : cfg.top === "blazer" ? cfg.accentColor : cfg.top === "sweater" || cfg.top === "blouse" ? shade(cfg.topColor, 0.14) : null;
  for (const side of [-1, 1]) {
    const x = side * (b.s - 4);
    const holdsMug = cfg.extra === "mug" && side === 1;
    parts.push({
      key: `arm${side}`,
      x0: x,
      z: 0,
      node: (
        <g transform={`rotate(${side * -6} ${x} -106)`}>
          <rect x={x - 8.5} y={-110} width={17} height={98} rx={8.5} fill={sleeve === "long" ? sleeveColor : cfg.skin} {...stroke(sleeve === "long" ? sleeveLine : skinLine)} />
          {sleeve !== "long" && (
            <rect x={x - 9.5} y={-111} width={19} height={sleeve === "short" ? 30 : 66} rx={9} fill={sleeveColor} {...stroke(sleeveLine)} />
          )}
          {sleeve === "long" && cuff && <rect x={x - 9} y={-25} width={18} height={8} rx={4} fill={cuff} />}
          <ellipse cx={x} cy={-9} rx={7.5} ry={8.5} fill={cfg.skin} {...stroke(skinLine)} />
          {holdsMug && (
            <g transform={`translate(${x + 6} -18)`}>
              <path d="M 0 0 h 18 v 18 q 0 6 -6 6 h -6 q -6 0 -6 -6 Z" fill={cfg.extraColor} {...stroke(shade(cfg.extraColor, 0.35))} />
              <path d="M 18 4 q 8 0 8 7 q 0 7 -8 7" fill="none" {...stroke(shade(cfg.extraColor, 0.35))} strokeWidth={3} />
              <path d="M 6 -4 q -3 -5 0 -10 M 12 -4 q -3 -5 0 -10" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" opacity={0.6} />
            </g>
          )}
        </g>
      ),
    });
  }

  // ── Legs & shoes ───────────────────────────────────────────
  const bareLegs = isDress || skirt;
  const legTop = bareLegs ? 28 : -8;
  for (const side of [-1, 1]) {
    const x = side * b.leg;
    const legColor = bareLegs ? cfg.skin : lowerColor;
    parts.push({
      key: `leg${side}`,
      x0: x,
      z: 0,
      node: <rect x={x - (bareLegs ? 8.5 : 10.5)} y={legTop} width={bareLegs ? 17 : 21} height={118 - legTop} rx={8} fill={legColor} {...stroke(shade(legColor, 0.3))} />,
    });
    const heel = x - side * 10;
    const toe = x + side * 15;
    parts.push({
      key: `shoe${side}`,
      x0: x,
      z: 9,
      node: (
        <>
          <path d={`M ${heel} 122 Q ${heel} 111 ${x} 111 Q ${toe} 112 ${toe} 122 Z`} fill={cfg.shoeColor} {...stroke(shade(cfg.shoeColor, 0.35))} />
          <rect x={Math.min(heel, toe) - 1} y={120} width={27} height={4} rx={2} fill={shade(cfg.shoeColor, 0.3)} />
        </>
      ),
    });
  }

  parts.push(...extraParts(cfg));
  return parts;
}

function Face({ cfg }: { cfg: AvatarConfig }) {
  const ey = -152;
  const browColor = shade(cfg.hairColor === "#e9e4dc" ? "#9aa0a8" : cfg.hairColor, 0.15);
  const eye = (x: number, kind: AvatarConfig["eyes"]) => {
    switch (kind) {
      case "happy":
        return <path d={`M ${x - 4.5} ${ey + 1.5} Q ${x} ${ey - 4} ${x + 4.5} ${ey + 1.5}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />;
      case "monday":
        return (
          <>
            <path d={`M ${x - 4} ${ey} A 4 4 0 0 0 ${x + 4} ${ey} Z`} fill={INK} />
            <path d={`M ${x - 5} ${ey - 0.5} L ${x + 5} ${ey - 0.5}`} stroke={INK} strokeWidth={2} strokeLinecap="round" />
          </>
        );
      default:
        return <ellipse cx={x} cy={ey} rx={3.2} ry={4} fill={INK} />;
    }
  };
  const brow = (x: number, side: -1 | 1) => {
    const inner = x - side * 5;
    const outer = x + side * 5;
    let yi = ey - 10, yo = ey - 10, mid = ey - 12;
    if (cfg.brows === "curious") { yi -= 3; yo -= 3; mid -= 4; }
    if (cfg.brows === "focused") { yi += 2.5; yo -= 1.5; mid = ey - 11; }
    if (cfg.brows === "skeptical" && side === 1) { yi -= 4; yo -= 3; mid -= 6; }
    return <path d={`M ${inner} ${yi} Q ${x} ${mid} ${outer} ${yo}`} fill="none" stroke={browColor} strokeWidth={3} strokeLinecap="round" />;
  };
  const my = -131;
  const facial = cfg.facialHair;
  const fh = { fill: cfg.hairColor === "#e9e4dc" ? "#cfcac2" : cfg.hairColor };

  return (
    <>
      {cfg.blush && (
        <>
          <ellipse cx={-17} cy={-139} rx={6} ry={3.5} fill="#ff6b5b" opacity={0.3} />
          <ellipse cx={17} cy={-139} rx={6} ry={3.5} fill="#ff6b5b" opacity={0.3} />
        </>
      )}
      {facial === "stubble" && <path d="M -26 -148 Q -25 -118 0 -116 Q 25 -118 26 -148 Q 22 -128 0 -125 Q -22 -128 -26 -148 Z" {...fh} opacity={0.35} />}
      {facial === "beard" && <path d="M -28 -152 Q -28 -112 0 -108 Q 28 -112 28 -152 Q 24 -134 12 -134 Q 0 -138 -12 -134 Q -24 -134 -28 -152 Z" {...fh} />}
      {facial === "goatee" && <path d="M -7 -124 Q 0 -113 7 -124 Q 0 -121 -7 -124 Z" {...fh} stroke={fh.fill} strokeWidth={4} strokeLinejoin="round" />}
      {(facial === "mustache" || facial === "beard" || facial === "goatee") && (
        <path d="M -11 -134 Q -5 -140 0 -136.5 Q 5 -140 11 -134 Q 5 -133 0 -135 Q -5 -133 -11 -134 Z" {...fh} stroke={fh.fill} strokeWidth={2} strokeLinejoin="round" />
      )}
      <path d="M 1 -150 Q 4 -142 -1 -140" fill="none" stroke={shade(cfg.skin, 0.3)} strokeWidth={2} strokeLinecap="round" />
      {cfg.mouth === "smile" && <path d={`M -7 ${my} Q 0 ${my + 6} 7 ${my}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />}
      {cfg.mouth === "grin" && <path d={`M -9 ${my - 1} Q 0 ${my - 1} 9 ${my - 1} Q 7 ${my + 8} 0 ${my + 8} Q -7 ${my + 8} -9 ${my - 1} Z`} fill="#fff" stroke={INK} strokeWidth={2} strokeLinejoin="round" />}
      {cfg.mouth === "smirk" && <path d={`M -6 ${my + 1} Q 2 ${my + 3} 8 ${my - 3}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />}
      {cfg.mouth === "neutral" && <path d={`M -6 ${my + 1} L 6 ${my + 1}`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />}
      {cfg.mouth === "lol" && (
        <>
          <path d={`M -8 ${my - 1} Q 0 ${my - 2} 8 ${my - 1} Q 7 ${my + 10} 0 ${my + 10} Q -7 ${my + 10} -8 ${my - 1} Z`} fill={INK} />
          <ellipse cx={0} cy={my + 7} rx={4} ry={2.2} fill="#ff6b5b" />
        </>
      )}
      {eye(-11, cfg.eyes === "wink" ? "calm" : cfg.eyes)}
      {eye(11, cfg.eyes === "wink" ? "happy" : cfg.eyes)}
      {brow(-11, -1)}
      {brow(11, 1)}
    </>
  );
}

function Tie({ color }: { color: string }) {
  const line = shade(color, 0.35);
  return (
    <g fill={color} stroke={line} strokeWidth={1.4} strokeLinejoin="round">
      <path d="M -3.5 -109 L 3.5 -109 L 2.5 -102 L -2.5 -102 Z" />
      <path d="M -2.5 -102 L 2.5 -102 L 5 -72 L 0 -66 L -5 -72 Z" />
    </g>
  );
}

function TorsoFront({ cfg, b }: { cfg: AvatarConfig; b: Body }) {
  const line = shade(cfg.topColor, 0.32);
  const lw = { strokeWidth: LINE, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const lapels = (
    <path d="M -13 -112 L -4 -76 L -16 -88 L -10 -100 Z M 13 -112 L 4 -76 L 16 -88 L 10 -100 Z" fill={shade(cfg.topColor, 0.15)} stroke={line} {...lw} />
  );
  const shirtCollar = <path d="M -11 -113 L -2 -102 L -6 -98 L -14 -107 Z M 11 -113 L 2 -102 L 6 -98 L 14 -107 Z" fill={SHIRT} stroke="#c9c4ba" strokeWidth={1.2} />;
  const bust =
    b.bust && ["blouse", "sheath", "wrap", "tee", "sweater", "turtleneck", "jumpsuit", "shirt", "hoodie"].includes(cfg.top) ? (
      <path d="M -17 -80 Q -10 -73 -3 -79 M 3 -79 Q 10 -73 17 -80" fill="none" stroke={line} strokeWidth={1.5} strokeLinecap="round" opacity={0.55} />
    ) : null;

  let detail: ReactNode = null;
  switch (cfg.top) {
    case "suit":
      detail = (
        <>
          <path d="M -13 -112 L 0 -66 L 13 -112 Z" fill={SHIRT} />
          {shirtCollar}
          <Tie color={cfg.accentColor} />
          {lapels}
          <path d="M 0 -66 L 0 -8" stroke={line} {...lw} />
          <circle cx={3.5} cy={-50} r={2} fill={line} />
          <circle cx={3.5} cy={-34} r={2} fill={line} />
          <path d={`M ${-b.w + 4} -60 L ${-b.w + 14} -60`} stroke={SHIRT} strokeWidth={2.5} strokeLinecap="round" />
        </>
      );
      break;
    case "blazer":
      detail = (
        <>
          <path d="M -13 -112 L 0 -70 L 13 -112 Z" fill={cfg.accentColor} />
          {lapels}
          <path d="M 0 -70 L 0 -8" stroke={line} {...lw} />
          <circle cx={3.5} cy={-52} r={2} fill={line} />
          <circle cx={3.5} cy={-36} r={2} fill={line} />
        </>
      );
      break;
    case "vest":
      detail = (
        <>
          <path d="M -15 -112 L 0 -72 L 15 -112 Z" fill={SHIRT} />
          {shirtCollar}
          <Tie color={cfg.accentColor} />
          <path d="M -15 -112 L 0 -72 L 15 -112" fill="none" stroke={line} {...lw} />
          <path d={`M 0 -72 L 0 -10`} stroke={line} {...lw} />
          {[-62, -48, -34, -20].map((y) => <circle key={y} cx={0} cy={y} r={1.8} fill={shade(cfg.topColor, 0.45)} />)}
        </>
      );
      break;
    case "blouse":
      detail = (
        <>
          <path d="M -10 -112 Q 0 -104 10 -112" fill="none" stroke={line} {...lw} />
          <g fill={cfg.accentColor} stroke={shade(cfg.accentColor, 0.35)} strokeWidth={1.4} strokeLinejoin="round">
            <path d="M 0 -106 L -11 -113 Q -14 -106 -11 -100 Z" />
            <path d="M 0 -106 L 11 -113 Q 14 -106 11 -100 Z" />
            <path d="M -1.5 -105 L -6 -86 L -2 -85 L 0 -103 Z" />
            <path d="M 1.5 -105 L 6 -86 L 2 -85 L 0 -103 Z" />
            <circle cx={0} cy={-106} r={3} />
          </g>
          {bust}
        </>
      );
      break;
    case "shirt":
      detail = (
        <>
          <path d="M -11 -113 L 0 -100 L -4 -96 L -14 -106 Z M 11 -113 L 0 -100 L 4 -96 L 14 -106 Z" fill={shade(cfg.topColor, 0.08)} stroke={line} {...lw} />
          <path d="M 0 -100 L 0 -10" stroke={line} {...lw} />
          {[-86, -66, -46, -26].map((y) => <circle key={y} cx={0} cy={y} r={1.6} fill={line} />)}
          {bust}
        </>
      );
      break;
    case "sheath":
      detail = (
        <>
          <path d="M -12 -112 Q 0 -98 12 -112" fill={shade(cfg.topColor, 0.12)} stroke={line} {...lw} />
          <rect x={-b.w - 1} y={-50} width={b.w * 2 + 2} height={7} rx={3} fill={cfg.accentColor} />
          <rect x={-3.5} y={-51} width={7} height={9} rx={2} fill="none" stroke={shade(cfg.accentColor, 0.4)} strokeWidth={1.5} />
          {bust}
        </>
      );
      break;
    case "wrap":
      detail = (
        <>
          <path d="M -13 -112 L 2 -76 L 13 -112" fill={shade(cfg.topColor, 0.1)} stroke={line} {...lw} />
          <path d={`M -13 -112 L ${b.w - 2} -46`} fill="none" stroke={line} {...lw} />
          <path d={`M ${-b.w} -47 Q 0 -43 ${b.w} -47`} fill="none" stroke={cfg.accentColor} strokeWidth={4} strokeLinecap="round" />
          <path d={`M ${b.w - 2} -46 l 6 14 M ${b.w - 2} -46 l -2 15`} stroke={cfg.accentColor} strokeWidth={3} strokeLinecap="round" />
          {bust}
        </>
      );
      break;
    case "tee":
    case "sweater":
      detail = (
        <>
          <path d="M -10 -112 Q 0 -102 10 -112" fill={shade(cfg.topColor, 0.12)} stroke={line} {...lw} />
          {bust}
        </>
      );
      break;
    case "turtleneck":
      detail = bust;
      break;
    case "hoodie":
      detail = (
        <>
          <path d="M -5 -104 L -6 -84 M 5 -104 L 6 -84" stroke={SHIRT} {...lw} strokeWidth={2.2} />
          <path d={roundedRect(-b.w * 0.6, -50, b.w * 1.2, 26, 8)} fill={shade(cfg.topColor, 0.08)} stroke={line} {...lw} />
          {bust}
        </>
      );
      break;
    case "jumpsuit":
      detail = (
        <>
          <path d="M -10 -112 L 0 -94 L 10 -112" fill="none" stroke={line} {...lw} />
          <rect x={-b.w - 2} y={-30} width={b.w * 2 + 4} height={6} rx={3} fill={cfg.accentColor} />
          {bust}
        </>
      );
      break;
  }

  const lanyard =
    cfg.extra === "lanyard" ? (
      <g>
        <path d="M -11 -110 L -4 -62 M 11 -110 L 4 -62" stroke={cfg.extraColor} strokeWidth={3.5} strokeLinecap="round" fill="none" />
        <rect x={-10} y={-64} width={20} height={26} rx={3} fill={SHIRT} stroke="#b9b4ab" strokeWidth={1.4} />
        <rect x={-10} y={-64} width={20} height={7} rx={2} fill={cfg.extraColor} />
        <circle cx={0} cy={-49} r={4} fill="#b9b4ab" />
        <rect x={-6} y={-43} width={12} height={2} rx={1} fill="#b9b4ab" />
      </g>
    ) : null;

  return (
    <>
      {detail}
      {lanyard}
    </>
  );
}

function hairShapes(style: AvatarConfig["hair"], hairLine: string): { back?: ReactNode; front?: ReactNode } {
  const capBack = <path d="M -31 -150 C -33 -192 33 -192 31 -150 L 30 -136 Q 0 -126 -30 -136 Z" />;
  const sweptFront = <path d="M -29.5 -150 C -31 -190 31 -190 29.5 -150 C 22 -170 -22 -170 -29.5 -150 Z" />;
  const middlePart = <path d="M -29.5 -148 C -32 -192 0 -190 0 -181 C 0 -190 32 -192 29.5 -148 C 26 -168 10 -179 0 -179 C -10 -179 -26 -168 -29.5 -148 Z" />;
  const sideStrands = (to: number) => (
    <>
      <path d={`M -29.5 -150 Q -35 -122 -31 ${to} Q -24 ${to} -23.5 ${to - 6} Q -26 -124 -24.5 -148 Z`} />
      <path d={`M 29.5 -150 Q 35 -122 31 ${to} Q 24 ${to} 23.5 ${to - 6} Q 26 -124 24.5 -148 Z`} />
    </>
  );
  const ring = (radius: number, cy: number, r: number, from: number, to: number, step: number) => {
    const out: ReactNode[] = [];
    for (let d = from; d <= to; d += step) {
      const rad = (d * Math.PI) / 180;
      out.push(<circle key={d} cx={Math.cos(rad) * radius} cy={cy - Math.sin(rad) * radius} r={r} />);
    }
    return out;
  };

  switch (style) {
    case "crop":
      return { back: capBack, front: <path d="M -29.5 -152 C -31 -188 31 -192 29.5 -152 C 24 -164 14 -169 2 -166 C -12 -170 -24 -164 -29.5 -152 Z" /> };
    case "sidepart":
      return { back: capBack, front: <path d="M -29.5 -146 C -33 -194 36 -194 29.5 -152 C 26 -168 8 -173 -10 -170 C -18 -165 -26 -158 -29.5 -146 Z" /> };
    case "buzz":
      return {
        back: <path d="M -30 -150 C -31 -188 31 -188 30 -150 L 29.5 -140 Q 0 -132 -29.5 -140 Z" opacity={0.92} />,
        front: <path d="M -28.5 -158 C -28 -186 28 -186 28.5 -158 C 18 -170 -18 -170 -28.5 -158 Z" opacity={0.92} />,
      };
    case "pixie":
      return {
        back: capBack,
        front: <path d="M -29.5 -148 C -33 -192 33 -195 29.5 -156 C 24 -164 16 -165 9 -158 L 6 -167 C -2 -161 -12 -158 -18 -150 L -20 -159 C -24 -156 -27 -152 -29.5 -148 Z" />,
      };
    case "curly":
      return {
        back: (
          <>
            <ellipse cx={0} cy={-164} rx={34} ry={30} />
            {ring(32, -160, 10, -20, 200, 20)}
          </>
        ),
        front: <>{[-21, -10, 1, 12, 22].map((x, i) => <circle key={x} cx={x} cy={-174 + Math.abs(x) * 0.25 + (i % 2) * 2} r={9.5} />)}</>,
      };
    case "afro":
      return {
        back: (
          <>
            <circle cx={0} cy={-170} r={42} />
            {ring(42, -170, 11, -30, 210, 18)}
          </>
        ),
        front: <>{[-22, -11, 0, 11, 22].map((x) => <circle key={x} cx={x} cy={-176 + Math.abs(x) * 0.3} r={10} />)}</>,
      };
    case "bob":
      return {
        back: <path d="M -34 -152 C -37 -196 37 -196 34 -152 L 35 -122 Q 34 -116 27 -116 L -27 -116 Q -34 -116 -35 -122 Z" />,
        front: <path d="M -29.5 -150 C -32 -192 32 -192 29.5 -150 C 26 -160 19 -164 11 -164 L -11 -164 C -19 -164 -26 -160 -29.5 -150 Z" />,
      };
    case "lob":
      return {
        back: <path d="M -34 -152 C -37 -196 37 -196 34 -152 L 37 -104 Q 31 -95 22 -101 Q 0 -97 -22 -101 Q -31 -95 -37 -104 Z" />,
        front: (
          <>
            {middlePart}
            {sideStrands(-106)}
          </>
        ),
      };
    case "long":
      return {
        back: <path d="M -33 -152 C -37 -196 37 -196 33 -152 L 37 -84 Q 37 -76 29 -76 L -29 -76 Q -37 -76 -37 -84 Z" />,
        front: (
          <>
            <path d="M -29.5 -146 C -33 -194 35 -194 29.5 -150 C 20 -170 0 -173 -14 -165 C -22 -160 -27 -154 -29.5 -146 Z" />
            {sideStrands(-94)}
          </>
        ),
      };
    case "wavy":
      return {
        back: <path d="M -33 -152 C -37 -196 37 -196 33 -152 Q 41 -130 34 -112 Q 43 -92 35 -72 Q 20 -64 0 -69 Q -20 -64 -35 -72 Q -43 -92 -34 -112 Q -41 -130 -33 -152 Z" />,
        front: (
          <>
            <path d="M -29.5 -146 C -33 -194 35 -194 29.5 -150 C 20 -170 0 -173 -14 -165 C -22 -160 -27 -154 -29.5 -146 Z" />
            <path d="M -29.5 -150 Q -37 -132 -31 -116 Q -38 -100 -31 -86 Q -24 -86 -24 -92 Q -29 -104 -24 -116 Q -29 -132 -24.5 -148 Z" />
            <path d="M 29.5 -150 Q 37 -132 31 -116 Q 38 -100 31 -86 Q 24 -86 24 -92 Q 29 -104 24 -116 Q 29 -132 24.5 -148 Z" />
          </>
        ),
      };
    case "braid":
      return { back: <path d="M -31 -150 C -33 -192 33 -192 31 -150 L 31 -128 Q 0 -120 -31 -128 Z" />, front: sweptFront };
    case "boxbraids":
      return {
        back: (
          <>
            <path d="M -34 -152 C -37 -196 37 -196 34 -152 L 38 -70 Q 0 -62 -38 -70 Z" />
            {[-30, -20, -10, 0, 10, 20, 30].map((x) => (
              <path key={x} d={`M ${x} -140 L ${x * 1.1} -70`} fill="none" stroke={hairLine} strokeWidth={1.4} />
            ))}
          </>
        ),
        front: (
          <>
            {middlePart}
            {[-1, 1].map((side) =>
              [0, 1, 2].map((i) => <rect key={`${side}${i}`} x={side * (25 + i * 4) - 2.5} y={-150} width={5} height={62 + i * 4} rx={2.5} />),
            )}
          </>
        ),
      };
    case "chignon":
      return { back: capBack, front: middlePart };
    case "bun":
    case "ponytail":
      return { back: capBack, front: sweptFront };
    case "bald":
    default:
      return {};
  }
}

function extraParts(cfg: AvatarConfig): Part[] {
  const color = cfg.extraColor;
  const line = shade(color, 0.35);
  const lw = { stroke: line, strokeWidth: LINE, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const TOP = 200; // always drawn above the head
  const out: Part[] = [];

  if (cfg.eyewear !== "none") {
    const dark = cfg.eyewear === "shades";
    const frame = dark ? INK : "#2a2d3e";
    const lens = (x: number) =>
      cfg.eyewear === "round" ? <circle cx={x} cy={-151} r={7.5} /> : <rect x={x - 8.5} y={-157} width={17} height={12} rx={4} />;
    out.push({
      key: "eyewear",
      x0: 0,
      z: 30,
      flat: "face",
      node: (
        <g fill={dark ? "#141327" : "rgba(255,255,255,0.18)"} stroke={frame} strokeWidth={2}>
          {lens(-11)}
          {lens(11)}
          <path d="M -3 -152 Q 0 -154 3 -152" fill="none" />
          {dark && <path d="M -16 -153 L -12 -156" stroke="#ffffff" strokeWidth={1.5} opacity={0.5} />}
        </g>
      ),
    });
  }

  switch (cfg.extra) {
    case "headphones":
      out.push({ key: "band", x0: 0, z: 0, bias: TOP, node: <path d="M -31 -150 C -34 -196 34 -196 31 -150" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" /> });
      for (const side of [-1, 1]) {
        out.push({ key: `cup${side}`, x0: side * 30, z: 4, node: <rect x={side * 30 - 6.5} y={-162} width={13} height={22} rx={6} fill={color} {...lw} /> });
      }
      break;
    case "cap":
      out.push({ key: "capDome", x0: 0, z: 0, bias: TOP, node: <path d="M -31 -164 C -31 -200 31 -200 31 -164 Q 0 -170 -31 -164 Z" fill={color} {...lw} /> });
      out.push({ key: "capBrim", x0: 0, z: 26, node: <path d="M -24 -166 Q 0 -174 24 -166 Q 26 -160 20 -159 Q 0 -165 -20 -159 Q -26 -160 -24 -166 Z" fill={shade(color, 0.12)} {...lw} /> });
      break;
    case "beanie":
      out.push({
        key: "beanie",
        x0: 0,
        z: 0,
        bias: TOP,
        node: (
          <>
            <path d="M -31 -162 C -33 -204 33 -204 31 -162 Z" fill={color} {...lw} />
            <rect x={-33} y={-170} width={66} height={12} rx={5} fill={shade(color, 0.14)} {...lw} />
          </>
        ),
      });
      break;
    case "earrings":
      for (const side of [-1, 1]) {
        out.push({ key: `earring${side}`, x0: side * 28, z: -2, node: <circle cx={side * 28} cy={-136} r={3.2} fill="none" stroke="#f5c542" strokeWidth={2} /> });
      }
      break;
  }
  return out;
}

function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}
