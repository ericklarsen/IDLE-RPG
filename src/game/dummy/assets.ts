import type Phaser from 'phaser';
import { paletteById, type PaletteId, type PaletteSlot } from '../../data/palettes';
import type { CostumeTier } from '../../sim/types';

/**
 * Procedural 32x32 pixel-art sprites.
 *
 * Everything is drawn from primitives into a small pixel grid, then auto-outlined
 * so silhouettes stay readable at 2x. No image files: this module is the single
 * place to swap in real art later.
 */
const C = {
  outline: '#0d0b14',
  steelLight: '#e6eefc',
  steel: '#a9bcd6',
  steelDark: '#7185a3',
  steelShadow: '#49546e',
  gold: '#e3b34f',
  goldLight: '#f9dd97',
  goldDark: '#a9762a',
  leather: '#4a3428',
  leatherDark: '#2b1d15',
  skin: '#e8b48a',
  skinDark: '#b97a5a',
  crimson: '#a83c52',
  crimsonDark: '#6b2237',
  bone: '#e9e1c9',
  boneDark: '#b0a68b',
  boneShadow: '#7d745e',
  slime: '#7cc86a',
  slimeLight: '#c4f0a6',
  slimeDark: '#48863c',
  slimeShadow: '#2f5c28',
  bat: '#8d6ac0',
  batDark: '#5b3f8c',
  batLight: '#c6aef2',
  goblin: '#8fd074',
  goblinDark: '#4b7f3a',
  goblinLight: '#cdf3ae',
  purple: '#8b63c9',
  purpleDark: '#472b6b',
  purpleLight: '#cbb1f9',
  red: '#c94f4f',
  redDark: '#7c2a2a',
  wing: '#4e1620',
  wingBone: '#b2404a',
  ember: '#ff8a3d',
  emberLight: '#ffc484',
  flame: '#ff5d3a',
  void: '#241a38',
  eye: '#ffe9a8',
  eyeRed: '#ff7575',
  eyeViolet: '#d3b3ff',
  rust: '#8a5a3c',
};

/** Sprite edge length in pixels; BattleScene scales from this. */
export const SPRITE_SIZE = 32;

class PixelGrid {
  private cells: (string | null)[];

  constructor(
    readonly width = SPRITE_SIZE,
    readonly height = SPRITE_SIZE,
  ) {
    this.cells = new Array(width * height).fill(null);
  }

  private set(x: number, y: number, color: string): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.cells[y * this.width + x] = color;
  }

  private clear(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.cells[y * this.width + x] = null;
  }

  rect(x: number, y: number, w: number, h: number, color: string): this {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) this.set(xx, yy, color);
    }
    return this;
  }

  clearRect(x: number, y: number, w: number, h: number): this {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) this.clear(xx, yy);
    }
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, color);
      }
    }
    return this;
  }

  poly(points: [number, number][], color: string): this {
    const ys = points.map(([, y]) => y);
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...ys)));

    for (let y = minY; y <= maxY; y += 1) {
      const scanY = y + 0.5;
      const hits: number[] = [];
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > scanY !== yj > scanY) {
          hits.push(xi + ((scanY - yi) / (yj - yi)) * (xj - xi));
        }
      }
      hits.sort((a, b) => a - b);
      for (let k = 0; k + 1 < hits.length; k += 2) {
        for (let x = Math.round(hits[k]); x < Math.round(hits[k + 1]); x += 1) {
          this.set(x, y, color);
        }
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, brush = 1): this {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const ex = Math.round(x1);
    const ey = Math.round(y1);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;

    for (;;) {
      for (let by = 0; by < brush; by += 1) {
        for (let bx = 0; bx < brush; bx += 1) this.set(x + bx, y + by, color);
      }
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** Mirror the left half onto the right half (width is halved at the centre). */
  mirrored(): this {
    const half = Math.floor(this.width / 2);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < half; x += 1) {
        this.cells[y * this.width + (this.width - 1 - x)] = this.cells[y * this.width + x];
      }
    }
    return this;
  }

  /** Punch out pixels so edges look torn (used for cloth and slime drips). */
  carve(points: [number, number][]): this {
    for (const [x, y] of points) this.clear(x, y);
    return this;
  }

  /** Any empty pixel touching a filled one becomes a dark outline. */
  outlined(color = C.outline): this {
    const source = [...this.cells];
    const at = (x: number, y: number): string | null =>
      x < 0 || y < 0 || x >= this.width || y >= this.height
        ? null
        : source[y * this.width + x];

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (at(x, y)) continue;
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
          this.set(x, y, color);
        }
      }
    }
    return this;
  }

  /** Row-major colours, for previews and tests. */
  rows(): (string | null)[][] {
    const out: (string | null)[][] = [];
    for (let y = 0; y < this.height; y += 1) {
      out.push(this.cells.slice(y * this.width, (y + 1) * this.width));
    }
    return out;
  }

  /** Palette swap, used to turn the hero silhouette into an arena rival. */
  recolor(map: Record<string, string>): this {
    this.cells = this.cells.map((color) => (color ? (map[color] ?? color) : color));
    return this;
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const color = this.cells[y * this.width + x];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  }
}

