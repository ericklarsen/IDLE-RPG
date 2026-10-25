/**
 * Screen layout for the party in the arena.
 *
 * The leader keeps its old spot; everyone else stands behind and to the left,
 * getting slightly smaller with distance so the group reads as depth rather
 * than a single blob. Kept out of the scene so the arrangement can be tested
 * without a canvas.
 */
export interface MateSpot {
  x: number;
  scale: number;
}

/** Offsets behind the leader, nearest first. */
const OFFSETS = [26, 44, 58, 68];
/** Far members are drawn smaller, which is what sells the row. */
const SCALES = [1.7, 1.55, 1.45, 1.35];
/** Never draw a body this close to the screen edge. */
const MIN_X = 24;

export const MATE_LIMIT = OFFSETS.length;

export function mateSpots(heroX: number, count: number): MateSpot[] {
  const spots: MateSpot[] = [];
  const total = Math.max(0, Math.min(Math.floor(count), MATE_LIMIT));

  for (let i = 0; i < total; i += 1) {
    spots.push({ x: Math.max(MIN_X, heroX - OFFSETS[i]), scale: SCALES[i] });
  }
  return spots;
}
