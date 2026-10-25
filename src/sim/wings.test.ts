import { describe, expect, it } from 'vitest';
import { WINGS, wingById, wingDropChance, wingLevelCost, wingSkillChance } from '../data/wings';
import { mountById } from '../data/mounts';
import { DUNGEON_TIERS } from '../data/dungeon';
import { BattleSim } from './battle';
import {
  addWing,
  craftWing,
  emptyWings,
  equipWing,
  normalizeWings,
  trainWing,
  wingBonuses,
} from './wings';
import type { SaveData, SimEvent } from './types';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 21,
    level: 30,
    exp: 0,
    gold: 0,
    maxStage: 30,
    farmStage: 30,
    stage: 30,
    kills: 0,
    inventory: [],
    equipped: {},
    itemSeq: 10,
    ...overrides,
  };
}

function weapon(atk: number, hp: number) {
  return {
    id: 'it_1',
    slot: 'weapon' as const,
    rarity: 'epic' as const,
    name: 'Test Blade',
    level: 30,
    atk,
    hp,
    def: 40,
    power: 90,
    salvage: 12,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
  };
}

function runFor(sim: BattleSim, seconds: number): void {
  const step = 0.05;
  for (let i = 0; i < Math.round(seconds / step); i += 1) sim.tick(step);
}

const strong = { equipped: { weapon: weapon(2_000_000, 5_000_000) } };

describe('wing ownership', () => {
  it('normalisasi membuang wing tak dikenal dan level liar', () => {
    expect(normalizeWings(null)).toEqual({ active: null, owned: {} });
    expect(
      normalizeWings({
        active: 'ghost' as never,
        owned: {
          emberpinions: { level: 3 },
          stormpinions: { level: 99 },
          bogus: { level: 5 },
        } as never,
      }),
    ).toEqual({
      active: null,
      owned: { emberpinions: { level: 3 }, stormpinions: { level: 12 } },
    });

    expect(normalizeWings({ owned: { rimepinions: { level: 2 } } } as never).active).toBe(
      'rimepinions',
    );
    expect(
      normalizeWings({ active: null, owned: { rimepinions: { level: 2 } } }).active,
    ).toBeNull();
  });

  it('hanya bisa memakai wing yang dimiliki', () => {
    const owned = addWing(emptyWings(), 'emberpinions');
    expect(owned?.active).toBe('emberpinions');
    expect(equipWing(owned!, 'rimepinions')).toBeNull();
    expect(equipWing(owned!, null)?.active).toBeNull();
    expect(addWing(owned!, 'emberpinions')).toBeNull();
  });

  it('craft bisa gagal dan hanya mengembalikan separuh crystal', () => {
    const info = wingById('emberpinions')!;
    const gold = 1_000_000;
    const crystals = 100;

    const failed = craftWing(emptyWings(), 'emberpinions', gold, crystals, 0.99);
    expect(failed.ok).toBe(false);
    expect(failed.reason).toBe('failed');
    expect(failed.wings.owned.emberpinions).toBeUndefined();
    expect(failed.cost).toEqual({ gold: info.craft.gold, crystals: info.craft.crystals });
    expect(failed.refund).toBe(Math.floor(info.craft.crystals / 2));

    const success = craftWing(emptyWings(), 'emberpinions', gold, crystals, 0);
    expect(success.ok).toBe(true);
    expect(success.refund).toBe(0);
    expect(success.wings.owned.emberpinions?.level).toBe(1);

    // Missing funds stop the attempt before the roll.
    expect(craftWing(emptyWings(), 'emberpinions', 0, crystals, 0)).toMatchObject({
      ok: false,
      reason: 'gold',
      refund: 0,
    });
    expect(craftWing(emptyWings(), 'emberpinions', gold, 0, 0)).toMatchObject({
      ok: false,
      reason: 'crystals',
      refund: 0,
    });
  });

  it('training menaikkan level, berhenti di max, dan butuh crystal', () => {
    const info = wingById('stormpinions')!;
    const owned = addWing(emptyWings(), 'stormpinions')!;
    const cost = wingLevelCost(info, 1);
    expect(cost.crystals).toBeGreaterThan(0);
    expect(trainWing(owned, 'stormpinions', cost.gold, cost.crystals - 1)).toBeNull();

    const trained = trainWing(owned, 'stormpinions', cost.gold, cost.crystals);
    expect(trained?.level).toBe(2);

    const maxed = { active: 'stormpinions' as const, owned: { stormpinions: { level: 12 } } };
    expect(trainWing(maxed, 'stormpinions', 1e12, 1e6)).toBeNull();
    expect(wingLevelCost(info, 12)).toEqual({ gold: 0, crystals: 0 });
  });

  it('bonus pasif dan skill naik bersama level', () => {
    const info = wingById('rimepinions')!;
    const state = { active: 'rimepinions' as const, owned: { rimepinions: { level: 6 } } };
    const bonus = wingBonuses(state);

    expect(bonus.atkPct).toBeCloseTo(info.atkPctPerLevel * 6);
    expect(bonus.hpPct).toBeCloseTo(info.hpPctPerLevel * 6);
    expect(bonus.defPct).toBeCloseTo(info.defPctPerLevel * 6);
    expect(wingSkillChance(info, 6)).toBeGreaterThan(wingSkillChance(info, 1));
    expect(wingSkillChance(info, 99)).toBeLessThanOrEqual(info.skill.chanceCap);
    expect(wingSkillChance(info, 0)).toBe(0);
  });
});

