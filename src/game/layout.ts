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

export interface EnemySpot {
  x: number;
  /** Pixels above the ground line; further back reads as higher up. */
  lift: number;
  scale: number;
}

/** Offsets behind the front monster, nearest first. */
const PACK_OFFSETS = [24, 44, 58, 70];
const PACK_LIFTS = [8, 14, 19, 23];
const PACK_SCALES = [0.92, 0.86, 0.8, 0.75];
/** Bodies stay clear of the right edge at 390 px. */
const MAX_ENEMY_X = 356;

export const PACK_LIMIT = PACK_OFFSETS.length;

/**
 * Extra monsters in a wave stand behind the front one and to its right.
 * They shrink with distance, which is all the depth a 390 px arena needs.
 */
export function enemySpots(frontX: number, count: number): EnemySpot[] {
  const spots: EnemySpot[] = [];
  const extras = Math.max(0, Math.min(Math.floor(count) - 1, PACK_LIMIT));

  for (let i = 0; i < extras; i += 1) {
    spots.push({
      x: Math.min(MAX_ENEMY_X, frontX + PACK_OFFSETS[i]),
      lift: PACK_LIFTS[i],
      scale: PACK_SCALES[i],
    });
  }
  return spots;
}

export function mateSpots(heroX: number, count: number): MateSpot[] {
  const spots: MateSpot[] = [];
  const total = Math.max(0, Math.min(Math.floor(count), MATE_LIMIT));

  for (let i = 0; i < total; i += 1) {
    spots.push({ x: Math.max(MIN_X, heroX - OFFSETS[i]), scale: SCALES[i] });
  }
  return spots;
}
