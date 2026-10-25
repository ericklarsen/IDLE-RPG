import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { emptyEquipped } from '../data/items';
import { BattleSim } from './battle';
import {
  emptyRefine,
  migrateRefine,
  normalizeRefine,
  refineCap,
  refineCostFor,
  refineResonance,
} from './refine';
import type { Item, SaveData, Slot } from './types';
import { TIER_MIN, TIER_ORDER, substatTier } from './upgrade';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeWeapon(overrides: Partial<Item> = {}): Item {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'rare',
    name: 'Test Blade',
    level: 5,
    atk: 10,
    hp: 20,
    def: 2,
    power: 50,
    salvage: 12,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
    ...overrides,
  };
}

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 23,
    level: 1,
    exp: 0,
    gold: 0,
    maxStage: 1,
    kills: 0,
    inventory: [],
    equipped: {},
    itemSeq: 10,
    ...overrides,
  };
}

describe('refine model', () => {
  it('charges a flat price that ignores how often the item was rolled', () => {
    const base = refineCostFor(makeWeapon());
    expect(refineCostFor(makeWeapon({ refines: 5 }))).toBe(base);
    expect(refineCostFor(makeWeapon({ refines: 500 }))).toBe(base);
  });

  it('prices attempts by item level and rarity', () => {
    const base = refineCostFor(makeWeapon());
    expect(refineCostFor(makeWeapon({ level: 40 }))).toBeGreaterThan(base);
    expect(refineCostFor(makeWeapon({ rarity: 'legendary' }))).toBeGreaterThan(base);
  });

  it('raises the roll cap with the slot level, never past SS', () => {
    expect(refineCap(0)).toBe(BALANCE.refineCapBase);
    expect(refineCap(10)).toBeGreaterThan(refineCap(0));
    expect(refineCap(BALANCE.refineMax)).toBe(1);
    // A level-0 slot cannot reach tier A, so auto-refine must refuse up front.
    expect(refineCap(0)).toBeLessThan(TIER_MIN.A);
    expect(refineCap(4)).toBeGreaterThanOrEqual(TIER_MIN.A);
  });

  it('clamps stored levels, progress and pity', () => {
    const map = normalizeRefine({
      weapon: { level: 999, progress: 999, pity: 999 },
      helm: { level: -5, progress: -1, pity: -1 },
    });
    expect(map.weapon.level).toBe(BALANCE.refineMax);
    expect(map.weapon.progress).toBe(0);
    expect(map.weapon.pity).toBe(BALANCE.refinePity);
    expect(map.helm).toEqual({ level: 0, progress: 0, pity: 0 });
  });

  it('converts old per-item roll counts into slot levels', () => {
    const equipped = emptyEquipped();
    equipped.weapon = makeWeapon({ refines: 6 });
    const migrated = migrateRefine(equipped);
    expect(migrated.weapon.level).toBe(6);
    expect(migrated.helm.level).toBe(0);

    // Existing slot data wins over the item counter.
    const kept = migrateRefine(equipped, {
      weapon: { level: 2, progress: 3, pity: 1 },
    });
    expect(kept.weapon).toEqual({ level: 2, progress: 3, pity: 1 });
  });

  it('keys resonance off the weakest slot so levels must be spread', () => {
    expect(refineResonance(emptyRefine())).toMatchObject({ level: 0, atkPct: 0, next: 10 });

    const uneven = emptyRefine();
    uneven.weapon = { level: 20, progress: 0, pity: 0 };
    expect(refineResonance(uneven).level).toBe(0);

    const spread = emptyRefine();
    for (const slot of Object.keys(spread) as Slot[]) {
      spread[slot] = { level: 15, progress: 0, pity: 0 };
    }
    expect(refineResonance(spread)).toMatchObject({ level: 15, atkPct: 0.06, next: 20 });

    for (const slot of Object.keys(spread) as Slot[]) {
      spread[slot] = { level: 20, progress: 0, pity: 0 };
    }
    expect(refineResonance(spread)).toMatchObject({ level: 20, crit: 0.03, next: 0 });
  });
});