describe('wing roster', () => {
  it('menyediakan beberapa wing dengan skill dan tier berbeda', () => {
    expect(WINGS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(WINGS.map((wing) => wing.id)).size).toBe(WINGS.length);
    for (const wing of WINGS) {
      expect(wing.skill.chanceBase).toBeGreaterThan(0);
      expect(wing.skill.chanceCap).toBeLessThanOrEqual(1);
      expect(wing.craft.chance).toBeLessThan(1);
      expect(wing.craft.chance).toBeGreaterThan(0);
    }
  });

  it('drop wing jauh lebih langka dari mount di tier yang sama', () => {
    DUNGEON_TIERS.forEach((tier, index) => {
      const chance = wingDropChance(index + 1);
      expect(chance, tier.id).toBeGreaterThan(0);
      expect(chance, tier.id).toBeLessThan(tier.mountChance);
      expect(chance, tier.id).toBeLessThan(0.01);
    });
    expect(wingDropChance(1)).toBeLessThanOrEqual(0.002);
    expect(mountById('ember-steed')?.tier).toBe(1);
  });
});

describe('wing di battle', () => {
  it('wings yang dipakai menaikkan ATK hero lebih besar dari mount', () => {
    const plain = new BattleSim(makeSave(), seeded(1));
    const withWing = new BattleSim(
      makeSave({
        wings: { active: 'stormpinions', owned: { stormpinions: { level: 10 } } },
      }),
      seeded(1),
    );
    const withMount = new BattleSim(
      makeSave({ mounts: { active: 'storm-gryphon', owned: { 'storm-gryphon': { level: 10 } } } }),
      seeded(1),
    );

    expect(withWing.hero.atk).toBeGreaterThan(plain.hero.atk);
    expect(withWing.hero.atk).toBeGreaterThan(withMount.hero.atk);
    expect(withWing.snapshot().wings.active).toBe('stormpinions');
  });

  it('skill wing terpicu saat menyerang', () => {
    const sim = new BattleSim(
      makeSave({
        equipped: { weapon: weapon(40, 5_000_000) },
        wings: { active: 'emberpinions', owned: { emberpinions: { level: 12 } } },
      }),
      seeded(3),
    );

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    runFor(sim, 10);

    expect(events.some((event) => event.type === 'wingSkill')).toBe(true);
  });

  it('craft lewat sim memotong gold dan mengembalikan separuh crystal saat gagal', () => {
    const info = wingById('emberpinions')!;
    const sim = new BattleSim(makeSave({ gold: 1_000_000, crystals: 100 }), () => 0.99);

    const outcome = sim.craftWing('emberpinions');
    expect(outcome).toMatchObject({ ok: false, reason: 'failed' });
    expect(sim.gold).toBe(1_000_000 - info.craft.gold);
    expect(sim.crystals).toBe(100 - info.craft.crystals + Math.floor(info.craft.crystals / 2));
    expect(sim.wings.owned.emberpinions).toBeUndefined();
  });

  it('craft lewat sim bisa berhasil dan langsung dipakai', () => {
    const info = wingById('emberpinions')!;
    const sim = new BattleSim(makeSave({ gold: 1_000_000, crystals: 100 }), () => 0);

    const outcome = sim.craftWing('emberpinions');
    expect(outcome.ok).toBe(true);
    expect(sim.gold).toBe(1_000_000 - info.craft.gold);
    expect(sim.crystals).toBe(100 - info.craft.crystals);
    expect(sim.wings.active).toBe('emberpinions');
  });

  it('dungeon bisa menjatuhkan wing sekaligus mount', () => {
    const sim = new BattleSim(makeSave({ ...strong }), seeded(4), () => 0);
    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));

    expect(sim.startDungeon('cinder')).toEqual({ ok: true });
    runFor(sim, 60);

    const end = events.find((event) => event.type === 'dungeonend');
    expect(end?.type).toBe('dungeonend');
    if (end?.type !== 'dungeonend') return;
    expect(end.result.mount).toBe('ember-steed');
    expect(end.result.wing).toBe('emberpinions');
    expect(end.result.wingName).toBe('Emberpinions');
    expect(sim.wings.owned.emberpinions?.level).toBe(1);
    expect(sim.snapshot().dungeon.tiers[0].wingChance).toBeCloseTo(0.002);
  });

  it('tanpa roll wing, crystal tambahan tetap dibayar setelah semua wing tier dimiliki', () => {
    const sim = new BattleSim(
      makeSave({
        ...strong,
        wings: {
          active: 'emberpinions',
          owned: { emberpinions: { level: 1 } },
        },
      }),
      seeded(4),
      // Mount roll misses; the wing tier is complete, so it pays bonus crystals.
      () => 1,
    );
    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));

    sim.startDungeon('cinder');
    runFor(sim, 60);

    const end = events.find((event) => event.type === 'dungeonend');
    if (end?.type !== 'dungeonend') return expect(end).toBeDefined();
    expect(end.result.wing).toBeNull();
    // Base 3–5 crystals, plus 3 because every wing of the tier is already owned.
    expect(end.result.crystals).toBeGreaterThanOrEqual(6);
  });

  it('wings dan crystal tersimpan di save v22 dan selamat dari ascension', () => {
    const sim = new BattleSim(
      makeSave({
        maxStage: 60,
        farmStage: 60,
        stage: 60,
        wings: { active: 'rimepinions', owned: { rimepinions: { level: 4 } } },
        crystals: 17,
      }),
      seeded(2),
    );

    const data = sim.saveData();
    expect(data.version).toBe(23);
    expect(data.wings?.active).toBe('rimepinions');
    expect(data.wings?.owned?.rimepinions).toEqual({ level: 4 });

    const restored = new BattleSim(data, seeded(2));
    expect(restored.wings.active).toBe('rimepinions');
    expect(restored.crystals).toBe(17);

    expect(restored.ascend().ok).toBe(true);
    expect(restored.wings.owned.rimepinions?.level).toBe(4);
    expect(restored.crystals).toBe(17);
  });
});
