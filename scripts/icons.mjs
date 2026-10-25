import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT_DIR = 'public/icons';
const SS = 4;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function insideRoundRect(x, y, size, radius, pad) {
  const min = pad;
  const max = size - pad;
  if (x < min || x > max || y < min || y > max) return false;
  const cx = Math.min(Math.max(x, min + radius), max - radius);
  const cy = Math.min(Math.max(y, min + radius), max - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const BG_TOP = [22, 41, 92];
const BG_BOTTOM = [16, 19, 34];
const GOLD = [227, 179, 79];
const GOLD_LIGHT = [250, 222, 150];
const GOLD_DARK = [150, 104, 34];

// A gold gem on a dark rounded tile, sampled at 4x for smooth edges.
function sample(px, py, size, { opaque, gemScale }) {
  const cx = size / 2;
  const cy = size * 0.5;
  const gem = size * gemScale;

  const top = [cx, cy - gem * 0.5];
  const right = [cx + gem * 0.42, cy - gem * 0.1];
  const bottom = [cx, cy + gem * 0.54];
  const left = [cx - gem * 0.42, cy - gem * 0.1];
  const diamond = [top, right, bottom, left];

  const pad = opaque ? 0 : size * 0.05;
  const radius = opaque ? 0 : size * 0.22;

  if (!opaque && !insideRoundRect(px, py, size, radius, pad)) return [0, 0, 0, 0];

  const vertical = Math.min(1, Math.max(0, (py - pad) / (size - pad * 2)));
  let [r, g, b] = mix(BG_TOP, BG_BOTTOM, vertical * 0.9 + 0.1);

  const halo = Math.max(0, 1 - Math.hypot(px - cx, py - cy) / (size * 0.34));
  [r, g, b] = mix([r, g, b], GOLD, halo * 0.18);

  if (!opaque && Math.abs(Math.hypot(px - cx, py - cy) - size * 0.34) < size * 0.006) {
    [r, g, b] = mix([r, g, b], GOLD, 0.35);
  }

  if (insidePolygon(px, py, diamond)) {
    const t = Math.min(1, Math.max(0, (py - top[1]) / (bottom[1] - top[1])));
    let color = mix(GOLD_LIGHT, GOLD_DARK, t * 0.85);
    color = px > cx ? mix(color, GOLD_DARK, 0.2) : mix(color, GOLD_LIGHT, 0.12);

    if (Math.hypot(px - (cx - gem * 0.1), py - (cy - gem * 0.16)) < gem * 0.055) {
      color = mix(color, [255, 248, 224], 0.55);
    }
    [r, g, b] = color;
  }

  return [r, g, b, 255];
}

function renderIcon(size, options) {
  const width = size * SS;
  const big = Buffer.alloc(width * width * 4);

  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = sample(x + 0.5, y + 0.5, width, options);
      const index = (y * width + x) * 4;
      big[index] = r;
      big[index + 1] = g;
      big[index + 2] = b;
      big[index + 3] = a;
    }
  }

  const final = Buffer.alloc(size * size * 4);
  const area = SS * SS;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const index = ((y * SS + sy) * width + (x * SS + sx)) * 4;
          r += big[index];
          g += big[index + 1];
          b += big[index + 2];
          a += big[index + 3];
        }
      }
      const index = (y * size + x) * 4;
      final[index] = Math.round(r / area);
      final[index + 1] = Math.round(g / area);
      final[index + 2] = Math.round(b / area);
      final[index + 3] = Math.round(a / area);
    }
  }

  return encodePng(size, size, final);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, options: { opaque: false, gemScale: 0.62 } },
  { file: 'icon-512.png', size: 512, options: { opaque: false, gemScale: 0.62 } },
  { file: 'icon-512-maskable.png', size: 512, options: { opaque: true, gemScale: 0.5 } },
  { file: 'apple-touch-icon.png', size: 180, options: { opaque: true, gemScale: 0.58 } },
];

for (const target of targets) {
  writeFileSync(`${OUT_DIR}/${target.file}`, renderIcon(target.size, target.options));
  console.log(`wrote ${OUT_DIR}/${target.file} (${target.size}x${target.size})`);
}
