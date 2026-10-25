import { describe, expect, it } from 'vitest';
import { PET_MAX_CAP, PET_SYNTH_STEP, petById, petCost, petDamage } from '../data/pets';
import { BattleSim } from './battle';
import { dayKey } from './rift';
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
    version: 11,
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

function runFor(sim: BattleSim, seconds: number): void {
  const step = 0.05;
  for (let i = 0; i < Math.round(seconds / step); i += 1) sim.tick(step);
}

function weapon(atk: number, hp: number) {
  return {
    id: 'it_1',
    slot: 'weapon' as const,
    rarity: 'rare' as const,
    name: 'Test Blade',
    level: 20,
    atk,
    hp,
    def: 40,
    power: 50,
    salvage: 12,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
  };
}

/** A bulky knight: enough HP to survive the stage, little ATK so the fight runs. */
const tank = { equipped: { weapon: weapon(40, 5_000_000) } };

const wisp = (kind: 'ember' | 'frost' | 'storm', level = 1, extra: Partial<SaveData> = {}) =>
  makeSave({
    level: 30,
    farmStage: 60,
    maxStage: 60,
    stage: 60,
    ...tank,
    pets: {
      active: kind,
      kinds: { [kind]: { level, maxLevel: 10, eggs: 0 } },
    },
    ...extra,
  });

