// Draws the app icon (same shapes as public/icon.svg) into PNGs for the web app manifest.
// Run from the repo root: node apps/web/scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TEAL = [15, 118, 110, 255];
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

function colorAt(x, y) {
  // Coordinates are in the SVG's 512 x 512 space.
  const r = 112;
  const cx = Math.min(Math.max(x, r), 512 - r);
  const cy = Math.min(Math.max(y, r), 512 - r);
  if (x < 0 || y < 0 || x > 512 || y > 512 || Math.hypot(x - cx, y - cy) > r) return CLEAR;
  if (Math.hypot(x - 340, y - 172) <= 10) return TEAL;
  if (Math.abs(Math.hypot(x - 256, y - 256) - 120) <= 18) return WHITE;
  // Distance from the needle segment (150,362)-(362,150), with round caps.
  const t = Math.min(1, Math.max(0, ((x - 150) * 212 + (y - 362) * -212) / (212 * 212 * 2)));
  if (Math.hypot(x - (150 + 212 * t), y - (362 - 212 * t)) <= 14) return WHITE;
  return TEAL;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function png(size) {
  const samples = 4;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const color = colorAt(((px + (sx + 0.5) / samples) * 512) / size, ((py + (sy + 0.5) / samples) * 512) / size);
          for (let i = 0; i < 4; i++) sum[i] += color[i];
        }
      }
      const offset = py * (size * 4 + 1) + 1 + px * 4;
      for (let i = 0; i < 4; i++) raw[offset + i] = Math.round(sum[i] / (samples * samples));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const file = new URL(`../public/icon-${size}.png`, import.meta.url);
  writeFileSync(file, png(size));
  console.log(`wrote public/icon-${size}.png`);
}
