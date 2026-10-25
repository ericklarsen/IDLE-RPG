import { describe, expect, it } from 'vitest';
import { CODEX_ENEMIES, CODEX_ITEM_NAMES, CODEX_ITEMS } from '../data/codex';
import { BattleSim } from './battle';
import { emptyCodex, normalizeCodex } from './codex';
import type { Item, SaveData } from './types';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeWeapon(overrides: Partial<Item> = {}): Item {
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
    version: 10,
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

describe('codex', () => {
  it('katalog bestiary dan arsenal lengkap', () => {
    expect(CODEX_ENEMIES).toHaveLength(35);
    expect(CODEX_ENEMIES.filter((entry) => entry.kind === 'boss')).toHaveLength(5);
    expect(CODEX_ITEMS).toHaveLength(36);
    expect(CODEX_ITEMS.filter((entry) => entry.set)).toHaveLength(24);
  });

  it('normalizeCodex membuang nama asing dan duplikat', () => {
    expect(emptyCodex()).toEqual({
      enemies: [],
      items: [],
      modifiers: [],
      costumes: [],
      mounts: [],
      wings: [],
    });
    expect(
      normalizeCodex({
        enemies: ['Moss Slime', 'Moss Slime', 'Not An Enemy', 42 as unknown as string],
        items: ['Ember Cleaver', 'Bogus Blade'],
        modifiers: ['haste', 'not-a-modifier'],
      }),
    ).toEqual({
      enemies: ['Moss Slime'],
      items: ['Ember Cleaver'],
      modifiers: ['haste'],
      costumes: [],
      mounts: [],
      wings: [],
    });
    expect(normalizeCodex(null)).toEqual(emptyCodex());
  });

  it('musuh yang muncul otomatis tercatat', () => {
    const sim = new BattleSim(null);
    expect(sim.codex.enemies).toContain('Moss Slime');
    expect(sim.snapshot().codex.enemies).toContain('Moss Slime');
  });

  it('item yang drop masuk arsenal dan disimpan di save', () => {
    const sim = new BattleSim(
      makeSave({ level: 20, maxStage: 1, equipped: { weapon: makeWeapon({ atk: 4000 }) } }),
      seeded(1),
    );
    runFor(sim, 120);

    expect(sim.codex.items.length).toBeGreaterThan(0);
    for (const name of sim.codex.items) expect(CODEX_ITEM_NAMES.has(name)).toBe(true);

    const restored = new BattleSim(sim.saveData());
    expect(restored.codex.items).toEqual(sim.codex.items);
  });

  it('modifier rift tercatat saat rift dimulai dan ikut tersimpan', () => {
    const sim = new BattleSim(
      makeSave({ maxStage: 12, farmStage: 12, level: 20 }),
      seeded(1),
    );
    expect(sim.codex.modifiers).toEqual([]);

    sim.startRift('2026-10-23', [
      { id: 'haste', label: 'Haste', desc: 'Enemy ATK SPD +25%', enemyAtkSpeed: 1.25 },
      { id: 'greed', label: 'Greed', desc: 'Chest gold ×1.5', chestGold: 1.5 },
    ]);

    expect(sim.codex.modifiers).toEqual(['haste', 'greed']);
    expect(sim.saveData().codex?.modifiers).toEqual(['haste', 'greed']);
  });

  it('memuat save membersihkan penemuan yang tidak dikenal', () => {
    const sim = new BattleSim(
      makeSave({
        codex: {
          enemies: ['Moss Slime', 'Ghost Of Nowhere'],
          items: ['Ember Cleaver'],
          modifiers: ['greed', 'bogus'],
          costumes: [],
        },
      }),
    );

    expect(sim.codex).toEqual({
      enemies: ['Moss Slime'],
      items: ['Ember Cleaver'],
      modifiers: ['greed'],
      costumes: [],
      mounts: [],
      wings: [],
    });
  });

  it('mount dan wing tercatat saat masuk stable atau vault', () => {
    const sim = new BattleSim(
      makeSave({
        level: 40,
        gold: 2_000_000,
        crystals: 200,
        maxStage: 40,
        farmStage: 40,
      }),
      seeded(1),
    );
    expect(sim.codex.mounts).toEqual([]);
    expect(sim.codex.wings).toEqual([]);

    expect(sim.craftMount('ember-steed').ok).toBe(true);
    expect(sim.codex.mounts).toEqual(['ember-steed']);

    expect(sim.craftWing('emberpinions').ok).toBe(true);
    expect(sim.codex.wings).toEqual(['emberpinions']);
    expect(sim.saveData().codex?.wings).toEqual(['emberpinions']);
  });

  it('save lama yang sudah punya mount/wing mengisi codex saat dimuat', () => {
    const sim = new BattleSim(
      makeSave({
        mounts: { active: 'dusk-wolf', owned: { 'dusk-wolf': { level: 2 } } },
        wings: { active: 'rimepinions', owned: { rimepinions: { level: 1 } } },
      }),
    );

    expect(sim.codex.mounts).toEqual(['dusk-wolf']);
    expect(sim.codex.wings).toEqual(['rimepinions']);
  });
});
