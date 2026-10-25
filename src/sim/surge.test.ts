import { describe, expect, it } from 'vitest';
import { SURGE_ATK, SURGE_DURATION, SURGE_SPEED, SURGE_UNLOCK_STAGE } from '../data/surge';
import { BattleSim } from './battle';
import type { Item, SaveData } from './types';

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 13,
    level: 1,
    exp: 0,
    gold: 0,
    maxStage: 1,
    farmStage: 1,
    stage: 1,
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

const heavyWeapon: Item = {
  id: 'it_surge',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Surge Test Blade',
  level: 12,
  atk: 4000,
  hp: 0,
  def: 0,
  power: 100,
  salvage: 10,
  enhance: 0,
  pity: 0,
  refines: 0,
  enchants: 0,
  substats: [],
  runes: [null, null, null],
};

/** Unlocks the surge without making the enemies themselves stage 30. */
function unlock(sim: BattleSim): void {
  sim.maxStage = Math.max(sim.maxStage, SURGE_UNLOCK_STAGE);
  sim.farmStage = SURGE_UNLOCK_STAGE;
}

describe('forge surge', () => {
  it('tidak mengisi meter sebelum stage unlock', () => {
    const sim = new BattleSim(makeSave(), seeded(3));
    sim.maxStage = SURGE_UNLOCK_STAGE - 1;
    sim.farmStage = SURGE_UNLOCK_STAGE - 1;

    let started = 0;
    sim.on((event) => {
      if (event.type === 'surge') started += 1;
    });

    for (let i = 0; i < 400; i += 1) sim.tick(0.05);

    expect(sim.surgeUnlocked).toBe(false);
    expect(sim.surgeMeter).toBe(0);
    expect(started).toBe(0);
  });

  it('damage yang dihasilkan mengisi meter', () => {
    const sim = new BattleSim(makeSave(), seeded(3));
    unlock(sim);

    expect(sim.surgeMeter).toBe(0);
    sim.tick(0.05);

    expect(sim.surgeMeter).toBeGreaterThan(0);
    expect(sim.surgeMeter).toBeLessThan(1);
  });

  it('meter penuh memicu surge, menaikkan ATK dan speed, lalu berakhir', () => {
    const sim = new BattleSim(
      makeSave({ equipped: { weapon: heavyWeapon } }),
      seeded(3),
    );
    unlock(sim);

    const baseAtk = sim.hero.atk;
    const baseSpeed = sim.hero.atkSpeed;
    const phases: string[] = [];
    sim.on((event) => {
      if (event.type === 'surge') phases.push(event.phase);
    });

    sim.tick(0.05);
    expect(sim.surgeActive).toBe(true);
    expect(phases).toEqual(['start']);
    expect(sim.hero.atk).toBeGreaterThan(baseAtk * 1.2);
    expect(sim.hero.atkSpeed).toBeCloseTo(baseSpeed * SURGE_SPEED, 2);
    expect(sim.surgeRemaining).toBeGreaterThan(SURGE_DURATION - 0.1);

    const activeAtk = sim.hero.atk;
    const snap = sim.snapshot().surge;
    expect(snap).toEqual({
      unlocked: true,
      active: true,
      charge: 1,
      remaining: SURGE_DURATION,
    });

    // Still active a few seconds later, and it never starts twice.
    for (let i = 0; i < 50; i += 1) sim.tick(0.1);
    expect(sim.surgeActive).toBe(true);
    expect(phases).toEqual(['start']);

    // Tick until the window closes; stop immediately so the next hit cannot
    // refill the meter and start a second surge within the same assertion.
    for (let i = 0; i < 300 && !phases.includes('end'); i += 1) sim.tick(0.05);
    expect(phases).toEqual(['start', 'end']);
    expect(sim.surgeActive).toBe(false);
    expect(sim.surgeMeter).toBe(0);
    expect(sim.hero.atk).toBeLessThan(activeAtk);
    expect(sim.hero.atk).toBeGreaterThanOrEqual(baseAtk);
    expect(sim.snapshot().surge).toEqual({
      unlocked: true,
      active: false,
      charge: 0,
      remaining: 0,
    });
  });

  it('buff surge hanya berlaku selama durasi', () => {
    const sim = new BattleSim(
      makeSave({ equipped: { weapon: heavyWeapon } }),
      seeded(3),
    );
    const phases: string[] = [];
    sim.on((event) => {
      if (event.type === 'surge') phases.push(event.phase);
    });

    unlock(sim);
    sim.tick(0.05);
    expect(sim.surgeActive).toBe(true);

    // Stop on the tick the window closes: ticking past it can refill the meter
    // and start a fresh surge, which would hide whether the first one ended.
    for (let i = 0; i < 300 && sim.surgeActive; i += 1) sim.tick(0.1);
    expect(SURGE_DURATION).toBeGreaterThan(0);
    expect(SURGE_ATK).toBeGreaterThan(1);
    expect(phases).toEqual(['start', 'end']);
    expect(sim.surgeActive).toBe(false);
  });

  it('charge tidak ikut tersimpan saat reload', () => {
    const sim = new BattleSim(
      makeSave({ equipped: { weapon: heavyWeapon } }),
      seeded(3),
    );
    unlock(sim);
    sim.tick(0.05);
    expect(sim.surgeActive).toBe(true);

    const reloaded = new BattleSim(sim.saveData(), seeded(3));
    expect(reloaded.surgeActive).toBe(false);
    expect(reloaded.surgeMeter).toBe(0);
  });

  it('ascension melepas surge yang sedang aktif', () => {
    const sim = new BattleSim(
      makeSave({ maxStage: 60, equipped: { weapon: heavyWeapon } }),
      seeded(3),
    );
    unlock(sim);
    sim.tick(0.05);
    expect(sim.surgeActive).toBe(true);

    const result = sim.ascend();
    expect(result.ok).toBe(true);
    expect(sim.surgeActive).toBe(false);
    expect(sim.surgeMeter).toBe(0);
  });
});
