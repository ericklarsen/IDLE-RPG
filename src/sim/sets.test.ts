import { describe, expect, it } from 'vitest';
import { SETS, setForName, setTierText } from '../data/sets';
import { BattleSim } from './battle';
import type { Item, SaveData } from './types';
import {
  gearBonuses,
  gearScoreOf,
  itemPower,
  normalizeItem,
  setBonuses,
  setProgress,
} from './upgrade';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'rare',
    name: 'Ember Cleaver',
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
    version: 9,
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


describe('equipment sets', () => {
  it('set dikenali dari nama item, nama di luar set tidak punya tag', () => {
    expect(setForName('Ember Cleaver')).toBe('ashforged');
    expect(setForName('Void Signet')).toBe('voidbound');
    expect(setForName('Knight Plate')).toBe('oath');
    expect(setForName('Rusty Shortsword')).toBeNull();
    expect(Object.values(SETS).every((set) => set.pieces.length === 6)).toBe(true);
  });

  it('normalizeItem mengisi set untuk save lama dan menghormati nilai valid', () => {
    const legacy = makeItem({ name: 'Void Reaver' });
    expect(legacy.set).toBeUndefined();
    expect(normalizeItem(legacy).set).toBe('voidbound');
    expect(normalizeItem({ ...legacy, set: 'oath' }).set).toBe('oath');
    expect(
      normalizeItem({ ...legacy, set: 'bogus' as unknown as Item['set'] }).set,
    ).toBe('voidbound');
    expect(normalizeItem(makeItem({ name: 'Dented Helm' })).set).toBeNull();
  });

  it('setProgress menghitung potongan yang dipakai dan mengaktifkan tier', () => {
    const equipped = {
      weapon: makeItem({ id: 'it_1', slot: 'weapon' }),
      helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Crown of Ash' }),
      armor: null,
      boots: null,
      ring: null,
      amulet: null,
    };

    const ash = setProgress(equipped).find((set) => set.id === 'ashforged');
    expect(ash?.count).toBe(2);
    expect(ash?.total).toBe(6);
    expect(ash?.tiers.map((tier) => tier.active)).toEqual([true, false]);

    const oath = setProgress(equipped).find((set) => set.id === 'oath');
    expect(oath?.count).toBe(0);
  });

  it('bonus 2 dan 4 potong menumpuk sesuai definisi', () => {
    const three = {
      weapon: makeItem({ id: 'it_1', slot: 'weapon' }),
      helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Crown of Ash' }),
      armor: makeItem({ id: 'it_3', slot: 'armor', name: 'Ember Aegis' }),
      boots: null,
      ring: null,
      amulet: null,
    };
    const four = {
      ...three,
      boots: makeItem({ id: 'it_4', slot: 'boots', name: 'Ash Striders' }),
    };
    const one = { ...three, helm: null, armor: null };

    expect(setBonuses(one)).toEqual({});
    expect(setBonuses(three)).toEqual({ atkPct: 0.1 });
    expect(setBonuses(four)).toEqual({ atkPct: 0.1, speed: 0.08 });

    expect(gearBonuses(three).atkPct).toBeCloseTo(0.1, 5);
    expect(gearBonuses(four).speed).toBeCloseTo(0.08, 5);
  });

  it('voidbound memberi crit di 2 potong dan ATK besar di 4 potong', () => {
    const equipped = {
      weapon: makeItem({ id: 'it_1', slot: 'weapon', name: 'Void Reaver' }),
      helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Void Visor' }),
      armor: makeItem({ id: 'it_3', slot: 'armor', name: 'Void Carapace' }),
      boots: makeItem({ id: 'it_4', slot: 'boots', name: 'Void Treads' }),
      ring: null,
      amulet: null,
    };

    expect(setBonuses(equipped)).toEqual({ crit: 0.06, atkPct: 0.2 });
    expect(setTierText({ crit: 0.06 })).toBe('+6% CRIT');
  });

  it('gear score menghitung nilai set, bukan cuma raw item power', () => {
    const plain = {
      weapon: makeItem({ id: 'it_1', slot: 'weapon', name: 'Rusty Shortsword' }),
      helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Dented Helm' }),
      armor: null,
      boots: null,
      ring: null,
      amulet: null,
    };
    const ash = {
      ...plain,
      weapon: makeItem({ id: 'it_1', slot: 'weapon', name: 'Ember Cleaver' }),
      helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Crown of Ash' }),
    };

    const raw = (equipped: typeof plain) =>
      [equipped.weapon, equipped.helm].reduce(
        (sum, item) => sum + (item ? itemPower(item) : 0),
        0,
      );

    expect(gearScoreOf(plain)).toBe(raw(plain));
    expect(gearScoreOf(ash)).toBeGreaterThan(raw(ash));
  });

  it('equip best memilih potongan set kalau totalnya lebih kuat', () => {
    const save = makeSave({
      equipped: {
        weapon: makeItem({ id: 'it_1', slot: 'weapon', name: 'Ember Cleaver', atk: 100 }),
      },
      inventory: [
        makeItem({ id: 'it_2', slot: 'helm', name: 'Crown of Ash', atk: 25, power: 75 }),
        makeItem({ id: 'it_3', slot: 'helm', name: 'Dented Helm', atk: 30, power: 90 }),
      ],
    });
    const sim = new BattleSim(save);

    expect(sim.equipBest()).toBe(1);
    expect(sim.equipped.helm?.name).toBe('Crown of Ash');
    expect(sim.inventory.map((item) => item.name)).toContain('Dented Helm');
  });

  it('equip best tidak membongkar set 4 potong demi power mentah kecil', () => {
    const ashPieces = {
      weapon: makeItem({ id: 'it_1', slot: 'weapon', name: 'Ember Cleaver', atk: 50 }),
      helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Crown of Ash', atk: 50 }),
      armor: makeItem({ id: 'it_3', slot: 'armor', name: 'Ember Aegis', atk: 50 }),
      boots: makeItem({ id: 'it_4', slot: 'boots', name: 'Ash Striders', atk: 50 }),
      ring: null,
      amulet: null,
    };
    const save = makeSave({
      equipped: ashPieces,
      inventory: [
        makeItem({ id: 'it_5', slot: 'boots', name: 'Worn Boots', atk: 60, power: 200 }),
      ],
    });
    const sim = new BattleSim(save);

    expect(sim.equipBest()).toBe(0);
    expect(sim.equipped.boots?.name).toBe('Ash Striders');
  });

  it('set bonus benar-benar menaikkan ATK dan attack speed hero', () => {
    const withSet = new BattleSim(
      makeSave({
        equipped: {
          weapon: makeItem({ id: 'it_1', slot: 'weapon', name: 'Ember Cleaver' }),
          helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Crown of Ash' }),
          armor: makeItem({ id: 'it_3', slot: 'armor', name: 'Ember Aegis' }),
        },
      }),
    );
    const plain = new BattleSim(
      makeSave({
        equipped: {
          weapon: makeItem({ id: 'it_1', slot: 'weapon', name: 'Rusty Shortsword' }),
          helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Dented Helm' }),
          armor: makeItem({ id: 'it_3', slot: 'armor', name: 'Patched Leather' }),
        },
      }),
    );

    expect(withSet.hero.atk / plain.hero.atk).toBeCloseTo(1.1, 2);
    expect(withSet.hero.maxHp).toBe(plain.hero.maxHp);
  });

  it('tier 4 potong menaikkan attack speed di simulasi', () => {
    const four = new BattleSim(
      makeSave({
        equipped: {
          weapon: makeItem({ id: 'it_1', slot: 'weapon', name: 'Ember Cleaver' }),
          helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Crown of Ash' }),
          armor: makeItem({ id: 'it_3', slot: 'armor', name: 'Ember Aegis' }),
          boots: makeItem({ id: 'it_4', slot: 'boots', name: 'Ash Striders' }),
        },
      }),
    );
    const three = new BattleSim(
      makeSave({
        equipped: {
          weapon: makeItem({ id: 'it_1', slot: 'weapon', name: 'Ember Cleaver' }),
          helm: makeItem({ id: 'it_2', slot: 'helm', name: 'Crown of Ash' }),
          armor: makeItem({ id: 'it_3', slot: 'armor', name: 'Ember Aegis' }),
        },
      }),
    );

    expect(four.hero.atkSpeed / three.hero.atkSpeed).toBeCloseTo(1.08, 2);
  });
});
