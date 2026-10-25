import { describe, expect, it } from 'vitest';
import {
  ARENA_POINTS_LOSS,
  ARENA_POINTS_WIN,
  ARENA_TICKETS,
  ARENA_TIERS,
  arenaEggChance,
  arenaReward,
  arenaRivals,
  arenaSnapshot,
  arenaTierIndex,
  arenaTierInfo,
  emptyArena,
  normalizeArena,
} from './arena';
import { dayKey } from './rift';
import type { ArenaRival } from './types';

const BASE = { atk: 120, maxHp: 900, def: 30, atkSpeed: 1.2 };

describe('arena ladder', () => {
  it('memetakan poin ke pangkat pada batas yang tepat', () => {
    expect(arenaTierIndex(0)).toBe(0);
    expect(arenaTierIndex(119)).toBe(0);
    expect(arenaTierIndex(120)).toBe(1);
    expect(arenaTierIndex(299)).toBe(1);
    expect(arenaTierIndex(300)).toBe(2);
    expect(arenaTierIndex(599)).toBe(2);
    expect(arenaTierIndex(600)).toBe(3);
    expect(arenaTierIndex(999)).toBe(3);
    expect(arenaTierIndex(1000)).toBe(4);

    expect(arenaTierInfo(130)).toMatchObject({ name: 'Knight', next: 'Champion', into: 10 });
    expect(arenaTierInfo(130).span).toBe(ARENA_TIERS[2].min - ARENA_TIERS[1].min);
    expect(arenaTierInfo(1500)).toMatchObject({ name: 'Legend', next: null });
  });

  it('pindah pangkat hanya di ambang, bukan di tengah', () => {
    expect(arenaTierInfo(299).name).toBe('Knight');
    expect(arenaTierInfo(300).name).toBe('Champion');
  });
});

describe('daily rivals', () => {
  it('menghasilkan tiga rival sah dan berurutan dari mudah ke sulit', () => {
    const rivals = arenaRivals('2026-10-24', BASE);
    expect(rivals).toHaveLength(3);
    rivals.forEach((rival, index) => {
      expect(rival.id).toBe(`2026-10-24-${index}`);
      expect(rival.name.length).toBeGreaterThan(0);
      expect(rival.element).toMatch(/^(fire|ice|lightning|holy|dark)$/);
      expect(rival.hp).toBeGreaterThan(0);
      expect(rival.atk).toBeGreaterThan(0);
      expect(rival.atkSpeed).toBeGreaterThan(0);
      expect(rival.build).toContain('·');
    });
    expect(rivals[0].hp).toBeLessThan(rivals[1].hp);
    expect(rivals[1].hp).toBeLessThan(rivals[2].hp);
    expect(rivals[0].atk).toBeLessThan(rivals[1].atk);
    expect(rivals[1].atk).toBeLessThan(rivals[2].atk);
    expect(new Set(rivals.map((rival) => rival.element)).size).toBe(3);
    expect(new Set(rivals.map((rival) => rival.name)).size).toBe(3);
  });

  it('stabil sepanjang hari dan berganti esok hari', () => {
    const first = arenaRivals('2026-10-24', BASE);
    const again = arenaRivals('2026-10-24', BASE);
    const next = arenaRivals('2026-10-25', BASE);
    expect(again).toEqual(first);
    expect(next).not.toEqual(first);
  });

  it('mengikuti kekuatan pemain saat snapshot diambil', () => {
    const weak = arenaRivals('2026-10-24', { ...BASE, atk: 60, maxHp: 450 });
    const strong = arenaRivals('2026-10-24', BASE);
    expect(strong[1].atk).toBeGreaterThan(weak[1].atk);
    expect(strong[1].hp).toBeGreaterThan(weak[1].hp);
    expect(strong[1].name).toBe(weak[1].name);
  });
});

