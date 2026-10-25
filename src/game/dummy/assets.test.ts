import { describe, expect, it } from 'vitest';
import { PALETTES } from '../../data/palettes';
import { heroGridFor, heroTextureKey, SPRITE_BUILDERS, SPRITE_SIZE } from './assets';

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
    for (const key of ['hero', 'slime', 'skeleton', 'goblin', 'demon', 'wraith', 'bat']) {
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

  it('draws each creature with its own colours', () => {
    const signatures = new Map<string, string>();
    for (const [key, build] of Object.entries(SPRITE_BUILDERS)) {
      const signature = [...new Set(build().rows().flat())].sort().join(',');
      expect(signatures.has(signature), key).toBe(false);
      signatures.set(signature, key);
    }
  });
});
