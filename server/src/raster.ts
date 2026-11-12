import { deflateSync } from "node:zlib";
import type { Stroke } from "@sketch/shared";

// Turns the drawing's strokes into a small PNG so an AI player can "look" at it.
// Plain JavaScript + Node's zlib: no native image libraries to install on the server.

const W = 400;
const H = 300;
const BASE_WIDTH = 800; // brush sizes are defined for an 800px-wide canvas

export function strokesToPng(strokes: Stroke[]): Buffer {
  const px = new Uint8Array(W * H * 3).fill(255);

  const dot = (cx: number, cy: number, r: number, rgb: [number, number, number]) => {
    const r2 = r * r;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.ceil(cy + r)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) {
          const i = (y * W + x) * 3;
          px[i] = rgb[0];
          px[i + 1] = rgb[1];
          px[i + 2] = rgb[2];
        }
      }
    }
  };

  for (const s of strokes) {
    const rgb: [number, number, number] = s.tool === "eraser" ? [255, 255, 255] : hex(s.color);
    const r = Math.max(1, (s.size * W) / BASE_WIDTH / 2);
    const p = s.points;
    for (let i = 0; i + 1 < p.length; i += 2) {
      const x = p[i]! * W;
      const y = p[i + 1]! * H;
      if (i === 0) {
        dot(x, y, r, rgb);
        continue;
      }
      // Stamp dots along the segment so lines come out solid.
      const px0 = p[i - 2]! * W;
      const py0 = p[i - 1]! * H;
      const steps = Math.max(1, Math.ceil(Math.hypot(x - px0, y - py0) / Math.max(1, r / 2)));
      for (let t = 1; t <= steps; t++) dot(px0 + ((x - px0) * t) / steps, py0 + ((y - py0) * t) / steps, r, rgb);
    }
  }
  return encodePng(px);
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.replace("#", ""), 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [0, 0, 0];
}

// ── Minimal PNG encoder (RGB, 8-bit, no filtering) ──────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // filter: none
    Buffer.from(rgb.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
