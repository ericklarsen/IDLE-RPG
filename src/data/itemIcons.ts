import { ITEM_NAMES } from './items';
import type { Slot } from '../sim/types';

/**
 * Pixel maps for the 16x16 item icons. Symbols:
 * o outline · a primary · A shadow · h highlight · c accent gem · g grip.
 * Each slot has one palette tier per name in ITEM_NAMES, so every item name
 * gets a stable, distinct icon without external art files.
 */
const ICON_ROWS: Record<Slot, string[]> = {
  weapon: [
    '................',
    '.......oo.......',
    '......ohho......',
    '......ohao......',
    '......ohao......',
    '......ohao......',
    '......ohao......',
    '......ohao......',
    '....oooooooo....',
    '...oAaaaaaAo....',
    '....oooooooo....',
    '......oggo......',
    '......oggo......',
    '......oggo......',
    '.....oooooo.....',
    '................',
  ],
  helm: [
    '................',
    '.....oooooo.....',
    '....oaaaaaao....',
    '...oahhhhhhao...',
    '...oaaaaaaaao...',
    '...oaaccccaao...',
    '...oaaaaaaaao...',
    '...oaaaaaaaao...',
    '...oAaaaaaaAo...',
    '...oAao..oaAo...',
    '...oAao..oaAo...',
    '...oooo..oooo...',
    '................',
    '................',
    '................',
    '................',
  ],
  armor: [
    '................',
    '...ooo....ooo...',
    '..oaaao..oaaao..',
    '..oaaho..ohaao..',
    '.oaaaaaaaaaaaao.',
    '.oAaaaaaaaaaaAo.',
    '.oAaaaccccaaaAo.',
    '.oAaaaaaaaaaaAo.',
    '.oAaaaaaaaaaaAo.',
    '.oAAaaaaaaaAAo..',
    '..oAAaaaaaAAo...',
    '...oAAAAAAAo....',
    '....ooooooo.....',
    '................',
    '................',
    '................',
  ],
  boots: [
    '................',
    '....oooo........',
    '...oaaaao.......',
    '...oahaao.......',
    '...oaaaao.......',
    '...oaaaao.......',
    '...oaaaao.......',
    '...oaaaao.......',
    '...oaaaao.......',
    '...oaaacao......',
    '...oaaaaoooo....',
    '...oaaaaaaaao...',
    '...oAaaaaaaAo...',
    '...ooooooooo....',
    '................',
    '................',
  ],
  ring: [
    '................',
    '.......oo.......',
    '......occo......',
    '.....occcco.....',
    '......occo......',
    '.....oo..oo.....',
    '....oAooooAo....',
    '...oAao..oaAo...',
    '...oAo....oAo...',
    '...oAo....oAo...',
    '...oAao..oaAo...',
    '....oAooooAo....',
    '.....oooooo.....',
    '................',
    '................',
    '................',
  ],
  amulet: [
    '................',
    '..oo........oo..',
    '.oAo........oAo.',
    '.oAo........oAo.',
    '..oAo......oAo..',
    '...oAo....oAo...',
    '....oAo..oAo....',
    '.....oAooAo.....',
    '......oooo......',
    '.....occcco.....',
    '.....occcco.....',
    '....oAaaaaAo....',
    '.....oAAAAo.....',
    '......oooo......',
    '................',
    '................',
  ],
};

const PALETTES: Record<string, string>[] = [
  // 0 — worn / rusty
  {
    o: '#100e18',
    a: '#8d8aa3',
    A: '#5f5c73',
    h: '#b9b6c9',
    c: '#6f6a86',
    g: '#6b4f38',
  },
  // 1 — tempered steel
  {
    o: '#100e18',
    a: '#b7c4d8',
    A: '#7f8ea8',
    h: '#e6eefc',
    c: '#93a6c4',
    g: '#7a5a3a',
  },
  // 2 — gilded
  {
    o: '#100e18',
    a: '#cfd8e6',
    A: '#8fa3c8',
    h: '#ffffff',
    c: '#e3b34f',
    g: '#7a5a3a',
  },
  // 3 — ember
  {
    o: '#1a0f0a',
    a: '#a9856a',
    A: '#6d4f3a',
    h: '#e0c3a3',
    c: '#ff8a3d',
    g: '#5c3a22',
  },
  // 4 — void
  {
    o: '#0d0918',
    a: '#7a5fb0',
    A: '#4b3579',
    h: '#c9b2ff',
    c: '#ff6b8a',
    g: '#3a2b52',
  },
  // 5 — cinder (Emberfall)
  {
    o: '#1a0b08',
    a: '#c97a4a',
    A: '#8a4a2a',
    h: '#ffd0a8',
    c: '#ffb066',
    g: '#5c3320',
  },
];

export interface ItemIconPath {
  color: string;
  d: string;
}

const cache = new Map<string, ItemIconPath[]>();

/** One path per colour, so a whole icon is only a handful of DOM nodes. */
export function itemIconPaths(slot: Slot, name: string): ItemIconPath[] {
  const key = `${slot}:${name}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const rows = ICON_ROWS[slot];
  const index = Math.max(0, ITEM_NAMES[slot].indexOf(name));
  const palette = PALETTES[Math.min(index, PALETTES.length - 1)];
  const groups = new Map<string, string[]>();

  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const color = palette[row[x]];
      if (!color) continue;
      const list = groups.get(color) ?? [];
      list.push(`M${x} ${y}h1v1h-1z`);
      groups.set(color, list);
    }
  });

  const paths = [...groups].map(([color, d]) => ({ color, d: d.join('') }));
  cache.set(key, paths);
  return paths;
}

/** Exposed for tests: the raw map a slot uses. */
export function itemIconRows(slot: Slot): string[] {
  return ICON_ROWS[slot];
}