describe('arena snapshot & reward', () => {
  it('menandai rival yang sudah dilawan dan menyertakan tiket', () => {
    const rivals = arenaRivals(dayKey(), BASE);
    const state = {
      day: dayKey(),
      tickets: ARENA_TICKETS - 1,
      points: 150,
      wins: 2,
      losses: 1,
      rivals,
      fought: [rivals[1].id],
    };
    const snapshot = arenaSnapshot(state, true, false);
    expect(snapshot.tickets).toBe(2);
    expect(snapshot.maxTickets).toBe(ARENA_TICKETS);
    expect(snapshot.rivals[1].fought).toBe(true);
    expect(snapshot.rivals[0].fought).toBe(false);
    expect(snapshot).toMatchObject({ tier: 'Knight', nextTier: 'Champion', points: 150 });
  });

  it('tidak memberi hadiah saat kalah dan menaikkan hadiah per pangkat', () => {
    expect(arenaReward(false, 900, 30)).toEqual({ gold: 0, essence: 0, cores: 0 });
    const squire = arenaReward(true, 0, 30);
    const champion = arenaReward(true, 400, 30);
    expect(squire.gold).toBeGreaterThan(0);
    expect(champion.essence).toBeGreaterThan(squire.essence);
    expect(champion.cores).toBeGreaterThan(squire.cores);
  });

  it('telur wisp hanya jatuh dari Champion ke atas', () => {
    expect(arenaEggChance(0)).toBe(0);
    expect(arenaEggChance(1)).toBe(0);
    expect(arenaEggChance(2)).toBeGreaterThan(0);
    expect(arenaEggChance(3)).toBeGreaterThan(arenaEggChance(2));
    expect(arenaEggChance(4)).toBeGreaterThan(arenaEggChance(3));
    expect(arenaEggChance(9)).toBeLessThanOrEqual(1);
  });

  it('poin menang dan kalah tetap positif sebagai konstanta', () => {
    expect(ARENA_POINTS_WIN).toBeGreaterThan(0);
    expect(ARENA_POINTS_LOSS).toBeGreaterThan(0);
  });
});

describe('arena normalization', () => {
  it('menolak state tanpa hari dan membersihkan angka liar', () => {
    expect(normalizeArena(null)).toBeNull();
    expect(normalizeArena({})).toBeNull();

    const rivals = arenaRivals('2026-10-24', BASE);
    const cleaned = normalizeArena({
      day: '2026-10-24T23:00:00.000Z',
      tickets: 99,
      points: -50,
      wins: 3.9,
      losses: Number.NaN,
      rivals: [...rivals, { nonsense: true } as never],
      fought: [rivals[0].id, 'ghost', rivals[0].id],
    });

    expect(cleaned).not.toBeNull();
    expect(cleaned?.day).toBe('2026-10-24');
    expect(cleaned?.tickets).toBe(ARENA_TICKETS);
    expect(cleaned?.points).toBe(0);
    expect(cleaned?.wins).toBe(3);
    expect(cleaned?.losses).toBe(0);
    expect(cleaned?.rivals).toHaveLength(3);
    expect(cleaned?.fought).toEqual([rivals[0].id]);
  });

  it('membuang rival dengan stat mustahil', () => {
    const cleaned = normalizeArena({
      day: '2026-10-24',
      tickets: 1,
      points: 10,
      rivals: [
        { id: 'a', name: 'A', element: 'fire', hp: 0, atk: 1, def: 1, atkSpeed: 1, power: 1, build: 'x' },
        { id: 'b', name: 'B', element: 'storm', hp: 10, atk: 1, def: 1, atkSpeed: 1, power: 1, build: 'x' },
      ] as unknown as ArenaRival[],
      fought: [],
    });
    expect(cleaned?.rivals).toEqual([]);
  });

  it('emptyArena memulai dengan tiket penuh dan tanpa poin', () => {
    const state = emptyArena('2026-10-24');
    expect(state).toMatchObject({ tickets: ARENA_TICKETS, points: 0, rivals: [], fought: [] });
  });
});
