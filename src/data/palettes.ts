/**
 * Cosmetic palettes for the knight.
 *
 * A palette is an accent-only recolour layered over the outfit (or the base
 * sprite): it never touches stats, drop rates, or combat. Each one is earned by
 * a milestone the player already chases, so the wardrobe has a second thing to
 * show off besides the outfit tier itself.
 */

/** Colour slots a palette may repaint; the outfit owns the armour steel. */
export type PaletteSlot =
  | 'gold'
  | 'goldLight'
  | 'goldDark'
  | 'crimson'
  | 'crimsonDark'
  | 'leather'
  | 'leatherDark';

export type PaletteId = 'ashen' | 'champion' | 'trialborn' | 'emberfall' | 'stormtouched';

export interface PaletteInfo {
  id: PaletteId;
  name: string;
  /** What earns it, shown while the palette is still locked. */
  unlock: string;
  /** Swatch colour for the wardrobe chip. */
  swatch: string;
  colors: Partial<Record<PaletteSlot, string>>;
}

/**
 * Five palettes, one per milestone. `ashen` is deliberately the quietest, so a
 * first Ascension reads as "the knight came back changed" rather than a clown
 * suit; the last two are loud because stage 60 and a full Emberfall week are
 * loud achievements.
 */
export const PALETTES: PaletteInfo[] = [
  {
    id: 'ashen',
    name: 'Ashen',
    unlock: 'Ascend once',
    swatch: '#b9b3c8',
    colors: {
      gold: '#b9b3c8',
      goldLight: '#e4e0f0',
      goldDark: '#7f7a8c',
      crimson: '#5c5468',
      crimsonDark: '#332e3c',
      leather: '#333039',
      leatherDark: '#1e1c23',
    },
  },
  {
    id: 'champion',
    name: 'Champion',
    unlock: 'Reach Champion in the arena',
    swatch: '#3f6fd8',
    colors: {
      gold: '#ffd75e',
      goldLight: '#fff0b0',
      goldDark: '#b08320',
      crimson: '#2f5fbf',
      crimsonDark: '#1d3a7a',
      leather: '#26324a',
      leatherDark: '#151d2c',
    },
  },
  {
    id: 'trialborn',
    name: 'Trialborn',
    unlock: 'Clear trial floor 10',
    swatch: '#a06bf0',
    colors: {
      gold: '#e7c9ff',
      goldLight: '#f8edff',
      goldDark: '#8f5fc0',
      crimson: '#6b3fae',
      crimsonDark: '#422669',
      leather: '#33284a',
      leatherDark: '#1e1730',
    },
  },
  {
    id: 'emberfall',
    name: 'Emberfall',
    unlock: 'Claim an Emberfall cache',
    swatch: '#ff8a3d',
    colors: {
      gold: '#ff8a3d',
      goldLight: '#ffd0a8',
      goldDark: '#a8421c',
      crimson: '#8a2b1c',
      crimsonDark: '#4f160f',
      leather: '#2a1a14',
      leatherDark: '#170d0a',
    },
  },
  {
    id: 'stormtouched',
    name: 'Stormtouched',
    unlock: 'Farm stage 60',
    swatch: '#57efdc',
    colors: {
      gold: '#57efdc',
      goldLight: '#c9fff8',
      goldDark: '#2f9d99',
      crimson: '#1f6f8a',
      crimsonDark: '#123f4f',
      leather: '#22323c',
      leatherDark: '#131f26',
    },
  },
];

const BY_ID = new Map(PALETTES.map((palette) => [palette.id, palette]));

export function paletteById(id: string | null | undefined): PaletteInfo | undefined {
  if (!id) return undefined;
  return BY_ID.get(id as PaletteId);
}
