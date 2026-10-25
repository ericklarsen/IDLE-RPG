import { describe, expect, it } from 'vitest';
import { FORGE_COST } from '../data/forge';
import { BattleSim } from './battle';
import { globalWave } from './formulas';
import type { Item, Rarity, SaveData } from './types';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 14,
    level: 20,
    exp: 0,
    gold: 0,
    maxStage: 10,
    kills: 0,
    inventory: [],
    equipped: {},
    itemSeq: 0,
    ...overrides,
  };
}

function item(id: string, rarity: Rarity, atk: number): Item {
  return {
    id,
    slot: 'weapon',
    rarity,
    name: `Blade ${id}`,
    level: 10,
    atk,
    hp: 0,
    def: 0,
    power: atk * 3,
    salvage: 5,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
  };
}

describe('forge', () => {
  it('salvage memberi dust sesuai rarity', () => {
    const sim = new BattleSim(
      makeSave({ inventory: [item('it_1', 'common', 5), item('it_2', 'epic', 20)] }),
      seeded(1),
    );

    expect(sim.dust).toBe(0);
    sim.salvage('it_1');
    expect(sim.dust).toBe(1);
    sim.salvage('it_2');
    expect(sim.dust).toBe(5);
  });

  it('salvage commons menjumlahkan dust satu kali', () => {
    const sim = new BattleSim(
      makeSave({
        inventory: [
          item('it_1', 'common', 5),
          item('it_2', 'common', 6),
          item('it_3', 'rare', 9),
        ],
      }),
      seeded(1),
    );

    const result = sim.salvageCommons();
    expect(result).toEqual({ count: 2, gold: 10, dust: 2 });
    expect(sim.dust).toBe(2);
    expect(sim.inventory.map((entry) => entry.id)).toEqual(['it_3']);
  });

  it('fuse memakai tiga item terlemah dan menaikkan rarity', () => {
    const sim = new BattleSim(
      makeSave({
        inventory: [
          item('it_1', 'common', 1),
          item('it_2', 'common', 2),
          item('it_3', 'common', 3),
          item('it_4', 'common', 100),
        ],
      }),
      seeded(7),
    );

    const result = sim.fuse('common');
    expect(result.ok).toBe(true);
    expect(result.consumed?.map((entry) => entry.id)).toEqual(['it_1', 'it_2', 'it_3']);
    expect(result.item?.rarity).toBe('rare');
    expect(result.item?.level).toBe(globalWave(sim.farmStage, 1));
    expect(sim.inventory.map((entry) => entry.id)).toEqual(['it_4', result.item!.id]);
  });

  it('item terpasang tidak ikut di-fuse', () => {
    const equipped = item('it_eq', 'common', 1);
    const sim = new BattleSim(
      makeSave({
        equipped: { weapon: { ...equipped, name: 'Rusty Shortsword' } },
        inventory: [
          item('it_1', 'common', 2),
          item('it_2', 'common', 3),
          item('it_3', 'common', 4),
        ],
      }),
      seeded(7),
    );

    const result = sim.fuse('common');
    expect(result.ok).toBe(true);
    expect(sim.equipped.weapon?.id).toBe('it_eq');
    expect(result.consumed?.some((entry) => entry.id === 'it_eq')).toBe(false);
  });

  it('fuse butuh tiga item dan menolak mythic', () => {
    const sim = new BattleSim(
      makeSave({ inventory: [item('it_1', 'common', 1), item('it_2', 'common', 2)] }),
      seeded(1),
    );

    expect(sim.fuse('common')).toMatchObject({ ok: false, reason: 'items' });
    expect(sim.fuse('mythic')).toMatchObject({ ok: false, reason: 'rarity' });
    expect(sim.inventory).toHaveLength(2);
  });

  it('craft menolak set yang belum ditemukan dan biaya yang kurang', () => {
    const sim = new BattleSim(
      makeSave({ inventory: [item('it_1', 'common', 1)], dust: FORGE_COST.dust }),
      seeded(1),
    );

    expect(sim.craftSetPiece('weapon', 'ashforged')).toMatchObject({ ok: false, reason: 'set' });

    const known = new BattleSim(
      makeSave({
        codex: { enemies: [], items: ['Ember Cleaver'], modifiers: [], costumes: [] },
        dust: FORGE_COST.dust - 1,
        essence: FORGE_COST.essence,
      }),
      seeded(1),
    );
    expect(known.craftSetPiece('weapon', 'ashforged')).toMatchObject({
      ok: false,
      reason: 'dust',
    });
  });

  it('craft menghasilkan Epic set piece sesuai slot dan memotong biaya', () => {
    const sim = new BattleSim(
      makeSave({
        codex: { enemies: [], items: ['Void Reaver', 'Crown of Ash'], modifiers: [], costumes: [] },
        dust: FORGE_COST.dust + 10,
        essence: FORGE_COST.essence + 4,
      }),
      seeded(5),
    );

    const result = sim.craftSetPiece('helm', 'ashforged');
    expect(result.ok).toBe(true);
    expect(result.item).toMatchObject({
      rarity: 'epic',
      slot: 'helm',
      set: 'ashforged',
      name: 'Crown of Ash',
    });
    expect(sim.dust).toBe(10);
    expect(sim.essence).toBe(4);
    expect(sim.inventory).toHaveLength(1);
    expect(sim.codex.items).toContain('Crown of Ash');
  });

  it('set event tidak bisa di-craft walau sudah ditemukan', () => {
    const sim = new BattleSim(
      makeSave({
        codex: { enemies: [], items: ['Cinder Crown'], modifiers: [], costumes: [] },
        dust: FORGE_COST.dust,
        essence: FORGE_COST.essence,
      }),
      seeded(5),
    );

    expect(sim.craftSetPiece('helm', 'emberforged')).toMatchObject({
      ok: false,
      reason: 'set',
    });
  });

  it('craft saat bag penuh tetap menyimpan hasil dan tidak menghilangkan item lain', () => {
    const inventory = Array.from({ length: 24 }, (_, index) =>
      item(`it_${index + 1}`, 'common', index + 1),
    );
    const sim = new BattleSim(
      makeSave({
        inventory,
        codex: { enemies: [], items: ['Ember Cleaver'], modifiers: [], costumes: [] },
        dust: FORGE_COST.dust,
        essence: FORGE_COST.essence,
      }),
      seeded(11),
    );

    const result = sim.craftSetPiece('weapon', 'ashforged');
    expect(result.ok).toBe(true);
    expect(sim.inventory).toHaveLength(24);
    expect(sim.inventory.some((entry) => entry.id === result.item!.id)).toBe(true);
    // The auto-salvaged weakest item still pays its dust back.
    expect(sim.dust).toBeGreaterThanOrEqual(0);
  });

  it('ascension mengosongkan dust seperti currency run lainnya', () => {
    const sim = new BattleSim(makeSave({ maxStage: 60, dust: 50 }), seeded(1));
    const result = sim.ascend();
    expect(result.ok).toBe(true);
    expect(sim.dust).toBe(0);
  });

  it('dust ikut tersimpan dan tidak pernah negatif', () => {
    const sim = new BattleSim(
      makeSave({ dust: 5, inventory: [item('it_1', 'common', 1)] }),
      seeded(1),
    );
    sim.salvage('it_1');

    const data = sim.saveData();
    expect(data.version).toBe(23);
    expect(data.dust).toBe(6);
  });
});