function hero(): PixelGrid {
  const g = new PixelGrid();

  // Cape behind the body, torn at the hem.
  g.poly(
    [
      [10, 10],
      [14, 10],
      [13, 30],
      [3, 27],
    ],
    C.crimsonDark,
  );
  g.poly(
    [
      [10, 11],
      [13, 11],
      [12, 28],
      [5, 26],
    ],
    C.crimson,
  );
  g.line(9, 13, 6, 25, C.crimsonDark);
  g.line(11, 15, 9, 27, C.crimsonDark);
  g.carve([
    [4, 28],
    [7, 29],
    [10, 30],
    [12, 30],
  ]);

  // Legs and greaves.
  g.rect(12, 21, 4, 7, C.steelShadow);
  g.rect(17, 21, 4, 7, C.steelShadow);
  g.rect(12, 22, 2, 5, C.steelDark);
  g.rect(17, 22, 2, 5, C.steelDark);
  g.rect(12, 25, 4, 1, C.steelLight);
  g.rect(17, 25, 4, 1, C.steel);

  // Boots.
  g.rect(11, 28, 6, 3, C.leather);
  g.rect(17, 28, 6, 3, C.leather);
  g.rect(11, 28, 6, 1, C.steelDark);
  g.rect(17, 28, 6, 1, C.steelDark);
  g.rect(10, 30, 7, 1, C.leatherDark);
  g.rect(17, 30, 7, 1, C.leatherDark);

  // Breastplate: shoulders wide, waist narrow, light from the left.
  g.poly(
    [
      [10, 11],
      [22, 11],
      [21, 21],
      [11, 21],
    ],
    C.steel,
  );
  g.poly(
    [
      [17, 11],
      [22, 11],
      [21, 21],
      [16, 21],
    ],
    C.steelDark,
  );
  g.rect(10, 11, 1, 10, C.steelLight);
  g.line(12, 20, 20, 20, C.steelShadow);
  g.rect(15, 13, 2, 4, C.gold);
  g.rect(13, 14, 6, 1, C.gold);
  g.rect(15, 13, 1, 1, C.goldLight);

  // Belt.
  g.rect(11, 20, 10, 2, C.leather);
  g.rect(15, 20, 2, 2, C.gold);
  g.rect(11, 20, 10, 1, C.leatherDark);

  // Pauldrons.
  g.ellipse(10, 12, 3.2, 2.6, C.steelLight);
  g.ellipse(22, 12, 3.2, 2.6, C.steelDark);
  g.rect(8, 13, 1, 2, C.steelLight);

  // Arms and gauntlets. The right hand holds the blade sprite.
  g.rect(8, 13, 3, 6, C.steel);
  g.rect(8, 17, 3, 2, C.steelDark);
  g.ellipse(9, 19, 2, 1.8, C.steelLight);
  g.rect(20, 13, 3, 6, C.steelDark);
  g.ellipse(22, 19, 2.2, 2, C.steel);
  g.rect(21, 18, 2, 1, C.steelLight);
  g.rect(21, 20, 3, 1, C.leather);

  // Neck and helm: gold crest, brow band, visor slit split by a nose guard.
  g.rect(14, 10, 4, 1, C.steelShadow);
  g.ellipse(16, 7, 4.5, 4.5, C.steel);
  g.ellipse(15, 6, 3.4, 2.8, C.steelLight);
  g.rect(12, 5, 8, 1, C.goldDark);
  g.rect(12, 8, 8, 1, C.void);
  g.rect(15, 8, 2, 3, C.steelLight);
  g.rect(13, 8, 1, 1, C.goldLight);
  g.rect(18, 8, 1, 1, C.goldLight);
  g.rect(12, 10, 8, 1, C.steelDark);
  g.rect(19, 9, 1, 1, C.steelShadow);

  // Bracer on the left forearm.
  g.rect(8, 16, 3, 1, C.goldDark);
  g.rect(8, 17, 3, 1, C.steelDark);

  // Plume sweeping back from the crest.
  g.poly(
    [
      [15, 2],
      [12, 0],
      [9, 2],
      [13, 5],
    ],
    C.crimson,
  );
  g.line(13, 2, 11, 4, C.crimsonDark);
  g.rect(14, 3, 1, 1, C.crimsonDark);

  return g.outlined();
}

function slime(): PixelGrid {
  const g = new PixelGrid();

  g.ellipse(16, 22, 11, 9, C.slime);
  g.ellipse(18, 24, 9, 7, C.slimeDark);
  g.ellipse(13, 18, 6, 4, C.slimeLight);
  g.rect(6, 28, 21, 3, C.slime);
  g.rect(8, 29, 16, 2, C.slimeDark);

  // Drips and globs.
  g.ellipse(25, 29, 2, 1.5, C.slime);
  g.ellipse(5, 28, 1.5, 1.2, C.slimeDark);
  g.ellipse(22, 12, 1.3, 1.3, C.slimeLight);

  // Face.
  g.ellipse(12, 21, 2, 2.5, C.void);
  g.ellipse(20, 21, 2, 2.5, C.void);
  g.rect(11, 20, 1, 1, C.steelLight);
  g.rect(19, 20, 1, 1, C.steelLight);
  g.line(14, 26, 18, 26, C.slimeShadow);
  g.rect(13, 25, 1, 1, C.slimeShadow);
  g.rect(18, 25, 1, 1, C.slimeShadow);

  return g.outlined();
}

function bat(): PixelGrid {
  const g = new PixelGrid();

  // Wings.
  g.poly(
    [
      [2, 11],
      [14, 12],
      [15, 25],
      [8, 21],
      [3, 16],
    ],
    C.batDark,
  );
  g.poly(
    [
      [2, 11],
      [12, 13],
      [12, 20],
      [6, 16],
    ],
    C.bat,
  );
  g.line(2, 12, 14, 18, C.batLight);
  g.line(3, 15, 12, 20, C.batDark);

  // Body and head.
  g.ellipse(16, 19, 4.5, 6.5, C.bat);
  g.ellipse(17, 20, 3, 5, C.batDark);
  g.ellipse(16, 12, 4, 3.5, C.bat);
  g.poly(
    [
      [13, 10],
      [11, 5],
      [15, 8],
    ],
    C.bat,
  );
  g.poly(
    [
      [19, 10],
      [21, 5],
      [17, 8],
    ],
    C.bat,
  );
  g.rect(13, 7, 1, 3, C.batLight);

  // Face.
  g.ellipse(14, 12, 1.4, 1.6, C.eyeRed);
  g.ellipse(18, 12, 1.4, 1.6, C.eyeRed);
  g.rect(14, 11, 1, 1, C.void);
  g.rect(18, 11, 1, 1, C.void);
  g.rect(14, 15, 1, 2, C.steelLight);
  g.rect(17, 15, 1, 2, C.steelLight);
  g.rect(15, 15, 2, 1, C.void);

  // Feet.
  g.line(14, 25, 13, 28, C.batDark);
  g.line(18, 25, 19, 28, C.batDark);

  return g.outlined();
}

