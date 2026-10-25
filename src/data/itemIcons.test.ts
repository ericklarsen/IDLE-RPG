import { describe, expect, it } from 'vitest';
import { itemIconPaths, itemIconRows } from './itemIcons';
import { ITEM_NAMES, SLOTS } from './items';

const SYMBOLS = new Set(['.', 'o', 'a', 'A', 'h', 'c', 'g']);

describe('item icons', () => {
  it('draws every slot on a 16x16 grid with known symbols', () => {
    for (const slot of SLOTS) {
      const rows = itemIconRows(slot);
      expect(rows, slot).toHaveLength(16);
      for (const row of rows) {
        expect(row, slot).toHaveLength(16);
        for (const symbol of row) expect(SYMBOLS, `${slot}: ${symbol}`).toContain(symbol);
      }
      expect(rows.join(''), slot).not.toBe('.'.repeat(256));
    }
  });

  it('gives every item name non-empty paths', () => {
    for (const slot of SLOTS) {
      for (const name of ITEM_NAMES[slot]) {
        const paths = itemIconPaths(slot, name);
        expect(paths.length, `${slot} ${name}`).toBeGreaterThan(0);
        for (const path of paths) expect(path.d).toMatch(/^M\d+ \d+h1v1h-1z/);
      }
    }
  });

  it('uses a distinct palette tier per name within a slot', () => {
    for (const slot of SLOTS) {
      const signatures = ITEM_NAMES[slot].map((name) =>
        itemIconPaths(slot, name)
          .map((path) => path.color)
          .sort()
          .join(','),
      );
      expect(new Set(signatures).size, slot).toBe(ITEM_NAMES[slot].length);
    }
  });

  it('caches by slot and name but separates different items', () => {
    const first = itemIconPaths('weapon', 'Rusty Shortsword');
    expect(itemIconPaths('weapon', 'Rusty Shortsword')).toBe(first);
    expect(itemIconPaths('weapon', 'Void Reaver')).not.toBe(first);
    expect(itemIconPaths('helm', 'Rusty Shortsword')).not.toBe(first);
  });

  it('falls back to the worn tier for an unknown name', () => {
    expect(itemIconPaths('boots', 'Boots of Testing')).toEqual(itemIconPaths('boots', 'Worn Boots'));
  });
});
