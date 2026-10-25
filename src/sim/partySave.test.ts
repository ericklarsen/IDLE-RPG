import { describe, expect, it } from 'vitest';
import { parseSave } from '../state/save';
import { BattleSim } from './battle';
import { setPartySlot } from './party';
import type { Item, SaveData } from './types';

function makeItem(overrides: Partial<Item> = {}): Item {
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
    version: 24,
    level: 1,
    exp: 0,
    gold: 0,
    maxStage: 1,
    kills: 0,
    inventory: [],
    itemSeq: 10,
    ...overrides,
  };
}

describe('party save v24', () => {
  it('menyimpan gear per karakter tanpa tertukar', () => {
    const sim = new BattleSim(
      makeSave({
        maxStage: 10,
        inventory: [makeItem({ id: 'it_1' }), makeItem({ id: 'it_2', atk: 40, power: 90 })],
        itemSeq: 20,
      }),
    );

    sim.equip('it_1');
    const withRanger = setPartySlot(sim.party, 1, 'ranger');
    expect(withRanger).not.toBeNull();
    sim.party = withRanger!;
    sim.party.activeSlot = 1;
    sim.equip('it_2');

    const restored = new BattleSim(sim.saveData());

    expect(restored.gear.knight.weapon?.id).toBe('it_1');
    expect(restored.gear.ranger.weapon?.id).toBe('it_2');
    expect(restored.gear.mage.weapon).toBeNull();
    // The getters follow the active slot, which survives the round trip.
    expect(restored.party.activeSlot).toBe(1);
    expect(restored.equipped.weapon?.id).toBe('it_2');
  });

  it('menyimpan wardrobe per karakter', () => {
    const sim = new BattleSim(makeSave({ maxStage: 10 }));
    sim.costume = { owned: ['ash-ronin'], equipped: 'ash-ronin', pity: 3, mastered: false };

    const restored = new BattleSim(sim.saveData());

    expect(restored.costumes.knight).toMatchObject({
      owned: ['ash-ronin'],
      equipped: 'ash-ronin',
      pity: 3,
    });
    expect(restored.costumes.ranger.owned).toEqual([]);
  });

  it('menyimpan party, dan unlock mengikuti maxStage saat dimuat', () => {
    const sim = new BattleSim(makeSave({ maxStage: 20 }));
    sim.party = setPartySlot(sim.party, 1, 'ranger')!;

    const restored = new BattleSim(sim.saveData());

    expect(restored.party.slots.slice(0, 2)).toEqual(['knight', 'ranger']);
    expect(restored.party.unlocked).toEqual(['knight', 'ranger', 'cleric']);
  });

  it('migrasi save v23: satu set gear dan costume jadi milik knight', () => {
    const legacy = JSON.stringify({
      version: 23,
      level: 8,
      exp: 0,
      gold: 0,
      maxStage: 26,
      kills: 4,
      itemSeq: 12,
      inventory: [],
      equipped: { weapon: makeItem({ id: 'it_4' }) },
      costume: { owned: ['ash-ronin', 'frostveil-shroud'], equipped: 'frostveil-shroud', pity: 1, mastered: false },
    });

    const parsed = parseSave(legacy);
    expect(parsed?.version).toBe(24);
    expect(parsed?.gear?.knight?.weapon?.id).toBe('it_4');
    expect(parsed?.gear?.ranger?.weapon).toBeNull();
    expect(parsed?.costumes?.knight).toMatchObject({
      owned: ['ash-ronin', 'frostveil-shroud'],
      equipped: 'frostveil-shroud',
    });
    expect(parsed?.costumes?.ranger?.owned).toEqual([]);
    // The stage milestones are re-granted, so the old run keeps its roster.
    expect(parsed?.party?.unlocked).toEqual(['knight', 'ranger', 'cleric']);

    const restored = new BattleSim(parsed!);
    expect(restored.gear.knight.weapon?.id).toBe('it_4');
    expect(restored.costume.equipped).toBe('frostveil-shroud');
  });

  it('membuang item yang sama bila dua karakter mengklaimnya', () => {
    const shared = makeItem({ id: 'it_9' });
    const parsed = parseSave(
      JSON.stringify({
        version: 24,
        level: 1,
        exp: 0,
        gold: 0,
        maxStage: 10,
        kills: 0,
        itemSeq: 20,
        inventory: [],
        gear: { knight: { weapon: shared }, ranger: { weapon: shared } },
        party: { slots: ['knight', 'ranger', null, null, null], unlocked: ['knight', 'ranger'], activeSlot: 0 },
      }),
    );

    expect(parsed?.gear?.knight?.weapon?.id).toBe('it_9');
    expect(parsed?.gear?.ranger?.weapon).toBeNull();
  });
});