function skeleton(): PixelGrid {
  const g = new PixelGrid();

  // Skull with sockets, nasal hole and a jaw of loose teeth.
  g.ellipse(16, 7, 4.6, 4.6, C.bone);
  g.ellipse(17, 6, 3.2, 3.2, C.boneDark);
  g.rect(12, 7, 2, 2, C.void);
  g.rect(18, 7, 2, 2, C.void);
  g.rect(15, 9, 2, 1, C.void);
  g.rect(13, 11, 6, 2, C.bone);
  g.rect(14, 11, 1, 2, C.void);
  g.rect(16, 11, 1, 2, C.void);
  g.rect(18, 11, 1, 2, C.void);
  g.rect(12, 5, 1, 3, C.boneShadow);

  // Neck and spine.
  g.rect(15, 13, 2, 2, C.boneDark);
  g.rect(15, 15, 2, 8, C.boneShadow);

  // Ribcage: a solid plate then carves for the gaps between ribs.
  g.ellipse(16, 17, 5.5, 4.2, C.bone);
  g.ellipse(17, 18, 4, 3.2, C.boneDark);
  for (const y of [14, 16, 18]) {
    g.clearRect(11, y, 4, 1);
    g.clearRect(18, y, 3, 1);
  }
  g.rect(15, 13, 2, 10, C.boneShadow);
  g.rect(14, 20, 4, 1, C.boneShadow);

  // Pelvis.
  g.rect(13, 21, 6, 2, C.bone);
  g.rect(14, 23, 4, 1, C.boneDark);

  // Arm bones with joints, sword in the right hand.
  g.line(11, 14, 8, 19, C.bone);
  g.ellipse(8, 19, 1, 1, C.boneDark);
  g.line(8, 19, 7, 23, C.boneDark);
  g.line(21, 14, 24, 18, C.bone);
  g.ellipse(24, 18, 1, 1, C.boneDark);
  g.line(24, 18, 25, 21, C.boneDark);
  g.rect(26, 10, 1, 11, C.steelDark);
  g.rect(25, 10, 1, 10, C.rust);
  g.rect(25, 12, 1, 4, C.steel);
  g.rect(24, 21, 3, 1, C.rust);
  g.rect(26, 22, 1, 2, C.leather);

  // Legs with knee joints and feet.
  g.line(14, 23, 12, 27, C.bone);
  g.ellipse(12, 27, 1, 1, C.boneDark);
  g.line(12, 27, 11, 30, C.bone);
  g.line(18, 23, 20, 27, C.bone);
  g.ellipse(20, 27, 1, 1, C.boneDark);
  g.line(20, 27, 21, 30, C.bone);
  g.rect(10, 30, 3, 1, C.boneShadow);
  g.rect(20, 30, 3, 1, C.boneShadow);

  return g.outlined();
}

function goblin(): PixelGrid {
  const g = new PixelGrid();

  // Stubby legs with clawed feet.
  g.rect(12, 24, 4, 5, C.goblinDark);
  g.rect(18, 24, 4, 5, C.goblinDark);
  g.rect(11, 28, 5, 2, C.leather);
  g.rect(18, 28, 5, 2, C.leather);
  g.rect(10, 30, 2, 1, C.boneDark);
  g.rect(13, 30, 1, 1, C.boneDark);
  g.rect(18, 30, 1, 1, C.boneDark);
  g.rect(21, 30, 2, 1, C.boneDark);

  // Loincloth.
  g.poly(
    [
      [11, 22],
      [21, 22],
      [22, 26],
      [10, 26],
    ],
    C.leather,
  );
  g.rect(10, 25, 12, 1, C.leatherDark);
  g.rect(11, 22, 10, 1, C.goldDark);

  // Hunched torso with a leather harness.
  g.ellipse(15, 19, 6, 6, C.goblin);
  g.ellipse(17, 20, 4.5, 5, C.goblinDark);
  g.ellipse(12, 17, 2.5, 2.5, C.goblinLight);
  g.line(11, 17, 19, 23, C.leather);
  g.line(11, 18, 19, 24, C.leatherDark);

  // Ears.
  g.poly(
    [
      [13, 12],
      [5, 7],
      [10, 16],
    ],
    C.goblin,
  );
  g.poly(
    [
      [12, 12],
      [7, 9],
      [10, 14],
    ],
    C.goblinDark,
  );
  g.poly(
    [
      [22, 12],
      [29, 6],
      [25, 16],
    ],
    C.goblin,
  );
  g.poly(
    [
      [22, 12],
      [27, 9],
      [24, 14],
    ],
    C.goblinDark,
  );

  // Head.
  g.ellipse(17, 13, 5.5, 4.8, C.goblin);
  g.ellipse(18, 14, 4, 3.6, C.goblinDark);
  g.ellipse(15, 11, 2.8, 2.2, C.goblinLight);
  g.rect(13, 12, 2, 2, C.eye);
  g.rect(19, 12, 2, 2, C.eye);
  g.rect(14, 12, 1, 2, C.void);
  g.rect(20, 12, 1, 2, C.void);
  g.rect(16, 14, 2, 1, C.goblinDark);
  g.rect(16, 16, 3, 1, C.void);
  g.rect(17, 16, 1, 1, C.bone);

  // Left arm raises a dagger, right arm hangs low.
  g.rect(9, 16, 3, 6, C.goblinDark);
  g.ellipse(10, 22, 2, 1.8, C.goblin);
  g.rect(8, 12, 1, 7, C.steel);
  g.rect(8, 12, 1, 2, C.steelLight);
  g.rect(7, 19, 3, 1, C.gold);
  g.rect(8, 20, 1, 2, C.leather);
  g.rect(20, 17, 3, 5, C.goblinDark);
  g.ellipse(22, 22, 2, 1.8, C.goblin);
  g.rect(22, 23, 1, 2, C.boneDark);

  return g.outlined();
}

