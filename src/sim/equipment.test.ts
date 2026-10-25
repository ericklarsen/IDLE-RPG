import { describe, expect, it } from 'vitest';
import { BattleSim } from './battle';
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
    version: 3,
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

describe('equipment', () => {
  it('game baru memakai starter weapon supaya enhance bisa langsung dipakai', () => {
    const sim = new BattleSim(null);
    expect(sim.equipped.weapon?.name).toBe('Rusty Shortsword');
    expect(sim.snapshot().hasWeapon).toBe(true);
    expect(sim.snapshot().enhanceCost).toBeGreaterThan(0);
  });

  it('equip menaikkan ATK, HP, dan gear score', () => {
    const sim = new BattleSim(makeSave({ inventory: [makeItem()] }));
    const beforeAtk = sim.hero.atk;
    const beforeMaxHp = sim.hero.maxHp;

    expect(sim.equip('it_1')).toBe(true);
    expect(sim.equipped.weapon?.id).toBe('it_1');
    expect(sim.hero.atk).toBeCloseTo(beforeAtk + 10, 5);
    expect(sim.hero.maxHp).toBe(beforeMaxHp + 20);
    expect(sim.gearScore).toBe(41);
    expect(sim.inventory).toHaveLength(0);
  });

  it('equip item baru mengembalikan item lama ke inventory', () => {
    const oldItem = makeItem({ id: 'it_1', power: 40 });
    const newItem = makeItem({ id: 'it_2', atk: 20, power: 90 });
    const sim = new BattleSim(
      makeSave({ inventory: [newItem], equipped: { weapon: oldItem } }),
    );

    sim.equip('it_2');
    expect(sim.equipped.weapon?.id).toBe('it_2');
    expect(sim.inventory.map((item) => item.id)).toContain('it_1');
  });

  it('unequip mengembalikan item, salvage memberi gold', () => {
    const sim = new BattleSim(makeSave({ inventory: [makeItem()] }));
    sim.equip('it_1');
    expect(sim.unequip('weapon')).toBe(true);
    expect(sim.equipped.weapon).toBeNull();
    expect(sim.inventory).toHaveLength(1);

    const before = sim.gold;
    const salvaged = sim.salvage('it_1');
    expect(salvaged?.id).toBe('it_1');
    expect(sim.gold).toBe(before + 12);
  });

  it('equip best memilih power tertinggi per slot', () => {
    const weak = makeItem({ id: 'it_1', slot: 'weapon', power: 30 });
    const strong = makeItem({ id: 'it_2', slot: 'weapon', power: 90, atk: 25 });
    const helm = makeItem({ id: 'it_3', slot: 'helm', power: 60, atk: 2 });
    const sim = new BattleSim(makeSave({ inventory: [weak, strong, helm] }));

    expect(sim.equipBest()).toBe(2);
    expect(sim.equipped.weapon?.id).toBe('it_2');
    expect(sim.equipped.helm?.id).toBe('it_3');
    expect(sim.inventory.map((item) => item.id)).toContain('it_1');
  });

  it('salvage commons hanya menghapus rarity common', () => {
    const sim = new BattleSim(
      makeSave({
        inventory: [
          makeItem({ id: 'it_1', rarity: 'common', salvage: 5 }),
          makeItem({ id: 'it_2', rarity: 'rare', salvage: 20 }),
          makeItem({ id: 'it_3', rarity: 'common', salvage: 7 }),
        ],
      }),
    );

    const result = sim.salvageCommons();
    expect(result.count).toBe(2);
    expect(result.gold).toBe(12);
    expect(sim.inventory).toHaveLength(1);
    expect(sim.inventory[0].rarity).toBe('rare');
  });

  it('salvage commons tidak menghapus item yang sudah di-enhance atau di-refine', () => {
    const sim = new BattleSim(
      makeSave({
        inventory: [
          makeItem({ id: 'it_1', rarity: 'common' }),
          makeItem({ id: 'it_2', rarity: 'common', enhance: 3 }),
          makeItem({ id: 'it_3', rarity: 'common', refines: 1 }),
        ],
      }),
    );

    const result = sim.salvageCommons();
    expect(result.count).toBe(1);
    expect(sim.inventory.map((item) => item.id)).toEqual(['it_2', 'it_3']);
  });

  it('inventory penuh auto-salvage item terlemah saat drop', () => {
    const items = Array.from({ length: 24 }, (_, index) =>
      makeItem({ id: `it_${index + 1}`, power: index + 1, salvage: 10 }),
    );
    const sim = new BattleSim(makeSave({ inventory: items, itemSeq: 30 }));

    const before = sim.gold;
    (sim as unknown as { maybeDropLoot: (kind: 'boss') => void }).maybeDropLoot('boss');

    expect(sim.inventory).toHaveLength(24);
    expect(sim.gold).toBeGreaterThan(before);
  });

  it('save menyimpan equipment dan inventory', () => {
    const sim = new BattleSim(makeSave({ inventory: [makeItem()], itemSeq: 40 }));
    sim.equip('it_1');
    const data = sim.saveData();
    const restored = new BattleSim(data);

    expect(data.version).toBe(23);
    expect(restored.equipped.weapon?.id).toBe('it_1');
    expect(restored.hero.atk).toBeCloseTo(sim.hero.atk, 5);
    expect(restored.gearScore).toBe(sim.gearScore);
  });
});
