import {
  MOUNTS,
  mountById,
  mountLevelCost,
  mountsForTier,
  type MountInfo,
} from '../data/mounts';
import type { MountId, MountState, MountsState } from './types';

/**
 * Mount ownership and training.
 *
 * A mount is either dropped by its dungeon (a flat chance per clear) or crafted
 * from crystals once enough have piled up. Levels are paid in gold and crystals;
 * there is no duplicate-mount mechanic, so crystals are the only dungeon
 * material that matters after the first drop.
 */

const MAX_LEVEL = 10;

function clampLevel(level: number, max: number): number {
  return Math.max(0, Math.min(max, Math.floor(level)));
}

export function currentMounts(): MountsState {
  return { active: null, owned: {} };
}

export function normalizeMounts(raw?: Partial<MountsState> | null): MountsState {
  const owned: Partial<Record<MountId, MountState>> = {};

  const source = raw?.owned && typeof raw.owned === 'object' ? raw.owned : {};
  for (const info of MOUNTS) {
    const entry = source[info.id];
    if (!entry || typeof entry !== 'object') continue;

    const level = Number(entry.level);
    if (!Number.isFinite(level) || level <= 0) continue;
    owned[info.id] = { level: clampLevel(level, info.maxLevel) };
  }

  // A saved `null` means the player sent the mount back to the stable; only a
  // missing field (an older save) falls back to the first owned mount.
  const hasActiveField = Boolean(raw && 'active' in raw);
  const active = hasActiveField
    ? typeof raw?.active === 'string' && owned[raw.active as MountId]
      ? (raw.active as MountId)
      : null
    : (MOUNTS.find((info) => owned[info.id])?.id ?? null);

  return { active, owned };
}

export function activeMountInfo(state: MountsState): MountInfo | null {
  return mountById(state.active) ?? null;
}

export function activeMountState(state: MountsState): MountState | null {
  return state.active ? (state.owned[state.active] ?? null) : null;
}

export function mountLevel(state: MountsState): number {
  return activeMountState(state)?.level ?? 0;
}

export function ownsMount(state: MountsState, id: MountId): boolean {
  return Boolean(state.owned[id]);
}

/** Passive percentages; the mount table owns the per-level numbers. */
export function mountBonuses(state: MountsState): {
  atkPct: number;
  hpPct: number;
  defPct: number;
} {
  const info = activeMountInfo(state);
  const mount = activeMountState(state);
  if (!info || !mount) return { atkPct: 0, hpPct: 0, defPct: 0 };

  return {
    atkPct: info.atkPctPerLevel * mount.level,
    hpPct: info.hpPctPerLevel * mount.level,
    defPct: info.defPctPerLevel * mount.level,
  };
}

/** Adds a mount won from a dungeon; an owned mount is not a duplicate. */
export function addMount(state: MountsState, id: MountId): MountsState | null {
  if (!mountById(id) || state.owned[id]) return null;
  return {
    active: state.active ?? id,
    owned: { ...state.owned, [id]: { level: 1 } },
  };
}

/** Picks which mount is ridden; locked ids are refused. */
export function equipMount(state: MountsState, id: MountId | null): MountsState | null {
  if (id === null) return { ...state, active: null };
  if (!mountById(id) || !state.owned[id]) return null;
  return { ...state, active: id };
}

/** Spends gold and crystals to raise one level; at max level nothing happens. */
export function trainMount(
  state: MountsState,
  id: MountId,
  gold: number,
  crystals: number,
): { mounts: MountsState; cost: { gold: number; crystals: number }; level: number } | null {
  const info = mountById(id);
  const mount = state.owned[id];
  if (!info || !mount || mount.level <= 0 || mount.level >= info.maxLevel) return null;

  const cost = mountLevelCost(info, mount.level);
  if (gold < cost.gold || crystals < cost.crystals) return null;

  const level = mount.level + 1;
  return {
    mounts: { ...state, owned: { ...state.owned, [id]: { level } } },
    cost,
    level,
  };
}

/** Crafting bypasses the drop roll but still costs crystals and gold. */
export function craftMount(
  state: MountsState,
  id: MountId,
  gold: number,
  crystals: number,
): { mounts: MountsState; cost: { gold: number; crystals: number } } | null {
  const info = mountById(id);
  if (!info || state.owned[id]) return null;
  if (gold < info.craft.gold || crystals < info.craft.crystals) return null;

  return {
    mounts: {
      active: state.active ?? id,
      owned: { ...state.owned, [id]: { level: 1 } },
    },
    cost: { ...info.craft },
  };
}

/** Mounts of a tier the player does not own yet, for the dungeon drop roll. */
export function missingMounts(state: MountsState, tier: number): MountInfo[] {
  return mountsForTier(tier).filter((mount) => !state.owned[mount.id]);
}

export const MOUNT_MAX_LEVEL = MAX_LEVEL;