function wraith(): PixelGrid {
  const g = new PixelGrid();

  // Cloak, wider at the hem and torn.
  g.poly(
    [
      [10, 9],
      [22, 9],
      [27, 30],
      [5, 30],
    ],
    C.purpleDark,
  );
  g.poly(
    [
      [11, 10],
      [21, 10],
      [24, 28],
      [8, 28],
    ],
    C.purple,
  );
  g.poly(
    [
      [13, 11],
      [19, 11],
      [20, 26],
      [12, 26],
    ],
    C.void,
  );
  g.carve([
    [6, 30],
    [9, 29],
    [12, 30],
    [16, 29],
    [19, 30],
    [23, 29],
    [26, 30],
  ]);
  g.clearRect(20, 23, 2, 2);
  g.clearRect(9, 25, 1, 2);

  // Hood with a peaked top and a deep opening.
  g.poly(
    [
      [16, 1],
      [21, 7],
      [16, 4],
      [11, 7],
    ],
    C.purple,
  );
  g.ellipse(16, 8, 6.5, 5, C.purple);
  g.ellipse(16, 9, 4, 3.6, C.void);
  g.line(11, 6, 11, 11, C.purpleLight);
  g.line(12, 5, 15, 3, C.purpleLight);
  g.rect(11, 10, 1, 3, C.purpleDark);

  // Glowing eyes inside the hood.
  g.rect(13, 9, 2, 1, C.eyeViolet);
  g.rect(18, 9, 2, 1, C.eyeViolet);
  g.rect(13, 9, 1, 1, C.steelLight);
  g.rect(18, 9, 1, 1, C.steelLight);
  g.rect(15, 10, 1, 3, C.purpleDark);
  g.rect(16, 10, 1, 3, C.purpleDark);

  // Sleeves and bony hands.
  g.poly(
    [
      [9, 12],
      [12, 12],
      [10, 22],
      [6, 19],
    ],
    C.purpleDark,
  );
  g.poly(
    [
      [20, 12],
      [23, 12],
      [26, 20],
      [22, 22],
    ],
    C.purpleDark,
  );
  g.ellipse(25, 21, 1.6, 1.6, C.bone);
  g.line(24, 20, 27, 23, C.bone);
  g.ellipse(6, 20, 1.6, 1.6, C.boneDark);
  g.line(7, 19, 4, 22, C.boneDark);

  return g.outlined();
}

function demon(): PixelGrid {
  const g = new PixelGrid();

  // Wings: a dark membrane with lighter finger struts and notched edges.
  g.poly(
    [
      [11, 11],
      [3, 4],
      [1, 18],
      [7, 26],
      [11, 21],
    ],
    C.wing,
  );
  g.poly(
    [
      [21, 11],
      [29, 4],
      [31, 18],
      [25, 26],
      [21, 21],
    ],
    C.wing,
  );
  g.line(10, 12, 4, 7, C.wingBone, 1);
  g.line(10, 15, 2, 14, C.wingBone, 1);
  g.line(9, 19, 5, 23, C.wingBone, 1);
  g.line(22, 12, 28, 7, C.wingBone, 1);
  g.line(22, 15, 30, 14, C.wingBone, 1);
  g.line(23, 19, 27, 23, C.wingBone, 1);
  g.carve([
    [3, 20],
    [6, 24],
    [29, 20],
    [26, 24],
  ]);

  // Swept horns.
  g.poly(
    [
      [12, 8],
      [8, 1],
      [12, 4],
      [14, 7],
    ],
    C.boneDark,
  );
  g.poly(
    [
      [20, 8],
      [24, 1],
      [20, 4],
      [18, 7],
    ],
    C.boneDark,
  );
  g.rect(9, 2, 1, 3, C.bone);
  g.rect(22, 2, 1, 3, C.bone);

  // Legs behind the torso.
  g.rect(12, 26, 3, 5, C.redDark);
  g.rect(18, 26, 3, 5, C.redDark);
  g.rect(10, 30, 5, 1, C.boneDark);
  g.rect(18, 30, 5, 1, C.boneDark);

  // Torso with an ember core.
  g.ellipse(16, 20, 6.5, 8, C.red);
  g.ellipse(18, 21, 4.5, 6.5, C.redDark);
  g.rect(15, 14, 2, 8, C.ember);
  g.rect(14, 16, 1, 4, C.emberLight);
  g.rect(17, 18, 1, 3, C.emberLight);
  g.rect(14, 21, 3, 1, C.ember);
  for (const y of [22, 25]) {
    g.line(12, y, 19, y, C.redDark);
  }

  // Head with fanged grin and slit eyes.
  g.ellipse(16, 10, 5, 4.2, C.red);
  g.ellipse(17, 11, 3.5, 3, C.redDark);
  g.rect(11, 8, 2, 2, C.eye);
  g.rect(19, 8, 2, 2, C.eye);
  g.rect(12, 8, 1, 2, C.void);
  g.rect(19, 8, 1, 2, C.void);
  g.rect(12, 12, 8, 1, C.void);
  g.rect(13, 13, 1, 1, C.bone);
  g.rect(15, 13, 1, 1, C.bone);
  g.rect(18, 13, 1, 1, C.bone);

  // Arms ending in claws.
  g.line(10, 17, 6, 22, C.red, 2);
  g.line(22, 17, 26, 22, C.red, 2);
  g.line(6, 22, 4, 26, C.boneDark);
  g.line(6, 22, 6, 27, C.boneDark);
  g.line(26, 22, 28, 26, C.boneDark);
  g.line(26, 22, 26, 27, C.boneDark);

  return g.outlined();
}

