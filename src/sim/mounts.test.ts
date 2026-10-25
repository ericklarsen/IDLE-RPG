import { describe, expect, it } from 'vitest';
import { MOUNTS, mountById, mountLevelCost, mountSkillChance } from '../data/mounts';
import { DUNGEON_TICKETS, DUNGEON_TICKET_CAP, SHOP_CRYSTAL_CAP } from '../data/dungeon';
import { BattleSim } from './battle';
import {
  addMount,
  craftMount,
  currentMounts,
  equipMount,
  mountBonuses,
  normalizeMounts,
  trainMount,
} from './mounts';
import { buyCrystal, buyTicket, crystalPrice, ticketPrice } from './dungeon';
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
    version: 20,
    level: 30,
    exp: 0,
    gold: 0,
    maxStage: 30,
    farmStage: 30,
    stage: 30,
    kills: 0,
    inventory: [],
    equipped: {},
    itemSeq: 10,
    ...overrides,
  };
}

function weapon(atk: number, hp: number) {
  return {
    id: 'it_1',
    slot: 'weapon' as const,
    rarity: 'epic' as const,
    name: 'Test Blade',
    level: 30,
    atk,
    hp,
    def: 40,
    power: 90,
    salvage: 12,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
  };
}

function runFor(sim: BattleSim, seconds: number): void {
  const step = 0.05;
  for (let i = 0; i < Math.round(seconds / step); i += 1) sim.tick(step);
}

const strong = { equipped: { weapon: weapon(2_000_000, 5_000_000) } };

describe('mount ownership', () => {
  it('normalisasi membuang mount tak dikenal dan level liar', () => {
    expect(normalizeMounts(null)).toEqual({ active: null, owned: {} });
    expect(
      normalizeMounts({
        active: 'ghost' as never,
        owned: {
          'ember-steed': { level: 4 },
          'storm-gryphon': { level: 99 },
          bogus: { level: 3 },
        } as never,
      }),
    ).toEqual({
      active: null,
      owned: { 'ember-steed': { level: 4 }, 'storm-gryphon': { level: 10 } },
    });

    // An older save without an `active` field rides its first mount; an explicit
    // null (the player rested it) must stay null after a reload.
    expect(
      normalizeMounts({ owned: { 'dusk-wolf': { level: 2 } } } as never).active,
    ).toBe('dusk-wolf');
    expect(
      normalizeMounts({ active: null, owned: { 'dusk-wolf': { level: 2 } } }).active,
    ).toBeNull();
  });

  it('hanya bisa menunggangi mount yang dimiliki', () => {
    const owned = addMount(currentMounts(), 'ember-steed');
    expect(owned?.active).toBe('ember-steed');
    expect(equipMount(owned!, 'frost-stag')).toBeNull();
    expect(equipMount(owned!, null)?.active).toBeNull();
  });

  it('craft dan training memakai gold plus crystal', () => {
    const empty = currentMounts();
    const info = mountById('ember-steed')!;
    expect(craftMount(empty, 'ember-steed', info.craft.gold - 1, info.craft.crystals)).toBeNull();
    expect(craftMount(empty, 'ember-steed', info.craft.gold, info.craft.crystals - 1)).toBeNull();

    const crafted = craftMount(empty, 'ember-steed', info.craft.gold, info.craft.crystals);
    expect(crafted?.mounts.owned['ember-steed']?.level).toBe(1);

    const cost = mountLevelCost(info, 1);
    expect(cost.crystals).toBeGreaterThan(0);
    expect(trainMount(crafted!.mounts, 'ember-steed', cost.gold, cost.crystals - 1)).toBeNull();

    const trained = trainMount(crafted!.mounts, 'ember-steed', cost.gold, cost.crystals);
    expect(trained?.level).toBe(2);
    expect(trainMount(trained!.mounts, 'ember-steed', 0, 0)).toBeNull();
  });

  it('bonus pasif dan skill naik bersama level', () => {
    const state = { active: 'storm-gryphon' as const, owned: { 'storm-gryphon': { level: 5 } } };
    const bonus = mountBonuses(state);
    const info = mountById('storm-gryphon')!;

    expect(bonus.atkPct).toBeCloseTo(info.atkPctPerLevel * 5);
    expect(bonus.hpPct).toBeGreaterThan(0);
    expect(mountSkillChance(info, 5)).toBeGreaterThan(mountSkillChance(info, 1));
    expect(mountSkillChance(info, 10)).toBeLessThanOrEqual(info.skill.chanceCap);
    expect(mountSkillChance(info, 0)).toBe(0);
  });
});

