import { describe, expect, it } from 'vitest';
import { shardReward } from '../data/ascension';
import { BattleSim } from './battle';
import { ascendBonuses, normalizeAscension } from './ascension';
import type { Item, SaveData } from './types';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'it_1',
    slot: 'ring',
    rarity: 'epic',
    name: 'Old Ring',
    level: 10,
    atk: 5,
    hp: 20,
    def: 2,
    power: 30,
    salvage: 10,
    enhance: 2,
    pity: 0,
    refines: 0,
    enchants: 1,
    substats: [],
    runes: [null, null, null],
    ...overrides,
  };
}

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 7,
    level: 30,
    exp: 0,
    gold: 5000,
    essence: 10,
    cores: 5,
    books: 5,
    maxStage: 1,
    kills: 100,
    inventory: [],
    equipped: {},
    itemSeq: 10,
    skills: {
      active: ['ember-burst', 'holy-mend', null],
      passive: 'keen-edge',
      levels: { 'ember-burst': 4 },
    },
    boosts: { offense: 2 },
    ascension: { count: 0, shards: 0, nodes: {} },
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

describe('ascension data', () => {
  it('shard reward naik sesuai best stage', () => {
    expect(shardReward(0)).toBe(0);
    expect(shardReward(50)).toBe(13);
    expect(shardReward(60)).toBeGreaterThan(shardReward(50));
  });

  it('normalize membatasi rank node dan mengabaikan node tidak dikenal', () => {
    const state = normalizeAscension({
      count: 2,
      shards: 5,
      nodes: { might: 99, 'long-haul': -3, unknown: 4 },
    });

    expect(state.count).toBe(2);
    expect(state.nodes.might).toBe(10);
    expect(state.nodes['long-haul']).toBe(0);
    expect(state.nodes.unknown).toBeUndefined();
  });

  it('bonus node dihitung dari rank', () => {
    const bonus = ascendBonuses({
      might: 5,
      vigor: 5,
      prosperity: 2,
      scavenger: 3,
      'head-start': 2,
      'long-haul': 1,
    });

    expect(bonus.atkPct).toBeCloseTo(0.4, 5);
    expect(bonus.hpPct).toBeCloseTo(0.4, 5);
    expect(bonus.goldPct).toBeCloseTo(0.16, 5);
    expect(bonus.dropChance).toBeCloseTo(0.09, 5);
    expect(bonus.startStage).toBe(5);
    expect(bonus.offlineCapSeconds).toBe(10 * 60 * 60);
  });
});

describe('BattleSim ascension', () => {
  it('tidak bisa ascend sebelum stage 50', () => {
    const sim = new BattleSim(makeSave({ maxStage: 49 }), seeded(1));
    const result = sim.ascend();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('stage');
    expect(sim.level).toBe(30);
  });

  it('ascend mereset run tapi menyimpan shard, node, dan loadout', () => {
    const sim = new BattleSim(
      makeSave({
        maxStage: 50,
        inventory: [makeItem()],
        equipped: { weapon: makeItem({ id: 'it_2', slot: 'weapon', name: 'Old Blade' }) },
        ascension: { count: 1, shards: 3, nodes: { 'head-start': 2, might: 2 } },
      }),
      seeded(1),
    );

    const result = sim.ascend();
    expect(result.ok).toBe(true);
    expect(result.stage).toBe(5);
    expect(result.shards).toBe(shardReward(50));

    expect(sim.level).toBe(1);
    expect(sim.gold).toBe(0);
    expect(sim.essence).toBe(0);
    expect(sim.cores).toBe(0);
    expect(sim.books).toBe(0);
    expect(sim.boosts.offense).toBe(0);
    expect(sim.inventory).toHaveLength(0);
    expect(sim.equipped.weapon?.name).toBe('Rusty Shortsword');
    expect(sim.equipped.ring).toBeNull();
    expect(sim.skills.active[0]).toBe('ember-burst');
    expect(sim.skills.passive).toBe('keen-edge');
    expect(sim.skills.levels['ember-burst']).toBe(1);

    expect(sim.stage).toBe(5);
    expect(sim.maxStage).toBe(5);
    expect(sim.ascension.count).toBe(2);
    expect(sim.ascension.shards).toBe(3 + shardReward(50));
    expect(sim.ascension.nodes['head-start']).toBe(2);
    expect(sim.ascension.nodes.might).toBe(2);
  });

  it('membeli node memakai shard dan menaikkan stat', () => {
    const sim = new BattleSim(
      makeSave({ ascension: { count: 0, shards: 5, nodes: {} } }),
      seeded(1),
    );
    const beforeAtk = sim.hero.atk;

    const result = sim.buyAscendNode('might');
    expect(result.ok).toBe(true);
    expect(result.level).toBe(1);
    expect(sim.ascension.shards).toBe(4);
    expect(sim.hero.atk).toBeGreaterThan(beforeAtk);
  });

  it('node gagal tanpa shard dan berhenti di rank maksimal', () => {
    const poor = new BattleSim(
      makeSave({ ascension: { count: 0, shards: 0, nodes: {} } }),
      seeded(1),
    );
    expect(poor.buyAscendNode('vigor').reason).toBe('shards');

    const maxed = new BattleSim(
      makeSave({ ascension: { count: 0, shards: 100, nodes: { might: 10 } } }),
      seeded(1),
    );
    expect(maxed.buyAscendNode('might').reason).toBe('max');
  });

  it('head start menentukan stage awal run berikutnya', () => {
    const sim = new BattleSim(
      makeSave({
        maxStage: 50,
        ascension: { count: 0, shards: 0, nodes: { 'head-start': 3 } },
      }),
      seeded(1),
    );
    sim.ascend();
    expect(sim.stage).toBe(7);
    expect(sim.maxStage).toBe(7);
  });

  it('long haul memperpanjang cap offline', () => {
    const sim = new BattleSim(
      makeSave({
        maxStage: 5,
        ascension: { count: 0, shards: 0, nodes: { 'long-haul': 3 } },
      }),
      seeded(2),
    );
    const report = sim.estimateOffline(20 * 60 * 60 * 1000);
    expect(report?.capSeconds).toBe(14 * 60 * 60);
    expect(report?.seconds).toBe(14 * 60 * 60);
    expect(report?.capped).toBe(true);
  });

  it('ascension tersimpan setelah save dan reload', () => {
    const sim = new BattleSim(makeSave(), seeded(1));
    sim.ascension = { count: 2, shards: 17, nodes: { might: 3, 'long-haul': 1 } };
    const restored = new BattleSim(sim.saveData());

    expect(restored.ascension.count).toBe(2);
    expect(restored.ascension.shards).toBe(17);
    expect(restored.ascension.nodes).toEqual({ might: 3, 'long-haul': 1 });
  });
});