/** Same knight silhouette as the hero, in void-purple and rival cyan. */
function rival(): PixelGrid {
  return hero().recolor({
    [C.crimsonDark]: '#2f1b63',
    [C.crimson]: '#7b3ee0',
    [C.gold]: '#57efdc',
    [C.goldLight]: '#c9fff8',
    [C.goldDark]: '#2f9d99',
    [C.leather]: '#2b2036',
    [C.leatherDark]: '#191126',
  });
}

/**
 * Outfit palettes. Each tier repaints the same knight so the costume is
 * readable at a glance: bronze is leather and copper, emerald is green-and-gold.
 * The arena rival keeps its own palette and is never touched by these.
 */
const OUTFIT_PALETTES: Record<string, Record<string, string>> = {
  bronze: {
    [C.steelLight]: '#d8bd94',
    [C.steel]: '#a8825a',
    [C.steelDark]: '#7a5a3a',
    [C.steelShadow]: '#4e3721',
    [C.gold]: '#c9884b',
    [C.goldLight]: '#ecc592',
    [C.goldDark]: '#8a5a2c',
    [C.crimson]: '#7a4a2a',
    [C.crimsonDark]: '#452616',
    [C.leather]: '#3b2a1d',
    [C.leatherDark]: '#241810',
  },
  silver: {
    [C.steelLight]: '#f2f6fb',
    [C.steel]: '#c6d2e0',
    [C.steelDark]: '#8b99ab',
    [C.steelShadow]: '#5b6678',
    [C.gold]: '#cfd8e3',
    [C.goldLight]: '#ffffff',
    [C.goldDark]: '#8d99a8',
    [C.crimson]: '#5a6478',
    [C.crimsonDark]: '#333a49',
    [C.leather]: '#3a3f4a',
    [C.leatherDark]: '#22252c',
  },
  gold: {
    [C.gold]: '#f2c94c',
    [C.goldLight]: '#ffe9a1',
    [C.goldDark]: '#a9762a',
    [C.crimson]: '#b8342f',
    [C.crimsonDark]: '#741a19',
    [C.leather]: '#4a3420',
    [C.leatherDark]: '#2b1d12',
  },
  platinum: {
    [C.steelLight]: '#eef5ff',
    [C.steel]: '#b8cbe0',
    [C.steelDark]: '#7f95ae',
    [C.steelShadow]: '#566a82',
    [C.gold]: '#dfeaf7',
    [C.goldLight]: '#ffffff',
    [C.goldDark]: '#94a8c0',
    [C.crimson]: '#5878a8',
    [C.crimsonDark]: '#334a6b',
    [C.leather]: '#2f3a4a',
    [C.leatherDark]: '#1c232e',
  },
  diamond: {
    [C.steelLight]: '#dcecff',
    [C.steel]: '#8fb8e8',
    [C.steelDark]: '#5c7fae',
    [C.steelShadow]: '#3d5b80',
    [C.gold]: '#b9e0ff',
    [C.goldLight]: '#f0faff',
    [C.goldDark]: '#6d9dcb',
    [C.crimson]: '#3d5fc0',
    [C.crimsonDark]: '#233a7a',
    [C.leather]: '#28324e',
    [C.leatherDark]: '#161d30',
  },
  emerald: {
    [C.steelLight]: '#d3ecd9',
    [C.steel]: '#8fae9a',
    [C.steelDark]: '#5d7d6b',
    [C.steelShadow]: '#3c5546',
    [C.gold]: '#9fd97a',
    [C.goldLight]: '#d6f7bd',
    [C.goldDark]: '#4f8a45',
    [C.crimson]: '#2f7a4d',
    [C.crimsonDark]: '#194a2e',
    [C.leather]: '#2a3a2c',
    [C.leatherDark]: '#18241b',
  },
};

function outfitHero(tier: keyof typeof OUTFIT_PALETTES): PixelGrid {
  return hero().recolor(OUTFIT_PALETTES[tier]);
}

/** Semantic palette slots mapped onto the concrete knight colours. */
const PALETTE_SLOTS: Record<PaletteSlot, string> = {
  gold: C.gold,
  goldLight: C.goldLight,
  goldDark: C.goldDark,
  crimson: C.crimson,
  crimsonDark: C.crimsonDark,
  leather: C.leather,
  leatherDark: C.leatherDark,
};

/**
 * A palette is an accent layer: the outfit paints the armour and the palette
 * repaints the trim, cape, and leather. Both maps are applied in one pass from
 * the base knight, because a second `recolor` would look for the original
 * colours the first pass already replaced.
 */
export function heroGridFor(
  tier: CostumeTier | null,
  palette: PaletteId | null,
): PixelGrid {
  const map: Record<string, string> = tier ? { ...OUTFIT_PALETTES[tier] } : {};

  const info = paletteById(palette);
  if (info) {
    for (const [slot, color] of Object.entries(info.colors)) {
      const key = PALETTE_SLOTS[slot as PaletteSlot];
      if (key && color) map[key] = color;
    }
  }

  return Object.keys(map).length > 0 ? hero().recolor(map) : hero();
}

/** Texture key for an outfit/palette pair; ignores unknown palette ids. */
export function heroTextureKey(tier: CostumeTier | null, palette: string | null): string {
  const outfit = tier ? `hero-${tier}` : 'hero';
  const info = paletteById(palette);
  return info ? `${outfit}-${info.id}` : outfit;
}

/** Registers the outfit/palette texture on first use and returns its key. */
export function ensureHeroTexture(
  scene: Phaser.Scene,
  tier: CostumeTier | null,
  palette: string | null,
): string {
  const key = heroTextureKey(tier, palette);
  if (scene.textures.exists(key)) return key;

  const info = paletteById(palette);
  scene.textures.addCanvas(key, heroGridFor(tier, info?.id ?? null).toCanvas());
  return key;
}