describe('refine in battle', () => {
  it('fills the bar every attempt and levels the slot up at the threshold', () => {
    const item = makeWeapon({ substats: [{ key: 'atkPct', value: 0.02, locked: false }] });
    const sim = new BattleSim(
      makeSave({ gold: 10_000_000, equipped: { weapon: item } }),
      seeded(3),
    );

    const cost = refineCostFor(item);
    const first = sim.refineItem('it_1');
    expect(first.ok).toBe(true);
    expect(first.cost).toBe(cost);
    expect(first.level).toBe(0);
    expect(first.progress).toBe(1);

    for (let i = 1; i < BALANCE.refineProgress; i += 1) sim.refineItem('it_1');
    const state = sim.refine.weapon;
    expect(state.level).toBe(1);
    expect(state.progress).toBe(0);

    // Ten attempts cost the same ten times over: no escalating bill.
    expect(10_000_000 - sim.gold).toBe(cost * BALANCE.refineProgress);
  });

  it('never raises the price between attempts', () => {
    const item = makeWeapon({ substats: [{ key: 'atkPct', value: 0.02, locked: false }] });
    const sim = new BattleSim(
      makeSave({ gold: 10_000_000, equipped: { weapon: item } }),
      seeded(4),
    );

    const costs = [sim.refineItem('it_1').cost, sim.refineItem('it_1').cost, sim.refineItem('it_1').cost];
    expect(new Set(costs).size).toBe(1);
  });

  it('stops at the gold gate without charging or rolling', () => {
    const item = makeWeapon({ substats: [{ key: 'atkPct', value: 0.02, locked: false }] });
    const sim = new BattleSim(makeSave({ gold: 0, equipped: { weapon: item } }), seeded(5));

    const outcome = sim.refineItem('it_1');
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('gold');
    expect(sim.equipped.weapon?.refines).toBe(0);
    expect(sim.gold).toBe(0);
  });

  it('forces an S line when pity fills, so a dry streak always ends', () => {
    const item = makeWeapon({ substats: [{ key: 'atkPct', value: 0.02, locked: false }] });
    const sim = new BattleSim(
      makeSave({ gold: 10_000_000, equipped: { weapon: item } }),
      // Lowest possible rolls keep pity climbing.
      () => 0,
    );

    for (let i = 0; i < BALANCE.refinePity - 1; i += 1) sim.refineItem('it_1');
    expect(sim.refine.weapon.pity).toBe(BALANCE.refinePity - 1);

    const forced = sim.refineItem('it_1');
    expect(forced.forced).toBe(true);
    const weapon = sim.equipped.weapon!;
    expect(
      Math.max(...weapon.substats.map((sub) => TIER_ORDER[substatTier(sub, weapon)])),
    ).toBeGreaterThanOrEqual(TIER_ORDER.S);
    expect(sim.refine.weapon.pity).toBe(0);
  });

  it('refuses auto-refine above the cap instead of burning gold', () => {
    const item = makeWeapon({ substats: [{ key: 'atkPct', value: 0.02, locked: false }] });
    const sim = new BattleSim(
      makeSave({ gold: 10_000_000, equipped: { weapon: item } }),
      seeded(6),
    );

    const outcome = sim.refineToTier('it_1', 'A');
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('cap');
    expect(sim.gold).toBe(10_000_000);
  });

  it('keeps slot levels when the equipped item is swapped', () => {
    const item = makeWeapon({ substats: [{ key: 'atkPct', value: 0.02, locked: false }] });
    const sim = new BattleSim(
      makeSave({ gold: 10_000_000, equipped: { weapon: item } }),
      seeded(7),
    );
    sim.refine.weapon = { level: 12, progress: 4, pity: 2 };

    const replacement = makeWeapon({
      id: 'it_2',
      name: 'New Blade',
      refines: 0,
      substats: [{ key: 'hpPct', value: 0.02, locked: false }],
    });
    sim.inventory.push(replacement);
    expect(sim.equip('it_2')).toBe(true);

    expect(sim.equipped.weapon?.id).toBe('it_2');
    expect(sim.refine.weapon).toEqual({ level: 12, progress: 4, pity: 2 });
    expect(refineCap(sim.refine.weapon.level)).toBeGreaterThanOrEqual(TIER_MIN.A);
  });
});
