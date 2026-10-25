import { describe, expect, it } from 'vitest';
import { MATE_LIMIT, mateSpots } from './layout';

describe('arena party layout', () => {
  it('puts nobody on the field for a solo party', () => {
    expect(mateSpots(105, 0)).toEqual([]);
  });

  it('lines the rest of the party up behind and to the left of the leader', () => {
    const spots = mateSpots(105, 4);
    expect(spots).toHaveLength(4);

    // Nearest first: each one further left and smaller than the last.
    for (let i = 1; i < spots.length; i += 1) {
      expect(spots[i].x).toBeLessThan(spots[i - 1].x);
      expect(spots[i].scale).toBeLessThan(spots[i - 1].scale);
    }
    expect(spots[0].x).toBeLessThan(105);
  });

  it('keeps every body clear of the screen edge', () => {
    for (const heroX of [40, 105, 121]) {
      for (const spot of mateSpots(heroX, 4)) {
        // A 32px sprite at 1.35 scale is 43px wide, so 24px leaves it on screen.
        expect(spot.x).toBeGreaterThanOrEqual(24);
        expect(spot.x).toBeLessThanOrEqual(390 - 24);
      }
    }
  });

  it('never draws more bodies than the party can hold', () => {
    expect(mateSpots(105, 9)).toHaveLength(MATE_LIMIT);
    expect(MATE_LIMIT).toBe(4);
    // Junk counts fall back to an empty field instead of throwing.
    expect(mateSpots(105, -2)).toEqual([]);
  });
});
