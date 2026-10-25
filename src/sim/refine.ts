import { BALANCE } from '../data/balance';
import { RARITY, SLOTS } from '../data/items';
import type { Equipped, Item, RefineResonance, RefineState, Slot } from './types';

/**
 * Refine model, adapted from Ragnarok Origin's enchantment.
 *
 * The price of an attempt never grows: it is fixed by the item's level and
 * rarity. What grows is a per-slot refine level, fed by a progress bar, and
 * that level raises the best substat quality an attempt can roll. Equipment
 * swaps keep the slot's level, so replacing a sword never throws away months of
 * rolls. Six slots at 10/15/20 unlock resonance bonuses.
 *
 * The earlier model charged `1.55 ^ refines`, which reached millions of gold
 * per attempt at 20 rolls and made a bad roll feel like a loss. Here a bad roll
 * still fills the bar.
 */

export type RefineMap = Record<Slot, RefineState>;

const EMPTY: RefineState = { level: 0, progress: 0, pity: 0 };

function clampInt(value: unknown, min: number, max: number): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

export function emptyRefine(): RefineMap {
  return Object.fromEntries(SLOTS.map((slot) => [slot, { ...EMPTY }])) as RefineMap;
}

export function normalizeRefine(
  raw?: Partial<Record<Slot, Partial<RefineState>>> | null,
): RefineMap {
  const result = emptyRefine();
  if (!raw) return result;

  for (const slot of SLOTS) {
    const entry = raw[slot];
    if (!entry || typeof entry !== 'object') continue;

    const level = clampInt(entry.level, 0, BALANCE.refineMax);
    const maxProgress = level >= BALANCE.refineMax ? 0 : BALANCE.refineProgress - 1;
    result[slot] = {
      level,
      progress: clampInt(entry.progress, 0, Math.max(0, maxProgress)),
      pity: clampInt(entry.pity, 0, BALANCE.refinePity),
    };
  }
  return result;
}

/** Flat per-attempt price: item level and rarity only, never the roll count. */
export function refineCostFor(item: Item): number {
  return Math.ceil(
    (BALANCE.refineCostBase + item.level * BALANCE.refineCostPerLevel) *
      RARITY[item.rarity].mult,
  );
}

/** Highest substat quality (0–1) a level can roll. */
export function refineCap(level: number): number {
  const safe = Math.max(0, Math.min(BALANCE.refineMax, Math.floor(level)));
  return Math.min(1, BALANCE.refineCapBase + BALANCE.refineCapPerLevel * safe);
}

/**
 * Resonance uses the *lowest* level among the six slots, like ROO's "six
 * pieces at enchant level 10" threshold. That pushes players to spread levels
 * instead of maxing one item first.
 */
export function refineResonance(refine: RefineMap): RefineResonance {
  const level = Math.min(...SLOTS.map((slot) => refine[slot]?.level ?? 0));

  if (level >= 20) {
    return { level, atkPct: 0.08, hpPct: 0.08, crit: 0.03, next: 0 };
  }
  if (level >= 15) {
    return { level, atkPct: 0.06, hpPct: 0.05, crit: 0, next: 20 };
  }
  if (level >= 10) {
    return { level, atkPct: 0.04, hpPct: 0, crit: 0, next: 15 };
  }
  return { level, atkPct: 0, hpPct: 0, crit: 0, next: 10 };
}

/**
 * Older saves tracked a roll count per item and nothing per slot. Convert the
 * equipped pieces (the only ones whose history matters) into slot levels so a
 * player keeps the progress they paid for.
 */
export function migrateRefine(
  equipped: Equipped,
  raw?: Partial<Record<Slot, Partial<RefineState>>> | null,
): RefineMap {
  const result = normalizeRefine(raw);
  if (raw) return result;

  for (const slot of SLOTS) {
    const item = equipped[slot];
    if (!item || item.refines <= 0) continue;
    result[slot] = {
      level: Math.min(BALANCE.refineMax, Math.floor(item.refines)),
      progress: 0,
      pity: 0,
    };
  }
  return result;
}
