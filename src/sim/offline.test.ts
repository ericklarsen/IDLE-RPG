import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { BattleSim } from './battle';
import { offlineDps, planOffline, projectLevels, stageRates } from './offline';
import { normalizeSkills } from './skills';
import type { Item, SaveData } from './types';

function makeWeapon(overrides: Partial<Item> = {}): Item {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'epic',
    name: 'Test Blade',
    level: 20,
    atk: 2000,
    hp: 200,
    def: 20,
    power: 6000,
    salvage: 50,
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
    version: 6,
    level: 1,
    exp: 0,
    gold: 0,
    maxStage: 1,
    kills: 0,
    inventory: [],
    equipped: {},
    itemSeq: 0,
    ...overrides,
  };
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('offline planning', () => {
  it('stage rates memasukkan reward boss, core, dan book', () => {
    const rates = stageRates(10);
    expect(rates.hp).toBeGreaterThan(0);
    expect(rates.gold).toBeGreaterThan(0);
    expect(rates.cores).toBeGreaterThan(0);
    expect(rates.books).toBeGreaterThan(0);
    expect(rates.dropRate).toBeGreaterThan(0.2);
  });

  it('membatasi waktu ke 8 jam dan memakai efisiensi 85%', () => {
    const rates = stageRates(1);
    const plan = planOffline({
      elapsedMs: 20 * 60 * 60 * 1000,
      stage: 1,
      level: 1,
      exp: 0,
      dps: 100,
      rates,
      goldPct: 0,
    });

    expect(plan).not.toBeNull();
    expect(plan?.seconds).toBe(8 * 60 * 60);
    expect(BALANCE.offlineEfficiency).toBe(0.85);
    expect(plan?.capped).toBe(true);
    expect(plan?.kills).toBeGreaterThan(0);
  });

  it('tidak menghitung waktu di bawah satu menit', () => {
    const plan = planOffline({
      elapsedMs: 30_000,
      stage: 1,
      level: 1,
      exp: 0,
      dps: 100,
      rates: stageRates(1),
      goldPct: 0,
    });
    expect(plan).toBeNull();
  });

  it('offlineDps menambahkan kontribusi wisp', () => {
    const input = {
      attackPower: 100,
      atkSpeed: 1,
      crit: 0,
      critDmg: 1.5,
      def: 0,
      skills: normalizeSkills(),
      attuned: null,
      elemBonus: 0,
      enemyElement: 'fire' as const,
    };
    const baseDps = offlineDps(input);

    expect(offlineDps({ ...input, petDps: 42 })).toBeCloseTo(baseDps + 42, 5);
  });

  it('projectLevels menghitung level dari EXP', () => {
    expect(projectLevels(1, 0, 0)).toBe(0);
    expect(projectLevels(1, 0, 25)).toBe(1);
    expect(projectLevels(1, 0, 1000)).toBeGreaterThan(1);
  });
});

describe('BattleSim offline', () => {
  it('estimasi 8 jam menghasilkan report lengkap', () => {
    const sim = new BattleSim(makeSave({ maxStage: 5 }), seeded(2));
    const report = sim.estimateOffline(8 * 60 * 60 * 1000);

    expect(report).not.toBeNull();
    expect(report?.seconds).toBe(8 * 60 * 60);
    expect(report?.capped).toBe(true);
    expect(report?.kills).toBeGreaterThan(0);
    expect(report?.gold).toBeGreaterThan(0);
    expect(report?.exp).toBeGreaterThan(0);
    expect(report?.levels).toBeGreaterThan(0);
    expect(report?.items.length).toBeLessThanOrEqual(BALANCE.offlineItemCap);
  });

  it('applyOffline menambah gold, EXP, level, dan item', () => {
    const sim = new BattleSim(makeSave({ maxStage: 5, gold: 100 }), seeded(2));
    const report = sim.estimateOffline(4 * 60 * 60 * 1000);
    expect(report).not.toBeNull();

    const goldBefore = sim.gold;
    const levelBefore = sim.level;
    sim.applyOffline(report!);

    expect(sim.gold).toBeGreaterThan(goldBefore);
    expect(sim.level).toBeGreaterThan(levelBefore);
    expect(sim.inventory.length).toBe(report!.items.length);
  });

  it('tidak ada report untuk waktu singkat', () => {
    const sim = new BattleSim(makeSave(), seeded(2));
    expect(sim.estimateOffline(30_000)).toBeNull();
  });

  it('wisp ikut menaikkan hasil offline', () => {
    const save = makeSave({
      level: 40,
      maxStage: 30,
      farmStage: 30,
      pets: { active: 'ember', kinds: { ember: { level: 10, maxLevel: 10, eggs: 0 } } },
      equipped: { weapon: makeWeapon() },
    });
    const withWisp = new BattleSim(save, seeded(3));
    const withoutWisp = new BattleSim(save, seeded(3));
    withoutWisp.setActivePet(null);

    const boosted = withWisp.estimateOffline(4 * 60 * 60 * 1000);
    const plain = withoutWisp.estimateOffline(4 * 60 * 60 * 1000);

    expect(boosted!.kills).toBeGreaterThan(plain!.kills);
  });

  it('boost gold ikut menaikkan hasil offline', () => {
    const base = new BattleSim(makeSave({ maxStage: 5 }), seeded(4));
    const boosted = new BattleSim(
      makeSave({ maxStage: 5, boosts: { fortune: 10 } }),
      seeded(4),
    );

    const baseReport = base.estimateOffline(2 * 60 * 60 * 1000);
    const boostedReport = boosted.estimateOffline(2 * 60 * 60 * 1000);
    expect(boostedReport!.gold).toBeGreaterThan(baseReport!.gold);
  });

  it('inventory penuh tidak overflow saat klaim', () => {
    const sim = new BattleSim(makeSave({ maxStage: 5 }), seeded(2));
    sim.inventory = Array.from({ length: 24 }, (_, index) => ({
      id: `it_full_${index}`,
      slot: 'ring',
      rarity: 'common',
      name: 'Filler',
      level: 1,
      atk: 1,
      hp: 1,
      def: 1,
      power: 5,
      salvage: 2,
      enhance: 0,
      pity: 0,
      refines: 0,
      enchants: 0,
      substats: [],
      runes: [null, null, null],
    }));

    const report = sim.estimateOffline(2 * 60 * 60 * 1000);
    const goldBefore = sim.gold;
    sim.applyOffline(report!);

    expect(sim.inventory).toHaveLength(24);
    expect(sim.gold).toBeGreaterThan(goldBefore);
  });
});
