import { describe, expect, it } from 'vitest';
import { BattleSim } from './battle';
import { setPartySlot } from './party';
import type { Item, SaveData } from './types';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'epic',
    name: 'Heavy Blade',
    level: 10,
    atk: 120,
    hp: 0,
    def: 0,
    power: 300,
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

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 24,
    level: 10,
    exp: 0,
    gold: 0,
    maxStage: 10,
    kills: 0,
    inventory: [],
    itemSeq: 10,
    ...overrides,
  };
}

function withRanger(sim: BattleSim): BattleSim {
  const next = setPartySlot(sim.party, 1, 'ranger');
  expect(next).not.toBeNull();
  sim.party = next!;
  return sim;
}

describe('party stats', () => {
  it('keeps the knight as the neutral baseline', () => {
    const sim = new BattleSim(makeSave());
    const knight = sim.hero;

    // A second sim with the ranger active must differ, proving the multipliers
    // are applied and the baseline is not accidentally scaled.
    const ranger = withRanger(new BattleSim(makeSave()));
    expect(ranger.setActiveCharacter(1)).toBe(true);

    expect(ranger.hero.atk).toBeGreaterThan(knight.atk);
    expect(ranger.hero.maxHp).toBeLessThan(knight.maxHp);
    expect(ranger.hero.atkSpeed).toBeGreaterThan(knight.atkSpeed);
  });

  it('rebuilds stats from the active character own gear', () => {
    const sim = new BattleSim(
      makeSave({ inventory: [makeItem({ id: 'it_1' })], itemSeq: 20 }),
    );
    sim.equip('it_1');
    const armedKnight = sim.hero.atk;
    const knightGear = sim.gear.knight.weapon?.id;

    withRanger(sim);
    expect(sim.setActiveCharacter(1)).toBe(true);
    const unarmedRanger = sim.hero.atk;
    expect(sim.gear.ranger.weapon).toBeNull();
    expect(unarmedRanger).toBeLessThan(armedKnight);

    // Switching back restores the knight's own weapon and stats.
    expect(sim.setActiveCharacter(0)).toBe(true);
    expect(sim.gear.knight.weapon?.id).toBe(knightGear);
    expect(sim.hero.atk).toBeCloseTo(armedKnight, 5);
  });

  it('refuses empty slots and out-of-range picks', () => {
    const sim = new BattleSim(makeSave());
    expect(sim.setActiveCharacter(1)).toBe(false);
    expect(sim.setActiveCharacter(-1)).toBe(false);
    expect(sim.setActiveCharacter(9)).toBe(false);
    expect(sim.party.activeSlot).toBe(0);
  });

  it('keeps the active character after a save round trip', () => {
    const sim = withRanger(new BattleSim(makeSave()));
    sim.setActiveCharacter(1);
    sim.equip('it_1');

    const restored = new BattleSim(sim.saveData());

    expect(restored.party.activeSlot).toBe(1);
    expect(restored.hero.atk).toBeCloseTo(sim.hero.atk, 5);
  });
});