describe('mount di battle', () => {
  it('mount terpasang menaikkan ATK hero', () => {
    const plain = new BattleSim(makeSave(), seeded(1));
    const mounted = new BattleSim(
      makeSave({ mounts: { active: 'storm-gryphon', owned: { 'storm-gryphon': { level: 5 } } } }),
      seeded(1),
    );

    expect(mounted.hero.atk).toBeGreaterThan(plain.hero.atk);
    expect(mounted.snapshot().mounts.active).toBe('storm-gryphon');
    expect(mounted.snapshot().mounts.mounts.find((m) => m.id === 'storm-gryphon')?.unlocked).toBe(
      true,
    );
  });

  it('skill mount terpicu saat menyerang', () => {
    const sim = new BattleSim(
      makeSave({
        farmStage: 30,
        maxStage: 30,
        stage: 30,
        // A tanky but weak knight keeps the target alive long enough to land
        // several attacks, which is where the chance skill is rolled.
        equipped: { weapon: weapon(40, 5_000_000) },
        mounts: { active: 'ember-steed', owned: { 'ember-steed': { level: 10 } } },
      }),
      seeded(3),
    );

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    runFor(sim, 10);

    expect(events.some((event) => event.type === 'mountSkill')).toBe(true);
  });

  it('mount dan crystal tersimpan di save v22 dan selamat dari ascension', () => {
    const sim = new BattleSim(
      makeSave({
        maxStage: 60,
        farmStage: 60,
        stage: 60,
        mounts: { active: 'dusk-wolf', owned: { 'dusk-wolf': { level: 3 } } },
        crystals: 17,
      }),
      seeded(2),
    );

    const data = sim.saveData();
    expect(data.version).toBe(24);
    expect(data.crystals).toBe(17);
    expect(data.mounts?.active).toBe('dusk-wolf');
    expect(data.mounts?.owned?.['dusk-wolf']).toEqual({ level: 3 });

    const restored = new BattleSim(data, seeded(2));
    expect(restored.mounts.active).toBe('dusk-wolf');
    expect(restored.crystals).toBe(17);

    expect(restored.ascend().ok).toBe(true);
    expect(restored.mounts.owned['dusk-wolf']?.level).toBe(3);
    expect(restored.crystals).toBe(17);
  });
});

describe('dungeon run', () => {
  it('menghabiskan tiket, menang, dan membayar crystal serta mount', () => {
    const sim = new BattleSim(
      makeSave({ ...strong }),
      seeded(4),
      // Every roll lands, so the 1% mount has to drop.
      () => 0,
    );
    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));

    expect(sim.startDungeon('cinder')).toEqual({ ok: true });
    expect(sim.dungeonView().tickets).toBe(DUNGEON_TICKETS - 1);
    expect(sim.snapshot().dungeon.active).toBe(true);

    runFor(sim, 60);

    const end = events.find((event) => event.type === 'dungeonend');
    expect(end?.type).toBe('dungeonend');
    if (end?.type !== 'dungeonend') return;
    expect(end.result.win).toBe(true);
    expect(end.result.crystals).toBeGreaterThanOrEqual(3);
    expect(end.result.mount).toBe('ember-steed');
    expect(sim.crystals).toBe(end.result.crystals);
    expect(sim.mounts.owned['ember-steed']?.level).toBe(1);
    expect(sim.snapshot().dungeon.active).toBe(false);
  });

  it('kalah tetap menghabiskan tiket tanpa hadiah', () => {
    const sim = new BattleSim(makeSave(), seeded(5));
    sim.on(() => undefined);

    expect(sim.startDungeon('cinder')).toEqual({ ok: true });
    runFor(sim, 90);

    expect(sim.dungeonActive).toBe(false);
    expect(sim.snapshot().dungeon.tickets).toBe(DUNGEON_TICKETS - 1);
    expect(sim.crystals).toBe(0);
    expect(sim.mounts.owned['ember-steed']).toBeUndefined();
  });

  it('tier terkunci dan tiket habis ditolak', () => {
    const locked = new BattleSim(makeSave({ farmStage: 40, maxStage: 40 }), seeded(6));
    expect(locked.startDungeon('rime')).toMatchObject({ ok: false, reason: 'tier' });

    const broke = new BattleSim(makeSave({ dungeon: { day: '', tickets: 0 } }), seeded(6));
    expect(broke.startDungeon('cinder')).toMatchObject({ ok: false, reason: 'tickets' });
  });

  it('daily reset mengisi lima tiket dan menutup belanja', () => {
    const sim = new BattleSim(
      makeSave({
        dungeon: { day: '2000-01-01', tickets: 0 },
        shop: { day: '2000-01-01', tickets: 5, crystals: 2 },
      }),
      seeded(7),
    );

    expect(sim.dungeonView().tickets).toBe(DUNGEON_TICKETS);
    expect(sim.shopView()).toMatchObject({ ticketsBought: 0, crystalBought: 0 });
  });
});