function blade(): PixelGrid {
  const g = new PixelGrid(32, 32);

  g.poly(
    [
      [16, 0],
      [19, 3],
      [19, 21],
      [13, 21],
      [13, 3],
    ],
    C.steel,
  );
  g.rect(16, 2, 3, 19, C.steelLight);
  g.rect(18, 3, 1, 18, C.steelDark);
  g.rect(15, 4, 1, 17, C.steelShadow);
  g.rect(11, 21, 10, 2, C.gold);
  g.rect(11, 21, 10, 1, C.goldLight);
  g.rect(9, 22, 2, 2, C.goldDark);
  g.rect(21, 22, 2, 2, C.goldDark);
  g.rect(14, 23, 4, 6, C.leather);
  g.rect(15, 23, 1, 6, C.leatherDark);
  g.rect(17, 23, 1, 6, C.leatherDark);
  g.ellipse(16, 30, 2.5, 1.6, C.gold);
  g.rect(15, 29, 1, 1, C.goldLight);

  return g.outlined();
}

interface BeastColors {
  body: string;
  dark: string;
  light: string;
  accent: string;
  hoof: string;
}

/**
 * Shared side-view quadruped for the mounts: four legs, a neck, a head, and a
 * tail, then per-beast extras (mane, antlers, wings, long snout). Kept blocky
 * so it reads at the scene's 2x scale next to the knight.
 */
function mountBeast(
  colors: BeastColors,
  extra: 'steed' | 'wolf' | 'stag' | 'gryphon',
): PixelGrid {
  const g = new PixelGrid();

  // Tail behind the body.
  if (extra === 'wolf') {
    g.poly(
      [
        [7, 15],
        [3, 11],
        [1, 15],
        [4, 18],
      ],
      colors.dark,
    );
  } else if (extra === 'gryphon') {
    g.line(7, 17, 2, 20, colors.accent, 2);
  } else {
    g.line(7, 17, 3, 22, colors.dark, 2);
  }

  // Wings sit behind the body on the gryphon only.
  if (extra === 'gryphon') {
    g.poly(
      [
        [9, 15],
        [17, 3],
        [24, 9],
        [19, 15],
      ],
      colors.light,
    );
    g.line(17, 4, 20, 13, colors.dark);
  }

  // Body and chest.
  g.rect(6, 14, 18, 7, colors.body);
  g.rect(6, 14, 18, 2, colors.light);
  g.rect(6, 19, 18, 2, colors.dark);

  // Neck and head.
  g.poly(
    [
      [19, 14],
      [23, 8],
      [26, 8],
      [24, 15],
    ],
    colors.body,
  );
  g.rect(23, 7, 5, 4, colors.body);
  g.rect(23, 7, 5, 1, colors.light);
  g.rect(27, 8, 1, 2, colors.dark);

  if (extra === 'wolf') {
    // Longer snout and a pricked ear.
    g.rect(27, 9, 3, 2, colors.body);
    g.rect(24, 5, 1, 2, colors.dark);
    g.rect(25, 11, 2, 1, colors.accent);
  } else if (extra === 'stag') {
    // Antlers.
    g.line(24, 6, 21, 2, colors.accent);
    g.line(22, 4, 20, 3, colors.accent);
    g.line(26, 6, 25, 2, colors.accent);
  } else if (extra === 'gryphon') {
    // Beak and crest.
    g.poly(
      [
        [28, 8],
        [31, 9],
        [28, 10],
      ],
      colors.hoof,
    );
    g.line(24, 6, 22, 3, colors.accent);
  } else {
    // Steed mane along the neck.
    g.rect(22, 8, 2, 6, colors.accent);
    g.rect(20, 10, 2, 5, colors.accent);
  }

  // Legs.
  g.rect(7, 21, 3, 6, colors.dark);
  g.rect(12, 21, 3, 6, colors.dark);
  g.rect(18, 21, 3, 6, colors.dark);
  g.rect(22, 21, 3, 6, colors.dark);
  g.rect(7, 27, 3, 1, colors.hoof);
  g.rect(12, 27, 3, 1, colors.hoof);
  g.rect(18, 27, 3, 1, colors.hoof);
  g.rect(22, 27, 3, 1, colors.hoof);

  // Saddle.
  g.rect(10, 12, 7, 2, colors.accent);
  g.rect(11, 13, 1, 2, colors.dark);
  g.rect(16, 13, 1, 2, colors.dark);

  return g.outlined();
}

interface WingColors {
  feather: string;
  light: string;
  dark: string;
  glow: string;
}

/**
 * A symmetric pair of wings, spread wide enough to read behind the knight at
 * 2x. Drawn on its own layer so the knight stays the focus.
 */
function wingPair(colors: WingColors): PixelGrid {
  const g = new PixelGrid();

  // Left wing: shoulder, swept leading edge, notched trailing feathers.
  g.poly(
    [
      [14, 14],
      [3, 5],
      [1, 10],
      [4, 14],
      [1, 19],
      [8, 17],
      [13, 20],
    ],
    colors.feather,
  );
  g.poly(
    [
      [14, 14],
      [4, 7],
      [3, 10],
      [6, 12],
      [11, 15],
    ],
    colors.light,
  );
  g.line(12, 15, 3, 8, colors.dark);
  g.line(12, 17, 2, 17, colors.dark);
  g.line(9, 18, 4, 21, colors.dark);
  g.line(11, 17, 6, 20, colors.glow);

  // Right wing: the same shape mirrored across the spine.
  g.poly(
    [
      [17, 14],
      [28, 5],
      [30, 10],
      [27, 14],
      [30, 19],
      [23, 17],
      [18, 20],
    ],
    colors.feather,
  );
  g.poly(
    [
      [17, 14],
      [27, 7],
      [28, 10],
      [25, 12],
      [20, 15],
    ],
    colors.light,
  );
  g.line(19, 15, 28, 8, colors.dark);
  g.line(19, 17, 29, 17, colors.dark);
  g.line(22, 18, 27, 21, colors.dark);
  g.line(20, 17, 25, 20, colors.glow);

  // Spine and shoulder clasp between the wings.
  g.rect(15, 12, 2, 8, colors.dark);
  g.rect(15, 11, 2, 2, colors.glow);

  return g.outlined();
}

