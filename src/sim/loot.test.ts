import { describe, expect, it } from 'vitest';
import { SLOTS } from '../data/items';
import { createItem, itemStatLine, rollRarity } from './loot';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('loot', () => {
  it('menghasilkan item dengan slot dan stat valid', () => {
    const item = createItem(10, 'normal', seeded(1), 'it_1');
    expect(SLOTS).toContain(item.slot);
    expect(item.level).toBe(10);
    expect(item.power).toBeGreaterThan(0);
    expect(item.salvage).toBeGreaterThan(0);
    expect(item.hp).toBeGreaterThan(0);
    expect(item.enhance).toBe(0);
    expect(item.substats.length).toBeGreaterThan(0);
    expect(itemStatLine(item).length).toBeGreaterThan(0);
  });

  it('boss selalu memberi Epic atau lebih', () => {
    const ranks = new Set<string>();
    const rng = seeded(99);
    for (let i = 0; i < 40; i += 1) {
      ranks.add(rollRarity('boss', rng));
    }
    expect(ranks.has('common')).toBe(false);
    expect(ranks.has('rare')).toBe(false);
    expect([...ranks].every((rank) => ['epic', 'legendary', 'mythic'].includes(rank))).toBe(true);
  });

  it('item level tinggi punya stat lebih besar', () => {
    const low = createItem(1, 'normal', seeded(3), 'it_1');
    const high = createItem(20, 'normal', seeded(3), 'it_2');
    expect(high.power).toBeGreaterThan(low.power);
  });
});