describe('shop', () => {
  it('tiket naik harga dan berhenti di batas harian', () => {
    const sim = new BattleSim(
      makeSave({ gold: 10_000_000, ...strong }),
      seeded(8),
    );

    const first = sim.shopView().ticketPrice;
    expect(sim.buyDungeonTicket().ok).toBe(true);
    expect(sim.shopView().ticketPrice).toBeGreaterThan(first);
    expect(sim.dungeonView().tickets).toBe(DUNGEON_TICKETS + 1);

    for (let i = 1; i < DUNGEON_TICKET_CAP; i += 1) sim.buyDungeonTicket();
    expect(sim.shopView().ticketsBought).toBe(DUNGEON_TICKET_CAP);
    expect(sim.buyDungeonTicket()).toMatchObject({ ok: false, reason: 'cap' });
  });

  it('crystal dibatasi dua per hari', () => {
    const sim = new BattleSim(makeSave({ gold: 100_000_000 }), seeded(9));

    expect(sim.buyMountCrystal().ok).toBe(true);
    expect(sim.buyMountCrystal().ok).toBe(true);
    expect(sim.buyMountCrystal()).toMatchObject({ ok: false, reason: 'cap' });
    expect(sim.crystals).toBe(SHOP_CRYSTAL_CAP);
  });

  it('harga mengikuti farm stage dan gold kurang ditolak', () => {
    expect(ticketPrice(0, 50)).toBeGreaterThan(ticketPrice(0, 10));
    expect(crystalPrice(50)).toBeGreaterThan(crystalPrice(10));

    const sim = new BattleSim(makeSave({ gold: 0 }), seeded(10));
    expect(sim.buyDungeonTicket()).toMatchObject({ ok: false, reason: 'gold' });
    expect(sim.buyMountCrystal()).toMatchObject({ ok: false, reason: 'gold' });
  });

  it('pembelian tiket menambah tiket dan memotong gold', () => {
    const dungeon = { day: '2026-10-25', tickets: 5 };
    const shop = { day: '2026-10-25', tickets: 0, crystals: 0 };
    const price = ticketPrice(0, 30);
    const bought = buyTicket(dungeon, shop, price, 30);

    expect(bought?.dungeon.tickets).toBe(6);
    expect(bought?.gold).toBe(0);

    const crystal = buyCrystal(shop, crystalPrice(30), 30);
    expect(crystal?.shop.crystals).toBe(1);
  });
});

describe('roster', () => {
  it('menyediakan beberapa mount dengan tier dan skill berbeda', () => {
    expect(MOUNTS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(MOUNTS.map((mount) => mount.id)).size).toBe(MOUNTS.length);
    expect(new Set(MOUNTS.map((mount) => mount.skill.kind)).size).toBeGreaterThan(1);
    for (const mount of MOUNTS) {
      expect(mount.skill.chanceBase).toBeGreaterThan(0);
      expect(mount.skill.chanceCap).toBeLessThanOrEqual(1);
      expect(mount.craft.crystals).toBeGreaterThan(0);
    }
  });
});
