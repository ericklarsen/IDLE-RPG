import { describe, expect, it } from 'vitest';
import { DUNGEON_TICKETS, DUNGEON_TICKET_CAP } from '../data/dungeon';
import { wingById } from '../data/wings';
import { BattleSim } from './battle';
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
    version: 22,
    level: 40,
    exp: 0,
    gold: 0,
    maxStage: 70,
    farmStage: 70,
    stage: 70,
    kills: 0,
    inventory: [],
    equipped: {},
    itemSeq: 10,
    ...overrides,
  };
}

const strong = {
  equipped: {
    weapon: {
      id: 'it_1',
      slot: 'weapon' as const,
      rarity: 'epic' as const,
      name: 'Cheat Blade',
      level: 40,
      atk: 2_000_000,
      hp: 5_000_000,
      def: 40,
      power: 90,
      salvage: 12,
      enhance: 0,
      pity: 0,
      refines: 0,
      enchants: 0,
      substats: [],
      runes: [null, null, null],
    },
  },
};

describe('cheat grants', () => {
  it('memberi mount tanpa biaya dan bisa menaikkan level yang sudah dimiliki', () => {
    const sim = new BattleSim(makeSave(), seeded(1));
    expect(sim.debugGrantMount('ember-steed', 4)).toBe(4);
    expect(sim.mounts.owned['ember-steed']).toEqual({ level: 4 });
    expect(sim.mounts.active).toBe('ember-steed');
    expect(sim.codex.mounts).toEqual(['ember-steed']);

    // The same call re-levels an owned mount, clamped to its ceiling.
    expect(sim.debugGrantMount('ember-steed', 99)).toBe(10);
    expect(sim.mounts.owned['ember-steed']).toEqual({ level: 10 });

    expect(sim.debugGrantMount('bogus')).toBeNull();
    expect(sim.debugGrantMount('ember-steed', 0)).toBe(1);
  });

  it('memberi wing, mengisi codex, dan menaikkan stat hero', () => {
    const plain = new BattleSim(makeSave(), seeded(2));
    const sim = new BattleSim(makeSave(), seeded(2));

    expect(sim.debugGrantWing('stormpinions', 12)).toBe(12);
    expect(sim.wings.active).toBe('stormpinions');
    expect(sim.wings.owned.stormpinions).toEqual({ level: 12 });
    expect(sim.codex.wings).toEqual(['stormpinions']);
    expect(sim.hero.atk).toBeGreaterThan(plain.hero.atk);
    expect(sim.debugGrantWing('nope')).toBeNull();
  });

  it('menambah resource dan tiket dengan batas harian', () => {
    const sim = new BattleSim(makeSave({ gold: 10, crystals: 2, dust: 0 }), seeded(3));

    sim.debugGrantResources({ gold: 1_000_000, crystals: 100, dust: 500, books: 50, cores: 20 });
    expect(sim.gold).toBe(1_000_010);
    expect(sim.crystals).toBe(102);
    expect(sim.dust).toBe(500);
    expect(sim.books).toBe(50);
    expect(sim.cores).toBe(20);

    // Negative and non-finite values are ignored instead of draining the run.
    sim.debugGrantResources({ gold: -500, crystals: Number.NaN });
    expect(sim.gold).toBe(1_000_010);
    expect(sim.crystals).toBe(102);

    expect(sim.debugAddTickets()).toBe(DUNGEON_TICKETS + 5);
    expect(sim.dungeonView().tickets).toBe(DUNGEON_TICKETS + DUNGEON_TICKET_CAP);
  });

  it('melompat ke stage 70 dan membuka dungeon', () => {
    const sim = new BattleSim(makeSave({ maxStage: 1, farmStage: 1, stage: 1 }), seeded(4));
    expect(sim.dungeonUnlocked).toBe(false);

    expect(sim.debugUnlockStage(70)).toBe(true);
    expect(sim.farmStage).toBe(70);
    expect(sim.maxStage).toBe(70);
    expect(sim.stage).toBe(70);
    expect(sim.dungeonUnlocked).toBe(true);
    expect(sim.enemy.hp).toBeGreaterThan(0);
  });

  it('menolak lompatan stage di tengah dungeon run', () => {
    const sim = new BattleSim(makeSave({ ...strong }), seeded(5));
    expect(sim.startDungeon('cinder')).toEqual({ ok: true });

    expect(sim.debugUnlockStage(90)).toBe(false);
    expect(sim.stage).toBe(30);
    expect(sim.dungeonActive).toBe(true);
  });

  it('wing level 12 lewat cheat memakai skill saat bertarung', () => {
    // A tanky but weak knight keeps the target alive long enough to roll the
    // chance skill on several attacks.
    const sim = new BattleSim(
      makeSave({
        equipped: { weapon: { ...strong.equipped.weapon, atk: 40, hp: 5_000_000 } },
      }),
      seeded(6),
    );
    expect(sim.debugGrantWing('rimepinions', 12)).toBe(wingById('rimepinions')?.maxLevel);

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    for (let i = 0; i < 200; i += 1) sim.tick(0.05);

    expect(sim.wings.active).toBe('rimepinions');
    expect(events.some((event) => event.type === 'wingSkill')).toBe(true);
  });
});
