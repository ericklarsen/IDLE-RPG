import { describe, expect, it } from 'vitest';
import {
  TRIAL_ATTEMPTS,
  TRIAL_FLOORS,
  TRIAL_RULES,
  TRIAL_UNLOCK_STAGE,
  emptyTrial,
  normalizeTrial,
  trialFloor,
  trialFloorInfo,
  trialReward,
  trialRollover,
  trialRules,
  trialSnapshot,
} from './trial';
import { weekKey } from './week';
import type { TrialState } from './types';

const MONDAY = new Date(2026, 9, 19, 9, 0, 0);
const NEXT_MONDAY = new Date(2026, 9, 26, 9, 0, 0);
const WEEK = '2026-10-19';

function trial(overrides: Partial<TrialState> = {}): TrialState {
  return { ...emptyTrial(WEEK), ...overrides };
}

describe('trial week', () => {
  it('mereset lantai dan retry setiap Senin', () => {
    const state = trial({ cleared: 4, attempts: 1 });
    const same = trialRollover(state, MONDAY);
    expect(same.settled).toBe(false);
    expect(same.trial).toBe(state);

    const { trial: fresh, settled } = trialRollover(state, NEXT_MONDAY);
    expect(settled).toBe(true);
    expect(fresh).toEqual({ key: '2026-10-26', cleared: 0, attempts: TRIAL_ATTEMPTS });
  });

  it('save lama mulai dari lantai 1 dengan tiga retry', () => {
    expect(normalizeTrial(null, MONDAY)).toEqual({
      key: WEEK,
      cleared: 0,
      attempts: TRIAL_ATTEMPTS,
    });
  });

  it('membersihkan angka liar dari save', () => {
    const cleaned = normalizeTrial({ key: 'x'.repeat(30), cleared: 99, attempts: -4 }, MONDAY);
    expect(cleaned).toMatchObject({ key: 'xxxxxxxxxx', cleared: TRIAL_FLOORS, attempts: 0 });

    const junk = normalizeTrial({ cleared: Number.NaN, attempts: Number.NaN }, MONDAY);
    expect(junk).toMatchObject({ cleared: 0, attempts: TRIAL_ATTEMPTS });
  });

  it('lantai berikutnya mengikuti lantai yang sudah clear', () => {
    expect(trialFloor(trial())).toBe(1);
    expect(trialFloor(trial({ cleared: 3 }))).toBe(4);
    expect(trialFloor(trial({ cleared: TRIAL_FLOORS }))).toBe(TRIAL_FLOORS);
  });
});

describe('trial floors', () => {
  it('menaikkan HP, ATK, dan DEF tiap lantai', () => {
    const first = trialFloorInfo(WEEK, 1, 40);
    const fifth = trialFloorInfo(WEEK, 5, 40);
    const last = trialFloorInfo(WEEK, 10, 40);

    expect(first.floor).toBe(1);
    expect(first.name.length).toBeGreaterThan(0);
    expect(fifth.hp).toBeGreaterThan(first.hp);
    expect(last.hp).toBeGreaterThan(fifth.hp);
    expect(last.atk).toBeGreaterThan(first.atk);
    expect(last.def).toBeGreaterThan(first.def);
    expect(first.atkSpeed).toBeGreaterThan(0);
  });

  it('memberi dua aturan unik yang sama sepanjang minggu', () => {
    for (let floor = 1; floor <= TRIAL_FLOORS; floor += 1) {
      const rules = trialRules(WEEK, floor);
      expect(rules).toHaveLength(2);
      expect(new Set(rules.map((rule) => rule.id)).size).toBe(2);
      expect(trialRules(WEEK, floor)).toEqual(rules);
      expect(TRIAL_RULES.some((rule) => rule.id === rules[0].id)).toBe(true);
    }

    const nextWeek = Array.from({ length: TRIAL_FLOORS }, (_, index) =>
      trialRules('2026-10-26', index + 1).map((rule) => rule.id).join('+'),
    );
    const thisWeek = Array.from({ length: TRIAL_FLOORS }, (_, index) =>
      trialRules(WEEK, index + 1).map((rule) => rule.id).join('+'),
    );
    expect(nextWeek).not.toEqual(thisWeek);
  });

  it('setiap aturan membawa pengali yang benar-benar dipakai', () => {
    for (const rule of TRIAL_RULES) {
      const values = [rule.hp, rule.atk, rule.def, rule.atkSpeed].filter(
        (value): value is number => value !== undefined,
      );
      expect(values.length).toBeGreaterThan(0);
      expect(values.some((value) => value !== 1)).toBe(true);
      expect(rule.desc.length).toBeGreaterThan(0);
    }
  });
});

describe('trial rewards', () => {
  it('membayar material yang naik per lantai tanpa gold', () => {
    const first = trialReward(1, 40);
    const fifth = trialReward(5, 40);
    const last = trialReward(10, 40);

    expect(first.gold).toBe(0);
    expect(first.cache).toBe(false);
    expect(fifth.dust).toBeGreaterThan(first.dust);
    expect(last.essence).toBeGreaterThan(fifth.essence);
    expect(first.cores).toBe(0);
    expect(fifth.cores).toBe(1);
    expect(last.cores).toBe(2);
  });

  it('hanya lantai 10 yang memberi cache', () => {
    expect(trialReward(9, 40).cache).toBe(false);
    const cache = trialReward(10, 40);
    expect(cache.cache).toBe(true);
    expect(cache.gold).toBeGreaterThan(0);
  });
});

describe('trial snapshot', () => {
  it('terkunci sebelum stage yang dibutuhkan', () => {
    const locked = trialSnapshot(trial(), TRIAL_UNLOCK_STAGE - 1, false, MONDAY);
    expect(locked.unlocked).toBe(false);
    // The first boss is previewed before the tower opens, like the rift rewards.
    expect(locked.next?.floor).toBe(1);

    const open = trialSnapshot(trial(), TRIAL_UNLOCK_STAGE, false, MONDAY);
    expect(open.unlocked).toBe(true);
    expect(open.next?.floor).toBe(1);
    expect(open.endsAt).toBe(new Date(2026, 9, 26, 0, 0).getTime());
  });

  it('menampilkan lantai berikutnya dan menutup tower setelah lantai 10', () => {
    const mid = trialSnapshot(trial({ cleared: 6, attempts: 2 }), 40, true, MONDAY);
    expect(mid).toMatchObject({ floor: 7, cleared: 6, attempts: 2, active: true, done: false });
    expect(mid.next?.floor).toBe(7);

    const done = trialSnapshot(trial({ cleared: TRIAL_FLOORS }), 40, false, MONDAY);
    expect(done.done).toBe(true);
    expect(done.next).toBeNull();
  });

  it('memakai kunci minggu berjalan untuk save baru', () => {
    expect(trial().key).toBe(WEEK);
    expect(weekKey(MONDAY)).toBe(WEEK);
  });
});