const EMBER_WING: WingColors = {
  feather: '#8a2f14',
  light: '#ff7a3c',
  dark: '#4a1708',
  glow: '#ffd0a8',
};
const RIME_WING: WingColors = {
  feather: '#4a7fa8',
  light: '#7fd8ff',
  dark: '#1f4460',
  glow: '#e6f7ff',
};
const STORM_WING: WingColors = {
  feather: '#8a7a2a',
  light: '#ffe066',
  dark: '#4a3f10',
  glow: '#fff6c2',
};

const EMBER_BEAST: BeastColors = {
  body: '#3a1c1a',
  dark: '#241110',
  light: '#ff7a3c',
  accent: '#ff9a4a',
  hoof: '#ffd0a8',
};
const WOLF_BEAST: BeastColors = {
  body: '#3a3152',
  dark: '#221c33',
  light: '#b38cff',
  accent: '#d6c2ff',
  hoof: '#8a74b8',
};
const STAG_BEAST: BeastColors = {
  body: '#cfeaff',
  dark: '#7fb6d8',
  light: '#ffffff',
  accent: '#7fd8ff',
  hoof: '#4a8fb8',
};
const GRYPHON_BEAST: BeastColors = {
  body: '#4a5478',
  dark: '#2c3350',
  light: '#e6edff',
  accent: '#ffe066',
  hoof: '#ffb340',
};

const BUILDERS: Record<string, () => PixelGrid> = {
  hero,
  'mount-ember': () => mountBeast(EMBER_BEAST, 'steed'),
  'mount-wolf': () => mountBeast(WOLF_BEAST, 'wolf'),
  'mount-stag': () => mountBeast(STAG_BEAST, 'stag'),
  'mount-gryphon': () => mountBeast(GRYPHON_BEAST, 'gryphon'),
  'wing-ember': () => wingPair(EMBER_WING),
  'wing-rime': () => wingPair(RIME_WING),
  'wing-storm': () => wingPair(STORM_WING),
  rival,
  'hero-bronze': () => outfitHero('bronze'),
  'hero-silver': () => outfitHero('silver'),
  'hero-gold': () => outfitHero('gold'),
  'hero-platinum': () => outfitHero('platinum'),
  'hero-diamond': () => outfitHero('diamond'),
  'hero-emerald': () => outfitHero('emerald'),
  slime,
  bat,
  skeleton,
  goblin,
  wraith,
  demon,
  blade,
};

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawRidge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  baseY: number,
  amplitude: number,
  color: string,
  phase: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += 8) {
    const y =
      baseY -
      Math.sin((x + phase * 60) * 0.013) * amplitude -
      Math.sin((x + phase * 31) * 0.041) * amplitude * 0.35;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
}

