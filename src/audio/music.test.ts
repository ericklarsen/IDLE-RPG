import { describe, expect, it } from 'vitest';
import { BEAT_MS, CHORDS, RIFT_ARP, musicEvents } from './music';

describe('music layering', () => {
  it('keeps the farm loop sparse: one pad every 21 beats', () => {
    expect(musicEvents('calm', 0)).toHaveLength(1);
    expect(musicEvents('calm', 0)[0]).toMatchObject({ type: 'pad', freqs: CHORDS.calm[0] });

    for (let step = 1; step < 21; step += 1) {
      expect(musicEvents('calm', step)).toEqual([]);
    }

    // The pad comes back on the next cycle with the second chord.
    expect(musicEvents('calm', 21)[0]).toMatchObject({
      type: 'pad',
      freqs: CHORDS.calm[1],
    });
  });

  it('gives bosses a bass pulse and a darker progression', () => {
    const opening = musicEvents('boss', 0);
    expect(opening.some((event) => event.type === 'pad')).toBe(true);
    expect(opening.some((event) => event.type === 'tone' && event.freq === 56)).toBe(true);

    for (let step = 1; step < 30; step += 1) {
      const bass = musicEvents('boss', step).filter(
        (event) => event.type === 'tone' && event.freq === 56,
      );
      expect(bass).toHaveLength(step % 3 === 0 ? 1 : 0);
    }

    // Boss chords sit in a lower register than the farm loop.
    const bossRoot = Math.min(...CHORDS.boss.flat());
    const calmRoot = Math.min(...CHORDS.calm.flat());
    expect(bossRoot).toBeLessThan(calmRoot);
  });

  it('drives rifts with a running arpeggio and off-beat hats', () => {
    for (let step = 0; step < 32; step += 1) {
      const events = musicEvents('rift', step);
      const arp = events.filter((event) => event.type === 'tone');
      expect(arp).toHaveLength(1);
      const first = arp[0];
      if (first.type !== 'tone') throw new Error('expected a tone');
      expect(first.freq).toBe(RIFT_ARP[step % RIFT_ARP.length]);

      const hats = events.filter((event) => event.type === 'noise');
      expect(hats).toHaveLength(step % 2 === 1 ? 1 : 0);
    }

    expect(musicEvents('rift', 15).some((event) => event.type === 'pad')).toBe(true);
  });

  it('keeps every layer quiet enough to stack without clipping', () => {
    for (const mood of ['calm', 'boss', 'rift'] as const) {
      for (let step = 0; step < 60; step += 1) {
        for (const event of musicEvents(mood, step)) {
          expect(event.peak).toBeGreaterThan(0);
          expect(event.peak).toBeLessThanOrEqual(0.05);
        }
      }
    }
  });

  it('runs at a beat length that fits the loops', () => {
    expect(BEAT_MS).toBe(240);
    expect((BEAT_MS / 1000) * 21).toBeGreaterThanOrEqual(5);
  });
});
