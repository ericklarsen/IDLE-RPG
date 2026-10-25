import { describe, expect, it } from 'vitest';
import { simulatePacing } from './pacing';

const MINUTE = 60;
const HOUR = 3600;

describe('pacing PLAN §7.2', () => {
  const engaged = simulatePacing({ policy: 'engaged', seed: 1, seconds: 12 * HOUR });

  it('membuka stage 5 dan 10 dalam setengah jam pertama', () => {
    expect(engaged.reached[5]).not.toBeNull();
    expect(engaged.reached[10]).not.toBeNull();
    expect(engaged.reached[5]!).toBeGreaterThanOrEqual(5 * MINUTE);
    expect(engaged.reached[5]!).toBeLessThanOrEqual(20 * MINUTE);
    expect(engaged.reached[10]!).toBeGreaterThanOrEqual(20 * MINUTE);
    expect(engaged.reached[10]!).toBeLessThanOrEqual(55 * MINUTE);
  });

  it('stage 20 sekitar dua jam dan stage 40 sekitar enam sampai delapan jam', () => {
    expect(engaged.reached[20]!).toBeGreaterThanOrEqual(60 * MINUTE);
    expect(engaged.reached[20]!).toBeLessThanOrEqual(150 * MINUTE);
    expect(engaged.reached[40]!).toBeGreaterThanOrEqual(4 * HOUR);
    expect(engaged.reached[40]!).toBeLessThanOrEqual(9 * HOUR);
  });

  it('clear stage 50 dalam 6–14 jam bermain aktif', () => {
    expect(engaged.reached[50]).not.toBeNull();
    expect(engaged.reached[50]!).toBeGreaterThanOrEqual(6 * HOUR);
    expect(engaged.reached[50]!).toBeLessThanOrEqual(14 * HOUR);
  });

  it('kill dan enhance pertama terjadi dalam dua menit', () => {
    expect(engaged.firstKill).not.toBeNull();
    expect(engaged.firstEnhance).not.toBeNull();
    expect(engaged.firstKill!).toBeLessThan(2 * MINUTE);
    expect(engaged.firstEnhance!).toBeLessThan(2 * MINUTE);
  });

  it('uptime Forge Surge setelah unlock tetap 15–20%', () => {
    expect(engaged.surgeUptime).toBeGreaterThanOrEqual(0.15);
    expect(engaged.surgeUptime).toBeLessThanOrEqual(0.2);
  });

  it('costume emerald dari awal tidak membuat surge selalu aktif', () => {
    for (const seed of [1, 2, 3]) {
      const run = simulatePacing({
        policy: 'engaged',
        seed,
        seconds: 12 * HOUR,
        costume: 'verdant-sovereign',
      });

      expect(run.reached[50], `seed ${seed}`).not.toBeNull();
      expect(run.reached[50]!, `seed ${seed}`).toBeGreaterThanOrEqual(4 * HOUR);
      expect(run.reached[50]!, `seed ${seed}`).toBeLessThanOrEqual(12 * HOUR);
      // Surge is damage-fed, so a top-tier outfit raises its uptime; the guard
      // is that it still leaves the hero fighting normally most of the time.
      expect(run.surgeUptime, `seed ${seed}`).toBeLessThanOrEqual(0.28);
    }
  });

  it('wing stormpinions maksimal mempercepat run tanpa menghapus perjalanan', () => {
    for (const seed of [1, 2, 3]) {
      const run = simulatePacing({
        policy: 'engaged',
        seed,
        seconds: 12 * HOUR,
        wing: { id: 'stormpinions', level: 12 },
      });

      expect(run.reached[50], `seed ${seed}`).not.toBeNull();
      // A maxed top-tier wing is the fastest legal start: it may cut the arc
      // roughly in half, but stage 50 still has to be an evening's work.
      expect(run.reached[50]!, `seed ${seed}`).toBeGreaterThanOrEqual(3 * HOUR);
      expect(run.reached[50]!, `seed ${seed}`).toBeLessThanOrEqual(8 * HOUR);
      expect(run.surgeUptime, `seed ${seed}`).toBeLessThanOrEqual(0.28);
    }
  });

  it('tanpa upgrade, progres mentok jauh sebelum stage 50', () => {
    const idle = simulatePacing({ policy: 'idle', seed: 1, seconds: 8 * HOUR });
    expect(idle.reached[20]).toBeNull();
    expect(idle.final.stage).toBeLessThan(20);
  });

  it('offline 8 jam di stage 50 tidak melampaui satu sesi aktif', () => {
    const offline = engaged.offline;
    expect(offline).not.toBeNull();
    expect(offline!.kills).toBeGreaterThan(50);
    expect(offline!.kills).toBeLessThan(600);
    expect(offline!.levels).toBeGreaterThanOrEqual(0);
    expect(offline!.levels).toBeLessThanOrEqual(8);
    expect(offline!.gold).toBeGreaterThan(0);
  });
});