describe('pet kennel', () => {
  it('terkunci sebelum stage 20 clear', () => {
    const sim = new BattleSim(makeSave({ farmStage: 19, maxStage: 20, stage: 20 }));
    expect(sim.pets.active).toBeNull();
    expect(sim.snapshot().pets.pets[0].unlocked).toBe(false);
    expect(sim.upgradePet()).toMatchObject({ ok: false, reason: 'stage' });
  });

  it('terbuka otomatis sesuai stage dan ikut menyerang', () => {
    const save = makeSave({ level: 30, farmStage: 60, maxStage: 61, stage: 61, ...tank });
    const withWisp = new BattleSim(save, seeded(1));
    const plain = new BattleSim(save, seeded(1));
    plain.setActivePet(null);

    expect(withWisp.pets.active).toBe('ember');
    expect(withWisp.snapshot().pets.pets.map((pet) => pet.unlocked)).toEqual([true, true, true]);
    expect(withWisp.snapshot().pets.pets[0].damage).toBeGreaterThan(0);

    runFor(withWisp, 7);
    runFor(plain, 7);
    expect(withWisp.enemy.hp).toBeLessThan(plain.enemy.hp);
  });

  it('ember membakar target di antara serangan', () => {
    const sim = new BattleSim(wisp('ember', 5), seeded(1));
    const damage = petDamage(petById('ember')!, sim.hero.atk, 5);

    runFor(sim, 3.5);
    expect(sim.enemy.hp).toBeLessThan(sim.enemy.maxHp - damage * 1.2);
  });

  it('frost memperlambat serangan musuh', () => {
    const sim = new BattleSim(wisp('frost', 3), seeded(2));
    runFor(sim, 3);
    expect(sim.enemySlowTimer).toBeGreaterThan(0);
    expect(sim.enemySlowPct).toBeGreaterThan(0);
  });

  it('storm menyerang dua kali per cast', () => {
    const events: SimEvent[] = [];
    const sim = new BattleSim(wisp('storm', 3), seeded(3));
    sim.on((event) => events.push(event));

    runFor(sim, 4);
    const hits = events.filter((event) => event.type === 'companionHit');
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it('training memakai gold lalu berhenti di ceiling', () => {
    const cost = petCost(petById('ember')!, 1);
    const sim = new BattleSim(wisp('ember', 1, { gold: cost * 4 }), seeded(1));
    const before = sim.snapshot().pets.pets[0].damage;

    expect(sim.upgradePet('ember')).toMatchObject({ ok: true, cost, level: 2 });
    expect(sim.gold).toBe(cost * 3);
    expect(sim.snapshot().pets.pets[0].damage).toBeGreaterThan(before);
    expect(petCost(petById('ember')!, 2)).toBeGreaterThan(cost);

    sim.gold = 0;
    expect(sim.upgradePet('ember')).toMatchObject({ ok: false, reason: 'gold' });
  });

  it('synthesis menaikkan ceiling dan berhenti di cap', () => {
    const sim = new BattleSim(
      wisp('ember', 10, {
        pets: {
          active: 'ember',
          kinds: { ember: { level: 10, maxLevel: 10, eggs: 2 } },
        },
      }),
      seeded(1),
    );

    expect(sim.upgradePet('ember')).toMatchObject({ ok: false, reason: 'max' });
    expect(sim.synthesizePet('ember')).toEqual({ ok: true, maxLevel: 10 + PET_SYNTH_STEP });
    expect(sim.pets.kinds.ember?.eggs).toBe(1);
    expect(sim.snapshot().pets.pets[0].maxLevel).toBe(10 + PET_SYNTH_STEP);

    sim.pets.kinds.ember = { level: 10, maxLevel: PET_MAX_CAP - 1, eggs: 3 };
    expect(sim.synthesizePet('ember')).toEqual({ ok: true, maxLevel: PET_MAX_CAP });
    expect(sim.synthesizePet('ember')).toEqual({ ok: false });
  });

  it('memilih wisp aktif dan menolak yang belum bangun', () => {
    const sim = new BattleSim(
      wisp('ember', 3, { farmStage: 20, maxStage: 20, stage: 20 }),
      seeded(1),
    );
    expect(sim.setActivePet('storm')).toBe(false);
    expect(sim.setActivePet(null)).toBe(true);
    expect(sim.snapshot().pets.active).toBeNull();
    expect(sim.setActivePet('ember')).toBe(true);
    expect(sim.snapshot().pets.active).toBe('ember');
  });

  it('egg dari boss menambah stok synthesis', () => {
    const sim = new BattleSim(
      makeSave({
        level: 40,
        farmStage: 20,
        maxStage: 20,
        stage: 20,
        equipped: { weapon: weapon(2_000_000, 5_000_000) },
        pets: { active: 'ember', kinds: { ember: { level: 3, maxLevel: 10, eggs: 0 } } },
      }),
      seeded(5),
      () => 0,
    );

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    runFor(sim, 120);

    expect(events.some((event) => event.type === 'petEgg')).toBe(true);
    expect(sim.pets.kinds.ember?.eggs).toBeGreaterThan(0);
  });

  it('crate liga Gold membawa satu telur', () => {
    const sim = new BattleSim(
      makeSave({
        level: 40,
        // Only Ember is awake here, so the crate cannot pick another wisp.
        farmStage: 30,
        maxStage: 30,
        league: {
          key: '2000-01-03',
          points: 400,
          division: 1,
          rewardDivision: null,
          rewardClaimed: true,
        },
        pets: { active: 'ember', kinds: { ember: { level: 3, maxLevel: 10, eggs: 0 } } },
      }),
      seeded(7),
    );

    const claimed = sim.claimLeague();
    expect(claimed.ok).toBe(true);
    expect(claimed.reward?.egg).toBe(true);
    expect(claimed.egg).toEqual({ id: 'ember', eggs: 1 });
    expect(sim.pets.kinds.ember?.eggs).toBe(1);
  });

  it('kemenangan arena di Champion bisa menjatuhkan telur', () => {
    const day = dayKey();
    const rival = (index: number) => ({
      id: `${day}-${index}`,
      name: `Rival ${index}`,
      element: 'fire' as const,
      hp: 1,
      atk: 1,
      def: 0,
      atkSpeed: 0.5,
      power: 10,
      label: 'EVEN' as const,
      build: 'Ashforged · Heavy Strike',
    });

    const sim = new BattleSim(
      makeSave({
        level: 40,
        farmStage: 40,
        maxStage: 40,
        stage: 40,
        arena: {
          day,
          tickets: 3,
          points: 300,
          wins: 0,
          losses: 0,
          rivals: [rival(0), rival(1), rival(2)],
          fought: [],
        },
        pets: { active: 'ember', kinds: { ember: { level: 3, maxLevel: 10, eggs: 0 } } },
      }),
      seeded(5),
      // Every loot roll lands, so the egg chance is not the thing under test.
      () => 0,
    );

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    expect(sim.startDuel(rival(0).id).ok).toBe(true);
    runFor(sim, 10);

    const end = events.find((event) => event.type === 'duelend');
    expect(end?.type).toBe('duelend');
    if (end?.type !== 'duelend') return;
    expect(end.result.win).toBe(true);
    expect(end.result.egg).toEqual({ id: 'ember', eggs: 1 });
    expect(sim.pets.kinds.ember?.eggs).toBe(1);
  });

  it('pets tersimpan di save v22 dan selamat dari ascension', () => {
    const sim = new BattleSim(
      makeSave({
        level: 30,
        maxStage: 50,
        farmStage: 50,
        stage: 50,
        pets: {
          active: 'frost',
          kinds: {
            ember: { level: 6, maxLevel: 12, eggs: 1 },
            frost: { level: 3, maxLevel: 10, eggs: 0 },
          },
        },
      }),
    );

    const data = sim.saveData();
    expect(data.version).toBe(23);
    expect(data.pets).toMatchObject({ active: 'frost' });
    expect(data.pets?.kinds?.ember).toEqual({ level: 6, maxLevel: 12, eggs: 1 });

    const restored = new BattleSim(data);
    expect(restored.pets.active).toBe('frost');
    expect(restored.pets.kinds.ember?.level).toBe(6);

    expect(sim.ascend().ok).toBe(true);
    expect(sim.pets.kinds.ember?.level).toBe(6);
    expect(sim.pets.active).toBe('frost');
  });

  it('save lama dengan companion tetap membawa wisp-nya', () => {
    const sim = new BattleSim(
      makeSave({ farmStage: 20, maxStage: 21, stage: 21, companion: { level: 7 } }),
      seeded(1),
    );

    expect(sim.pets.active).toBe('ember');
    expect(sim.pets.kinds.ember).toEqual({ level: 7, maxLevel: 10, eggs: 0 });
  });
});
