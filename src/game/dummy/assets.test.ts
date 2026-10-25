import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../../data/characters';
import { PALETTES } from '../../data/palettes';
import {
  heroGridFor,
  heroTextureKey,
  mateGrid,
  mateTextureKey,
  SPRITE_BUILDERS,
  SPRITE_SIZE,
} from './assets';

const OUTLINE = '#0d0b14';

describe('dummy sprites', () => {
  it('builds every sprite on the documented grid', () => {
    for (const [key, build] of Object.entries(SPRITE_BUILDERS)) {
      const rows = build().rows();
      expect(rows, key).toHaveLength(SPRITE_SIZE);
      for (const row of rows) expect(row, key).toHaveLength(SPRITE_SIZE);
    }
  });

  it('fills a readable amount of pixels and keeps colours valid', () => {
    for (const [key, build] of Object.entries(SPRITE_BUILDERS)) {
      const rows = build().rows();
      const filled = rows.flat().filter((cell): cell is string => Boolean(cell));
      if (key === 'blade') {
        expect(filled.length, key).toBeGreaterThan(60);
      } else {
        expect(filled.length, key).toBeGreaterThan(200);
      }
      for (const color of filled) expect(color, key).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('outlines every sprite so silhouettes read against the background', () => {
    for (const [key, build] of Object.entries(SPRITE_BUILDERS)) {
      const colors = new Set(build().rows().flat());
      expect(colors.has(OUTLINE), key).toBe(true);
    }
  });

  it('keeps creatures anchored to the bottom of the cell', () => {
    for (const key of [
      'hero',
      'slime',
      'skeleton',
      'goblin',
      'demon',
      'wraith',
      'bat',
      ...CHARACTERS.map((entry) => mateTextureKey(entry.id)),
    ]) {
      const rows = SPRITE_BUILDERS[key]().rows();
      const lowestFilled = rows.reduce(
        (lowest, row, y) => (row.some(Boolean) ? y : lowest),
        -1,
      );
      expect(lowestFilled, key).toBeGreaterThan(SPRITE_SIZE - 4);
    }
  });

  it('repaints the hero for every costume tier', () => {
    const base = new Set(SPRITE_BUILDERS.hero().rows().flat());
    for (const tier of ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'emerald']) {
      const key = `hero-${tier}`;
      expect(SPRITE_BUILDERS[key], key).toBeDefined();

      const colors = new Set(SPRITE_BUILDERS[key]().rows().flat());
      expect(colors.has(OUTLINE), key).toBe(true);
      // Each tier must introduce at least one colour the base knight lacks.
      expect([...colors].some((color) => color !== null && !base.has(color)), key).toBe(true);
    }
  });

  it('repaints the knight for every palette and composes it over the outfit', () => {
    const base = new Set(SPRITE_BUILDERS.hero().rows().flat());

    for (const palette of PALETTES) {
      const colors = new Set(heroGridFor(null, palette.id).rows().flat());
      expect(colors.has(OUTLINE), palette.id).toBe(true);
      // Each accent must introduce a colour the plain knight lacks.
      expect(
        [...colors].some((color) => color !== null && !base.has(color)),
        palette.id,
      ).toBe(true);
      expect(heroTextureKey(null, palette.id)).toBe(`hero-${palette.id}`);
    }

    // The outfit paints the armour, the palette the trim: neither hides the other.
    const outfitOnly = heroGridFor('silver', null).rows().flat().join(',');
    const accentOnly = heroGridFor(null, 'ashen').rows().flat().join(',');
    const both = heroGridFor('silver', 'ashen').rows().flat().join(',');
    expect(both).not.toBe(outfitOnly);
    expect(both).not.toBe(accentOnly);

    expect(heroTextureKey('silver', 'ashen')).toBe('hero-silver-ashen');
    // Unknown palettes fall back to the plain outfit texture.
    expect(heroTextureKey('silver', 'ghost')).toBe('hero-silver');
  });

  it('builds a distinct arena sprite for every roster character', () => {
    const hero = SPRITE_BUILDERS.hero().rows().flat().join(',');
    const seen = new Map<string, string>();

    for (const entry of CHARACTERS) {
      const key = mateTextureKey(entry.id);
      // The scene swaps to this exact key, so a missing builder would render a
      // green placeholder box in the arena.
      expect(SPRITE_BUILDERS[key], key).toBeDefined();

      const grid = SPRITE_BUILDERS[key]();
      const rows = grid.rows();
      expect(rows, key).toHaveLength(SPRITE_SIZE);
      expect(new Set(rows.flat()).has(OUTLINE), key).toBe(true);

      const signature = rows.flat().join(',');
      expect(signature, key).not.toBe(hero);
      expect(seen.has(signature), key).toBe(false);
      seen.set(signature, key);
    }

    // Builders and the helper the scene calls must agree on the key.
    expect(mateGrid('mage').rows().flat().join(',')).toBe(
      SPRITE_BUILDERS[mateTextureKey('mage')]().rows().flat().join(','),
    );
  });

  it('gives each mate headgear the knight does not wear', () => {
    // The helm sits on rows 2-10, so a hood or hat has to repaint that band.
    const helmBand = (rows: (string | null)[][]): string =>
      rows.slice(0, 11).flat().join(',');

    const knight = helmBand(mateGrid('knight').rows());
    for (const id of ['ranger', 'cleric', 'mage', 'rogue'] as const) {
      expect(helmBand(mateGrid(id).rows()), id).not.toBe(knight);
    }

    // The rogue's hood covers the mouth; the ranger's leaves the face open.
    const rangerFace = mateGrid('ranger').rows()[9];
    const rogueFace = mateGrid('rogue').rows()[9];
    expect(rogueFace).not.toEqual(rangerFace);
  });

  it('draws each creature with its own colours', () => {
    const signatures = new Map<string, string>();
    for (const [key, build] of Object.entries(SPRITE_BUILDERS)) {
      const signature = [...new Set(build().rows().flat())].sort().join(',');
      expect(signatures.has(signature), key).toBe(false);
      signatures.set(signature, key);
    }
  });
});
