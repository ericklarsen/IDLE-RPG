import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { emptyEquipped } from '../data/items';
import type { Item, SubStat } from './types';
import {
  SUBSTAT_KEYS,
  enhanceChanceFor,
  enhanceCostFor,
  gearBonuses,
  gearScoreOf,
  itemPower,
  itemStats,
  normalizeItem,
  refineCostFor,
  refineSubstats,
  rollSubstats,
  substatQuality,
  substatSlots,
  substatText,
  substatTier,
} from './upgrade';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'epic',
    name: 'Test Blade',
    level: 10,
    atk: 20,
    hp: 40,
    def: 4,
    power: 100,
    salvage: 20,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
    ...overrides,
  };
}

describe('upgrade', () => {
  it('biaya enhance naik per level dan per item level', () => {
    const item = makeItem();
    expect(enhanceCostFor(makeItem({ enhance: 3 }))).toBeGreaterThan(enhanceCostFor(item));
    expect(enhanceCostFor(makeItem({ level: 30 }))).toBeGreaterThan(enhanceCostFor(item));
    expect(enhanceCostFor(makeItem({ rarity: 'mythic' }))).toBeGreaterThan(
      enhanceCostFor(makeItem({ rarity: 'common' })),
    );
  });

  it('peluang enhance turun setelah level aman lalu naik karena pity', () => {
    expect(enhanceChanceFor(makeItem({ enhance: 0 }))).toBe(1);
    expect(enhanceChanceFor(makeItem({ enhance: BALANCE.enhanceGuaranteed }))).toBe(1);
    const high = enhanceChanceFor(makeItem({ enhance: 12 }));
    const withPity = enhanceChanceFor(makeItem({ enhance: 12, pity: 3 }));
    expect(high).toBeLessThan(1);
    expect(withPity).toBeGreaterThan(high);
    expect(enhanceChanceFor(makeItem({ enhance: 14, pity: 99 }))).toBeLessThanOrEqual(1);
    expect(enhanceChanceFor(makeItem({ enhance: 15 }))).toBe(0);
  });

  it('enhance menaikkan stat dan power item', () => {
    const base = makeItem();
    const upgraded = makeItem({ enhance: 5 });
    expect(itemStats(upgraded).atk).toBeGreaterThan(itemStats(base).atk);
    expect(itemPower(upgraded)).toBeGreaterThan(itemPower(base));
  });

  it('substat diisi sesuai rarity tanpa duplikat', () => {
    const rng = seeded(4);
    for (const rarity of ['common', 'rare', 'epic', 'legendary', 'mythic'] as const) {
      const item = makeItem({ rarity });
      const subs = rollSubstats(item, rng);
      expect(subs).toHaveLength(substatSlots(rarity));
      expect(new Set(subs.map((sub) => sub.key)).size).toBe(subs.length);
      expect(subs.every((sub) => sub.value > 0)).toBe(true);
      expect(subs.every((sub) => SUBSTAT_KEYS.includes(sub.key))).toBe(true);
    }
  });

  it('refine mempertahankan substat terkunci dan meroll yang lain', () => {
    const locked: SubStat = { key: 'atkPct', value: 0.04, locked: true };
    const free: SubStat = { key: 'crit', value: 0.01, locked: false };
    const item = makeItem({ rarity: 'legendary', substats: [locked, free] });
    const refined = refineSubstats(item, seeded(9));

    expect(refined).toHaveLength(3);
    expect(refined[0]).toEqual(locked);
    expect(refined.some((sub) => sub.key === 'atkPct')).toBe(true);
  });

  it('biaya refine tetap walau item sudah sering di-refine', () => {
    const base = makeItem({ refines: 0 });
    expect(refineCostFor(makeItem({ refines: 20 }))).toBe(refineCostFor(base));
    // Level and rarity still matter: better gear costs more per attempt.
    expect(refineCostFor(makeItem({ level: 40 }))).toBeGreaterThan(refineCostFor(base));
  });

  it('gear bonus menerapkan persen ATK/HP, crit, speed, dan flat DEF', () => {
    const equipped = emptyEquipped();
    equipped.weapon = makeItem({
      enhance: 5,
      substats: [
        { key: 'atkPct', value: 0.05, locked: false },
        { key: 'hpPct', value: 0.05, locked: false },
        { key: 'crit', value: 0.02, locked: false },
      ],
    });
    equipped.ring = makeItem({
      id: 'it_2',
      slot: 'ring',
      substats: [
        { key: 'speed', value: 0.03, locked: false },
        { key: 'def', value: 7, locked: false },
      ],
    });

    const bonus = gearBonuses(equipped);
    expect(bonus.atk).toBeCloseTo(itemStats(equipped.weapon!).atk + itemStats(equipped.ring!).atk, 5);
    expect(bonus.atkPct).toBeCloseTo(0.05, 5);
    expect(bonus.hpPct).toBeCloseTo(0.05, 5);
    expect(bonus.crit).toBeCloseTo(0.02, 5);
    expect(bonus.speed).toBeCloseTo(0.03, 5);
    expect(bonus.def).toBeGreaterThan(7);
    expect(gearScoreOf(equipped)).toBeGreaterThan(0);
  });

  it('normalizeItem mengisi default untuk item save lama', () => {
    const legacy = {
      id: 'it_1',
      slot: 'weapon',
      rarity: 'rare',
      name: 'Old Blade',
      level: 3,
      atk: 5,
      hp: 9,
      def: 1,
      power: 20,
      salvage: 4,
    } as Item;
    const normalized = normalizeItem(legacy);
    expect(normalized.enhance).toBe(0);
    expect(normalized.pity).toBe(0);
    expect(normalized.substats).toEqual([]);
  });

  it('tier substat mengikuti posisi roll di dalam rentangnya', () => {
    const common = makeItem({ rarity: 'common' });
    const tier = (value: number) =>
      substatTier({ key: 'atkPct', value, locked: false }, common);

    expect(tier(0.0485)).toBe('SS');
    expect(tier(0.045)).toBe('S');
    expect(tier(0.039)).toBe('A');
    expect(tier(0.035)).toBe('B');
    expect(tier(0.025)).toBe('C');
    expect(substatQuality({ key: 'atkPct', value: 0.05, locked: false }, common)).toBeCloseTo(1, 5);

    // Flat DEF rolls on its own 0.7–1.3 band around the item level.
    expect(substatTier({ key: 'def', value: 5, locked: false }, common)).toBe('SS');
    expect(substatTier({ key: 'def', value: 4, locked: false }, common)).toBe('B');

    // Rarity multiplier is normalised out of the quality.
    const epic = makeItem({ rarity: 'epic' });
    expect(substatTier({ key: 'atkPct', value: 0.045 * 1.3, locked: false }, epic)).toBe('S');
  });

  it('substatText memformat persen dan flat DEF', () => {
    expect(substatText({ key: 'atkPct', value: 0.034, locked: false })).toBe('+3.4% ATK');
    expect(substatText({ key: 'def', value: 6.4, locked: false })).toBe('+6 DEF');
  });
});