function createBackgroundTexture(scene: Phaser.Scene): void {
  const width = 390;
  const height = 844;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rand = mulberry32(0xb105f00d);

  // The stage sits above the HUD panel, so the horizon is high in the frame.
  const HORIZON = 366;

  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON + 20);
  sky.addColorStop(0, '#1b1550');
  sky.addColorStop(0.3, '#3a1f7a');
  sky.addColorStop(0.55, '#6b2f9e');
  sky.addColorStop(0.78, '#b93f97');
  sky.addColorStop(0.92, '#f0607f');
  sky.addColorStop(1, '#ffa06b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Aurora ribbons keep the upper sky from reading as flat navy.
  const auroraA = ctx.createLinearGradient(0, 140, width, 220);
  auroraA.addColorStop(0, 'rgba(87, 239, 220, 0)');
  auroraA.addColorStop(0.45, 'rgba(87, 239, 220, 0.18)');
  auroraA.addColorStop(1, 'rgba(120, 120, 255, 0)');
  ctx.fillStyle = auroraA;
  ctx.fillRect(0, 130, width, 120);

  const auroraB = ctx.createLinearGradient(0, 60, width, 180);
  auroraB.addColorStop(0, 'rgba(255, 122, 217, 0)');
  auroraB.addColorStop(0.55, 'rgba(255, 122, 217, 0.16)');
  auroraB.addColorStop(1, 'rgba(192, 132, 255, 0)');
  ctx.fillStyle = auroraB;
  ctx.fillRect(0, 50, width, 150);

  for (let i = 0; i < 80; i += 1) {
    const x = Math.floor(rand() * width);
    const y = Math.floor(rand() * 330);
    const alpha = 0.1 + rand() * 0.55;
    const size = rand() > 0.9 ? 2 : 1;
    ctx.fillStyle = `rgba(235, 228, 255, ${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  const glow = ctx.createRadialGradient(300, 126, 8, 300, 126, 108);
  glow.addColorStop(0, 'rgba(255, 226, 170, 0.55)');
  glow.addColorStop(0.4, 'rgba(255, 198, 150, 0.2)');
  glow.addColorStop(1, 'rgba(255, 190, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(170, 0, 260, 250);

  ctx.fillStyle = '#ffe6b8';
  ctx.beginPath();
  ctx.arc(300, 126, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(196, 150, 120, 0.3)';
  ctx.beginPath();
  ctx.arc(292, 119, 5, 0, Math.PI * 2);
  ctx.arc(307, 133, 6, 0, Math.PI * 2);
  ctx.arc(303, 112, 3, 0, Math.PI * 2);
  ctx.fill();

  drawRidge(ctx, width, height, 318, 30, '#542d92', 1);
  drawRidge(ctx, width, height, 348, 18, '#3b2070', 2.4);

  ctx.fillStyle = '#2a1552';
  ctx.fillRect(44, 300, 70, 66);
  ctx.fillRect(52, 276, 16, 90);
  ctx.fillRect(90, 268, 20, 98);
  ctx.fillRect(38, 314, 84, 14);
  ctx.fillStyle = '#ffc247';
  ctx.globalAlpha = 0.75;
  ctx.fillRect(58, 298, 3, 6);
  ctx.fillRect(96, 288, 3, 6);
  ctx.globalAlpha = 1;

  const ground = ctx.createLinearGradient(0, HORIZON, 0, height);
  ground.addColorStop(0, '#6a3b9e');
  ground.addColorStop(0.08, '#4a2a7a');
  ground.addColorStop(0.35, '#2e1c5c');
  ground.addColorStop(0.7, '#211446');
  ground.addColorStop(1, '#180e35');
  ctx.fillStyle = ground;
  ctx.fillRect(0, HORIZON, width, height - HORIZON);

  ctx.fillStyle = '#ff9a4d';
  ctx.fillRect(0, HORIZON - 1, width, 2);
  ctx.fillStyle = 'rgba(255, 220, 180, 0.28)';
  ctx.fillRect(0, HORIZON + 1, width, 1);

  for (let i = 0; i < 30; i += 1) {
    const x = Math.floor(rand() * width);
    const y = HORIZON + 12 + Math.floor(rand() * 150);
    const w = 18 + Math.floor(rand() * 44);
    ctx.fillStyle = `rgba(226, 205, 255, ${0.04 + rand() * 0.06})`;
    ctx.fillRect(x, y, w, 2);
  }

  // Low rocks frame the arena without cluttering the strip under the fighters.
  for (const [x, y, rx, ry] of [
    [16, 386, 26, 7],
    [372, 390, 30, 8],
    [232, 402, 13, 3],
  ]) {
    ctx.fillStyle = '#1d1140';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const fog = ctx.createLinearGradient(0, 300, 0, 480);
  fog.addColorStop(0, 'rgba(255, 140, 220, 0)');
  fog.addColorStop(0.35, 'rgba(255, 140, 220, 0.2)');
  fog.addColorStop(1, 'rgba(255, 140, 220, 0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 300, width, 180);

  const vignette = ctx.createRadialGradient(195, 380, 140, 195, 380, 560);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(24, 8, 56, 0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  scene.textures.addCanvas('bg', canvas);
}

function createOrbTexture(scene: Phaser.Scene): void {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const glow = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
  glow.addColorStop(0.45, 'rgba(255, 255, 255, 0.55)');
  glow.addColorStop(0.8, 'rgba(255, 255, 255, 0.16)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  scene.textures.addCanvas('orb', canvas);
}

function createRingTexture(scene: Phaser.Scene): void {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 11, 0, Math.PI * 2);
  ctx.stroke();

  scene.textures.addCanvas('ring', canvas);
}

function createSlashTexture(scene: Phaser.Scene): void {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, size, size, 0);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(2, size - 2, size - 6, -Math.PI * 0.62, -Math.PI * 0.06);
  ctx.stroke();

  scene.textures.addCanvas('slash', canvas);
}

function createSparkTexture(scene: Phaser.Scene): void {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1, 0, 2, 4);
  ctx.fillRect(0, 1, 4, 2);
  scene.textures.addCanvas('spark', canvas);
}

/**
 * Tileable ground marks that scroll under the fighters.
 *
 * The arena floor is a painted gradient, so the strip only adds pebbles, tufts,
 * and scratches — enough to read as travel without covering the ground. Marks
 * that cross the edge are drawn twice, so the texture repeats without a seam.
 */
function createGroundStripTexture(scene: Phaser.Scene): void {
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rand = mulberry32(0x51de5eed);
  const across = (x: number, draw: (atX: number) => void) => {
    draw(x);
    if (x < 14) draw(x + size);
    if (x > size - 14) draw(x - size);
  };

  for (let i = 0; i < 34; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 5 + rand() * 20;
    ctx.fillStyle = `rgba(226, 205, 255, ${0.04 + rand() * 0.06})`;
    across(x, (atX) => ctx.fillRect(atX, y, w, 2));
  }

  for (let i = 0; i < 16; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const rx = 1.5 + rand() * 2.5;
    ctx.fillStyle = `rgba(24, 12, 48, ${0.25 + rand() * 0.2})`;
    across(x, (atX) => {
      ctx.beginPath();
      ctx.ellipse(atX, y, rx, rx * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  for (let i = 0; i < 10; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const h = 3 + rand() * 5;
    ctx.strokeStyle = 'rgba(176, 152, 235, 0.3)';
    ctx.lineWidth = 1;
    across(x, (atX) => {
      ctx.beginPath();
      ctx.moveTo(atX, y);
      ctx.lineTo(atX + 1, y - h);
      ctx.stroke();
    });
  }

  scene.textures.addCanvas('ground-strip', canvas);
}

/** Sprite builders, exposed so the preview script can render a contact sheet. */
export const SPRITE_BUILDERS = BUILDERS;

export function registerDummyTextures(scene: Phaser.Scene): void {
  for (const [key, build] of Object.entries(BUILDERS)) {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, build().toCanvas());
  }
  if (!scene.textures.exists('spark')) createSparkTexture(scene);
  if (!scene.textures.exists('orb')) createOrbTexture(scene);
  if (!scene.textures.exists('ring')) createRingTexture(scene);
  if (!scene.textures.exists('slash')) createSlashTexture(scene);
  if (!scene.textures.exists('bg')) createBackgroundTexture(scene);
  if (!scene.textures.exists('ground-strip')) createGroundStripTexture(scene);
}
