import {
  WINGS,
  wingById,
  wingLevelCost,
  wingsForTier,
  type WingInfo,
} from '../data/wings';
import type { WingId, WingsState } from './types';

/**
 * Wing ownership and training.
 *
 * Wings work like mounts — looted from a dungeon tier, levelled with gold and
 * crystals — but they are much rarer and hit far harder. Crafting exists as a
 * fallback, and it is a gamble: a failed attempt keeps the gold and returns
 * half of the crystals.
 */

function clampLevel(level: number, max: number): number {
  return Math.max(0, Math.min(max, Math.floor(level)));
}

export function emptyWings(): WingsState {
  return { active: null, owned: {} };
}

export function normalizeWings(raw?: Partial<WingsState> | null): WingsState {
  const owned: Partial<Record<WingId, { level: number }>> = {};

  const source = raw?.owned && typeof raw.owned === 'object' ? raw.owned : {};
  for (const info of WINGS) {
    const entry = source[info.id];
    if (!entry || typeof entry !== 'object') continue;

    const level = Number(entry.level);
    if (!Number.isFinite(level) || level <= 0) continue;
    owned[info.id] = { level: clampLevel(level, info.maxLevel) };
  }

  // A saved `null` means the wings are folded away; only a missing field (an
  // older save) falls back to the first owned pair.
  const hasActiveField = Boolean(raw && 'active' in raw);
  const active = hasActiveField
    ? typeof raw?.active === 'string' && owned[raw.active as WingId]
      ? (raw.active as WingId)
      : null
    : (WINGS.find((info) => owned[info.id])?.id ?? null);

  return { active, owned };
}

export function activeWingInfo(state: WingsState): WingInfo | null {
  return wingById(state.active) ?? null;
}

export function activeWingState(state: WingsState): { level: number } | null {
  return state.active ? (state.owned[state.active] ?? null) : null;
}

export function ownsWing(state: WingsState, id: WingId): boolean {
  return Boolean(state.owned[id]);
}

/** Passive percentages; the wing table owns the per-level numbers. */
export function wingBonuses(state: WingsState): {
  atkPct: number;
  hpPct: number;
  defPct: number;
} {
  const info = activeWingInfo(state);
  const wing = activeWingState(state);
  if (!info || !wing) return { atkPct: 0, hpPct: 0, defPct: 0 };

  return {
    atkPct: info.atkPctPerLevel * wing.level,
    hpPct: info.hpPctPerLevel * wing.level,
    defPct: info.defPctPerLevel * wing.level,
  };
}

/** Adds a pair won from a dungeon; an owned pair is not a duplicate. */
export function addWing(state: WingsState, id: WingId): WingsState | null {
  if (!wingById(id) || state.owned[id]) return null;
  return {
    active: state.active ?? id,
    owned: { ...state.owned, [id]: { level: 1 } },
  };
}

/** Wears a pair of wings; locked ids are refused. */
export function equipWing(state: WingsState, id: WingId | null): WingsState | null {
  if (id === null) return { ...state, active: null };
  if (!wingById(id) || !state.owned[id]) return null;
  return { ...state, active: id };
}

/** Spends gold and crystals to raise one level; at max level nothing happens. */
export function trainWing(
  state: WingsState,
  id: WingId,
  gold: number,
  crystals: number,
): { wings: WingsState; cost: { gold: number; crystals: number }; level: number } | null {
  const info = wingById(id);
  const wing = state.owned[id];
  if (!info || !wing || wing.level <= 0 || wing.level >= info.maxLevel) return null;

  const cost = wingLevelCost(info, wing.level);
  if (gold < cost.gold || crystals < cost.crystals) return null;

  const level = wing.level + 1;
  return {
    wings: { ...state, owned: { ...state.owned, [id]: { level } } },
    cost,
    level,
  };
}

export interface WingCraftOutcome {
  ok: boolean;
  wings: WingsState;
  cost: { gold: number; crystals: number };
  /** Crystals returned when the attempt fails. */
  refund: number;
  chance: number;
  reason?: 'owned' | 'gold' | 'crystals' | 'failed';
}

/**
 * Attempts to craft a pair. `roll` is the caller's random number, so the sim
 * owns the odds and tests can pin the outcome.
 */
export function craftWing(
  state: WingsState,
  id: WingId,
  gold: number,
  crystals: number,
  roll: number,
): WingCraftOutcome {
  const info = wingById(id);
  if (!info) {
    return { ok: false, wings: state, cost: { gold: 0, crystals: 0 }, refund: 0, chance: 0 };
  }

  const cost = { gold: info.craft.gold, crystals: info.craft.crystals };
  const chance = info.craft.chance;
  if (state.owned[info.id]) {
    return { ok: false, wings: state, cost, refund: 0, chance, reason: 'owned' };
  }
  if (gold < cost.gold) {
    return { ok: false, wings: state, cost, refund: 0, chance, reason: 'gold' };
  }
  if (crystals < cost.crystals) {
    return { ok: false, wings: state, cost, refund: 0, chance, reason: 'crystals' };
  }

  if (roll >= chance) {
    return {
      ok: false,
      wings: state,
      cost,
      refund: Math.floor(cost.crystals / 2),
      chance,
      reason: 'failed',
    };
  }

  return {
    ok: true,
    wings: {
      active: state.active ?? info.id,
      owned: { ...state.owned, [info.id]: { level: 1 } },
    },
    cost,
    refund: 0,
    chance,
  };
}

/** Wings of a tier the player does not own yet, for the dungeon drop roll. */
export function missingWings(state: WingsState, tier: number): WingInfo[] {
  return wingsForTier(tier).filter((wing) => !state.owned[wing.id]);
}
