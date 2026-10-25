import type { Element, WingId } from '../sim/types';

/**
 * Wings are the dungeon's rare prize: one per tier, far rarer than a mount and
 * built to change a run on their own. They level like mounts, but the numbers
 * are bigger — four times the passive of a mount per level and a skill that
 * lands for several times the knight's attack.
 *
 * Crafting is the fallback for a bad streak, and it can fail. A failed craft
 * still burns the gold but refunds half the crystals, so the dungeon stays the
 * real way to earn a wing.
 */

export interface WingSkill {
  name: string;
  kind: 'damage' | 'heal' | 'shield';
  /** Chance on a hero hit at level 1, and the gain per level after that. */
  chanceBase: number;
  chancePerLevel: number;
  chanceCap: number;
  /** Fraction of ATK (damage) or max HP (heal/shield) at level 1. */
  powerBase: number;
  powerPerLevel: number;
  desc: string;
}

export interface WingInfo {
  id: WingId;
  name: string;
  tier: 1 | 2 | 3;
  element: Element;
  sprite: string;
  color: string;
  /** Passive bonuses at level 1, gained again per level. */
  atkPctPerLevel: number;
  hpPctPerLevel: number;
  defPctPerLevel: number;
  maxLevel: number;
  costBase: number;
  costGrowth: number;
  /** Crystals per level on top of the gold. */
  crystalPerLevel: number;
  /** Cost and success chance of a craft attempt; a failure refunds half the crystals. */
  craft: { crystals: number; gold: number; chance: number };
  skill: WingSkill;
  desc: string;
}

export const WINGS: WingInfo[] = [
  {
    id: 'emberpinions',
    name: 'Emberpinions',
    tier: 1,
    element: 'fire',
    sprite: 'wing-ember',
    color: '#ff7a3c',
    atkPctPerLevel: 0.02,
    hpPctPerLevel: 0.015,
    defPctPerLevel: 0.005,
    maxLevel: 12,
    costBase: 26_000,
    costGrowth: 1.6,
    crystalPerLevel: 2,
    craft: { crystals: 45, gold: 150_000, chance: 0.45 },
    desc: 'Coal-feather wings that smoulder between beats.',
    skill: {
      name: 'Pyre Dive',
      kind: 'damage',
      chanceBase: 0.1,
      chancePerLevel: 0.01,
      chanceCap: 0.22,
      powerBase: 2.2,
      powerPerLevel: 0.12,
      desc: 'Folds, then drives a burning wingtip through the target.',
    },
  },
  {
    id: 'rimepinions',
    name: 'Rimepinions',
    tier: 2,
    element: 'ice',
    sprite: 'wing-rime',
    color: '#7fd8ff',
    atkPctPerLevel: 0.022,
    hpPctPerLevel: 0.02,
    defPctPerLevel: 0.01,
    maxLevel: 12,
    costBase: 60_000,
    costGrowth: 1.6,
    crystalPerLevel: 3,
    craft: { crystals: 75, gold: 420_000, chance: 0.35 },
    desc: 'Frost-glass feathers that sing when they cut the air.',
    skill: {
      name: 'Glacier Fang',
      kind: 'damage',
      chanceBase: 0.09,
      chancePerLevel: 0.01,
      chanceCap: 0.22,
      powerBase: 2.6,
      powerPerLevel: 0.15,
      desc: 'A spear of ice thrown from a full spread.',
    },
  },
  {
    id: 'stormpinions',
    name: 'Stormpinions',
    tier: 3,
    element: 'lightning',
    sprite: 'wing-storm',
    color: '#ffe066',
    atkPctPerLevel: 0.026,
    hpPctPerLevel: 0.022,
    defPctPerLevel: 0.012,
    maxLevel: 12,
    costBase: 140_000,
    costGrowth: 1.6,
    crystalPerLevel: 5,
    craft: { crystals: 120, gold: 1_200_000, chance: 0.25 },
    desc: 'Storm-feather pinions that never quite touch the ground.',
    skill: {
      name: 'Skyfall Judgment',
      kind: 'damage',
      chanceBase: 0.08,
      chancePerLevel: 0.01,
      chanceCap: 0.2,
      powerBase: 3,
      powerPerLevel: 0.18,
      desc: 'Calls a column of lightning down on the target.',
    },
  },
];

/** Wings drop far less often than mounts of the same tier. */
const WING_CHANCE_BY_TIER: Record<number, number> = { 1: 0.002, 2: 0.004, 3: 0.007 };

const BY_ID = new Map(WINGS.map((wing) => [wing.id, wing]));

export function wingById(id: string | null | undefined): WingInfo | undefined {
  if (!id) return undefined;
  return BY_ID.get(id as WingId);
}

export function wingsForTier(tier: number): WingInfo[] {
  return WINGS.filter((wing) => wing.tier === tier);
}

export function wingDropChance(tier: number): number {
  return WING_CHANCE_BY_TIER[tier] ?? 0;
}

/** Skill chance at a level; the cap keeps a lucky build from firing always. */
export function wingSkillChance(info: WingInfo, level: number): number {
  if (level <= 0) return 0;
  return Math.min(
    info.skill.chanceCap,
    info.skill.chanceBase + info.skill.chancePerLevel * (level - 1),
  );
}

/** Damage (fraction of ATK) or heal/shield (fraction of max HP). */
export function wingSkillPower(info: WingInfo, level: number): number {
  if (level <= 0) return 0;
  return info.skill.powerBase + info.skill.powerPerLevel * (level - 1);
}

export function wingLevelCost(info: WingInfo, level: number): {
  gold: number;
  crystals: number;
} {
  if (level <= 0 || level >= info.maxLevel) return { gold: 0, crystals: 0 };
  return {
    gold: Math.ceil(info.costBase * Math.pow(info.costGrowth, level - 1)),
    crystals: info.crystalPerLevel,
  };
}
