import { describe, expect, it } from 'vitest';
import { BattleSim } from './battle';
import {
  EVENT_GOAL,
  eventCountdown,
  eventWindow,
  nextEventStart,
  normalizeEvent,
} from './event';
import type { Item, SaveData } from './types';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function weapon(atk = 4000): Item {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'epic',
    name: 'Test Blade',
    level: 20,
    atk,
    hp: 0,
    def: 0,
    power: 100,
    salvage: 10,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
  };
}

function save(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 12,
    level: 30,
    exp: 0,
    gold: 0,
    maxStage: 12,
    farmStage: 12,
    stage: 12,
    kills: 0,
    itemSeq: 1,
    inventory: [],
    equipped: { weapon: weapon() },
    ...overrides,
  };
}

function runFor(sim: BattleSim, seconds: number): void {
  const step = 0.05;
  for (let i = 0; i < Math.round(seconds / step); i += 1) sim.tick(step);
}

describe('Emberfall window', () => {
  it('runs Friday through Sunday on one key', () => {
    const friday = eventWindow(new Date(2026, 9, 23, 12));
    const saturday = eventWindow(new Date(2026, 9, 24, 3));
    const sunday = eventWindow(new Date(2026, 9, 25, 23, 30));

    expect(friday.active).toBe(true);
    expect(friday.key).toBe('2026-10-23');
    expect(saturday.key).toBe(friday.key);
    expect(sunday.key).toBe(friday.key);
    expect(new Date(friday.startsAt).getHours()).toBe(0);
    expect(friday.endsAt - friday.startsAt).toBeGreaterThan(3 * 86_400_000 - 1000);
  });

  it('is closed Monday to Thursday but keeps naming the coming Friday', () => {
    const monday = eventWindow(new Date(2026, 9, 26, 9));
    const wednesday = eventWindow(new Date(2026, 9, 21, 18));

    expect(monday.active).toBe(false);
    expect(wednesday.active).toBe(false);
    expect(monday.key).toBe('2026-10-30');
    expect(wednesday.key).toBe('2026-10-23');
    expect(nextEventStart(new Date(2026, 9, 26, 9))).toBe(
      new Date(2026, 9, 30, 0, 0, 0, 0).getTime(),
    );
  });

  it('formats a compact countdown', () => {
    expect(eventCountdown(2 * 86_400_000 + 4 * 3_600_000)).toBe('2d 4h');
    expect(eventCountdown(5 * 3_600_000 + 12 * 60_000)).toBe('5h 12m');
    expect(eventCountdown(8 * 60_000)).toBe('8m');
    expect(eventCountdown(-5)).toBe('0m');
  });

  it('normalizes stored event state', () => {
    expect(normalizeEvent(null)).toEqual({ key: '', bosses: 0, claimed: false });
    expect(normalizeEvent({ key: '2026-10-23T99', bosses: -4, claimed: 'yes' as never })).toEqual({
      key: '2026-10-23',
      bosses: 0,
      claimed: false,
    });
  });
});

describe('Emberfall progression', () => {
  it('counts bosses and resets when the week changes', () => {
    const sim = new BattleSim(save(), seeded(1));
    sim.setEvent(true, '2026-10-23', 0, 0);
    expect(sim.snapshot().event.active).toBe(true);

    sim.event.bosses = 3;
    expect(sim.snapshot().event.bosses).toBe(3);

    sim.setEvent(true, '2026-10-30', 0, 0);
    expect(sim.snapshot().event.bosses).toBe(0);
    expect(sim.snapshot().event.claimed).toBe(false);
  });

  it('clears the finished week once the calendar moves on', () => {
    const sim = new BattleSim(
      save({ event: { key: '2026-10-23', bosses: 5, claimed: true } }),
      seeded(1),
    );
    expect(sim.snapshot().event.claimed).toBe(true);

    sim.setEvent(false, '2026-10-30', 0, 0);
    expect(sim.event).toEqual({ key: '2026-10-30', bosses: 0, claimed: false });
  });

  it('drops Emberforged from bosses only during the event', () => {
    const eventSim = new BattleSim(save(), seeded(4));
    eventSim.setEvent(true, '2026-10-23', 0, 0);
    runFor(eventSim, 400);

    expect(eventSim.event.bosses).toBeGreaterThan(0);
    const eventDrops = eventSim.inventory.filter((item) => item.set === 'emberforged');
    expect(eventDrops.length).toBeGreaterThan(0);
  });

  it('keeps the exclusive set out of ordinary loot', () => {
    const sim = new BattleSim(save(), seeded(4));
    sim.setEvent(false, '', 0, 0);
    runFor(sim, 90);

    expect(sim.inventory.length).toBeGreaterThan(0);
    expect(sim.inventory.every((item) => item.set !== 'emberforged')).toBe(true);
  });

  it('unlocks one cache per week once the boss goal is met', () => {
    const sim = new BattleSim(save(), seeded(7));
    sim.setEvent(true, '2026-10-23', 0, 0);

    expect(sim.claimEvent()).toEqual({ ok: false, reason: 'progress' });

    sim.event.bosses = EVENT_GOAL;
    const first = sim.claimEvent();
    expect(first.ok).toBe(true);
    expect(first.item?.set).toBe('emberforged');
    expect(first.item?.rarity).not.toBe('common');

    expect(sim.claimEvent()).toEqual({ ok: false, reason: 'claimed' });
  });

  it('refuses to claim outside the window or before stage 10', () => {
    const inactive = new BattleSim(save(), seeded(1));
    inactive.setEvent(false, '2026-10-23', 0, 0);
    inactive.event.bosses = EVENT_GOAL;
    expect(inactive.claimEvent()).toEqual({ ok: false, reason: 'inactive' });

    const locked = new BattleSim(save({ maxStage: 6, farmStage: 6 }), seeded(1));
    locked.setEvent(true, '2026-10-23', 0, 0);
    locked.event.bosses = EVENT_GOAL;
    expect(locked.claimEvent()).toEqual({ ok: false, reason: 'locked' });
  });

  it('persists event progress through save and reload', () => {
    const sim = new BattleSim(save(), seeded(2));
    sim.setEvent(true, '2026-10-23', 0, 0);
    sim.event.bosses = 4;

    const restored = new BattleSim(sim.saveData(), seeded(2));
    expect(restored.event).toEqual({ key: '2026-10-23', bosses: 4, claimed: false });
    expect(restored.saveData().version).toBe(24);
  });
});
