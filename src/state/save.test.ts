import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveData } from '../sim/types';

class MemoryStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

vi.stubGlobal('localStorage', new MemoryStorage());

const { exportSave, importSave, loadSave, writeSave } = await import('./save');
const SAVE_KEY = 'idle-forge-save-v1';

function minimalSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 7,
    level: 12,
    exp: 0,
    gold: 4321,
    essence: 3,
    cores: 1,
    books: 2,
    maxStage: 4,
    kills: 50,
    itemSeq: 0,
    inventory: [],
    equipped: {},
    ...overrides,
  };
}

function legacyWeapon(): Record<string, unknown> {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'rare',
    name: 'Old Blade',
    level: 8,
    atk: 12,
    hp: 20,
    def: 2,
    power: 40,
    salvage: 10,
  };
}

describe('save', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('memindahkan enhance global v2 ke senjata', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 2,
        level: 6,
        exp: 10,
        enhanceLevel: 4,
        gold: 500,
        maxStage: 3,
        kills: 20,
        inventory: [],
        equipped: { weapon: legacyWeapon() },
        itemSeq: 1,
      }),
    );

    const save = loadSave();
    expect(save?.version).toBe(23);
    expect(save?.equipped?.weapon?.enhance).toBe(4);
    expect(save?.equipped?.weapon?.substats).toEqual([]);
    expect(save?.equipped?.weapon?.runes).toEqual([null, null, null]);
    expect(save?.essence).toBe(0);
    expect(save?.cores).toBe(0);
    expect(save?.gold).toBe(500);
    expect(save?.books).toBe(0);
    expect(save?.skills?.active?.[0]).toBe('heavy-strike');
    expect(save?.farmStage).toBe(3);
    expect(save?.stage).toBe(3);
  });

  it('save lama tanpa dust mulai dari 0, dust yang ada dipertahankan', () => {
    writeSave({ ...minimalSave(), version: 13 });
    const migrated = loadSave();
    expect(migrated?.version).toBe(23);
    expect(migrated?.dust).toBe(0);
    expect(migrated?.league).toMatchObject({ points: 0, division: 0, rewardDivision: null });

    writeSave({ ...minimalSave({ dust: 27 }), version: 14 });
    expect(loadSave()?.dust).toBe(27);
  });

  it('roundtrip v7 mempertahankan item, boost, skill, ascension, dan lastSeen', () => {
    writeSave({
      version: 7,
      level: 9,
      exp: 0,
      gold: 1234,
      essence: 17,
      cores: 6,
      books: 4,
      boosts: { offense: 3, fortune: 1 },
      skills: { active: ['ember-burst', null, null], passive: 'vitality', levels: { 'ember-burst': 4 } },
      ascension: { count: 2, shards: 9, nodes: { might: 3, 'head-start': 1 } },
      maxStage: 5,
      farmStage: 4,
      stage: 4,
      rift: { day: '2026-10-23', kills: 14 },
      kills: 90,
      itemSeq: 2,
      lastSeen: 1_700_000_000_000,
      inventory: [
        {
          id: 'it_2',
          slot: 'ring',
          rarity: 'epic',
          name: 'Sigil Ring',
          level: 12,
          atk: 6,
          hp: 30,
          def: 3,
          power: 40,
          salvage: 20,
          enhance: 7,
          pity: 2,
          refines: 3,
          enchants: 2,
          substats: [{ key: 'crit', value: 0.014, locked: true }],
          runes: [
            { element: 'fire', value: 0.045 },
            null,
            null,
          ],
        },
      ],
      equipped: {},
    });

    const save = loadSave();
    const item = save?.inventory?.[0];
    expect(item?.enhance).toBe(7);
    expect(item?.pity).toBe(2);
    expect(item?.refines).toBe(3);
    expect(item?.enchants).toBe(2);
    expect(item?.substats).toEqual([{ key: 'crit', value: 0.014, locked: true }]);
    expect(item?.runes[0]).toEqual({ element: 'fire', value: 0.045 });
    expect(item?.runes).toHaveLength(3);
    expect(save?.essence).toBe(17);
    expect(save?.cores).toBe(6);
    expect(save?.boosts).toEqual({ offense: 3, defense: 0, fortune: 1, speed: 0, element: 0 });
    expect(save?.books).toBe(4);
    expect(save?.skills?.active?.[0]).toBe('ember-burst');
    expect(save?.skills?.levels?.['ember-burst']).toBe(4);
    expect(save?.skills?.passive).toBe('vitality');
    expect(save?.lastSeen).toBe(1_700_000_000_000);
    expect(save?.farmStage).toBe(4);
    expect(save?.stage).toBe(4);
    expect(save?.rift).toEqual({ day: '2026-10-23', kills: 14 });
    expect(save?.ascension?.count).toBe(2);
    expect(save?.ascension?.shards).toBe(9);
    expect(save?.ascension?.nodes).toEqual({ might: 3, 'head-start': 1 });
  });

  it('codex menyimpan penemuan dan membuang nama yang tidak dikenal', () => {
    writeSave(
      minimalSave({
        codex: {
          enemies: ['Moss Slime', 'Moss Slime', 'Ghost Of Nowhere'],
          items: ['Ember Cleaver', 'Nonexistent Blade'],
          modifiers: ['haste', 'bogus'],
          costumes: [],
          mounts: ['ember-steed', 'not-a-mount'],
          wings: ['rimepinions', 'not-a-wing'],
        },
      }),
    );

    expect(loadSave()?.codex).toEqual({
      enemies: ['Moss Slime'],
      items: ['Ember Cleaver'],
      modifiers: ['haste'],
      costumes: [],
      mounts: ['ember-steed'],
      wings: ['rimepinions'],
    });
  });

  it('migrasi v16 membawa costume dan membuang id yang tidak dikenal', () => {
    writeSave(
      minimalSave({
        version: 16,
        costume: {
          owned: ['void-regent', 'ash-ronin', 'bogus', 'void-regent'],
          equipped: 'bogus',
        },
      }),
    );

    const migrated = loadSave();
    expect(migrated?.version).toBe(23);
    expect(migrated?.costume).toEqual({
      owned: ['void-regent', 'ash-ronin'],
      equipped: null,
      pity: 0,
      mastered: false,
    });

    writeSave(minimalSave({ costume: { owned: ['void-regent'], equipped: 'void-regent' } }));
    expect(loadSave()?.costume).toEqual({
      owned: ['void-regent'],
      equipped: 'void-regent',
      pity: 0,
      mastered: false,
    });
  });

  it('migrasi v18 mulai tanpa palet, v19 menyimpan pilihan dan membersihkan id asing', () => {
    writeSave(minimalSave({ version: 18 }));
    expect(loadSave()).toMatchObject({ version: 23, palette: { worn: null, unlocked: [] } });

    writeSave(
      minimalSave({
        version: 19,
        palette: { worn: 'ashen', unlocked: ['ashen', 'champion', 'ghost', 'ashen'] },
      }),
    );
    expect(loadSave()?.palette).toEqual({ worn: 'ashen', unlocked: ['ashen', 'champion'] });

    // A palette that was never earned cannot be worn through a hand edit.
    writeSave(
      minimalSave({ version: 19, palette: { worn: 'trialborn', unlocked: ['ashen'] } }),
    );
    expect(loadSave()?.palette).toEqual({ worn: null, unlocked: ['ashen'] });
  });

  it('migrasi v19 mulai tanpa mount, v20 menyimpan stable, v21 menambah wing, v22 codex stable/wing', () => {
    writeSave(minimalSave({ version: 19 }));
    expect(loadSave()).toMatchObject({
      version: 23,
      mounts: { active: null, owned: {} },
      wings: { active: null, owned: {} },
      codex: { mounts: [], wings: [] },
      crystals: 0,
      dungeon: { tickets: 5 },
      shop: { tickets: 0, crystals: 0 },
    });

    writeSave(
      minimalSave({
        version: 20,
        crystals: 12,
        mounts: {
          active: 'ghost' as never,
          owned: {
            'ember-steed': { level: 4 },
            bogus: { level: 2 },
          } as never,
        },
      }),
    );
    expect(loadSave()?.mounts).toEqual({
      active: null,
      owned: { 'ember-steed': { level: 4 } },
    });

    writeSave(
      minimalSave({
        version: 21,
        wings: {
          active: 'rimepinions' as never,
          owned: {
            rimepinions: { level: 5 },
            bogus: { level: 9 },
          } as never,
        },
      }),
    );
    expect(loadSave()?.wings).toEqual({
      active: 'rimepinions',
      owned: { rimepinions: { level: 5 } },
    });

    writeSave(
      minimalSave({
        version: 21,
        dungeon: { day: '2026-10-25', tickets: 99 },
        shop: { day: '2026-10-25', tickets: 99, crystals: 99 },
      }),
    );
    expect(loadSave()).toMatchObject({
      dungeon: { tickets: 10 },
      shop: { tickets: 5, crystals: 2 },
    });
  });

  it('save korup tidak membuat game crash', () => {
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadSave()).toBeNull();
  });

  it('export menghasilkan kode portabel yang bisa di-import kembali', () => {
    writeSave(minimalSave({ lastSeen: 1_700_000_000_000 }));
    const code = exportSave();
    expect(code?.startsWith('IF1-')).toBe(true);

    localStorage.clear();
    expect(loadSave()).toBeNull();

    const imported = importSave(code!);
    expect(imported?.gold).toBe(4321);
    expect(loadSave()?.gold).toBe(4321);
    expect(loadSave()?.level).toBe(12);
  });

  it('import menyegarkan lastSeen supaya tidak memicu laporan offline', () => {
    writeSave(minimalSave({ lastSeen: 1_700_000_000_000 }));
    const code = exportSave()!;
    localStorage.clear();

    expect(importSave(code)).not.toBeNull();
    const restored = loadSave();
    expect(restored?.lastSeen).toBeDefined();
    expect(Date.now() - (restored?.lastSeen ?? 0)).toBeLessThan(5000);
  });

  it('import menerima JSON mentah dan menolak kode rusak', () => {
    const raw = JSON.stringify(minimalSave({ level: 7 }));
    expect(importSave(raw)?.level).toBe(7);

    expect(importSave('')).toBeNull();
    expect(importSave('IF1-%%%')).toBeNull();
    expect(importSave(`IF1-${btoa('{"version":99}')}`)).toBeNull();
    expect(importSave('not a save')).toBeNull();
  });

  it('export null kalau belum ada save', () => {
    expect(exportSave()).toBeNull();
  });
});
