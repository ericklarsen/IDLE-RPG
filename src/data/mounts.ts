import type { Element, MountId } from '../sim/types';

/**
 * Mounts are the dungeon's chase: four beasts across three dungeon tiers.
 *
 * A mount is ridden for passive stats and one chance-based skill that fires off
 * the hero's own attacks. Levels raise the stats, the skill chance, and the
 * skill's size, and cost gold plus the crystals the dungeon drops. Wings live in
 * `wings.ts` and use their own slot, so a knight can ride and wear them at once.
 */

export interface MountSkill {
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

export interface MountInfo {
  id: MountId;
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
  /** Crystals per level; refunded progress never happens, so keep it small. */
  crystalPerLevel: number;
  /** Crystals and gold needed to craft the mount without a lucky drop. */
  craft: { crystals: number; gold: number };
  skill: MountSkill;
  desc: string;
}

export const MOUNTS: MountInfo[] = [
  {
    id: 'ember-steed',
    name: 'Ember Steed',
    tier: 1,
    element: 'fire',
    sprite: 'mount-ember',
    color: '#ff9a4a',
    atkPctPerLevel: 0.015,
    hpPctPerLevel: 0.01,
    defPctPerLevel: 0,
    maxLevel: 10,
    costBase: 1_600,
    costGrowth: 1.55,
    crystalPerLevel: 1,
    craft: { crystals: 12, gold: 8_000 },
    desc: 'A coal-black charger whose hooves throw sparks.',
    skill: {
      name: 'Ember Charge',
      kind: 'damage',
      chanceBase: 0.1,
      chancePerLevel: 0.01,
      chanceCap: 0.22,
      powerBase: 1.2,
      powerPerLevel: 0.08,
      desc: 'Tramples the target for heavy fire damage.',
    },
  },
  {
    id: 'dusk-wolf',
    name: 'Dusk Wolf',
    tier: 1,
    element: 'dark',
    sprite: 'mount-wolf',
    color: '#b38cff',
    atkPctPerLevel: 0.01,
    hpPctPerLevel: 0.015,
    defPctPerLevel: 0.004,
    maxLevel: 10,
    costBase: 1_600,
    costGrowth: 1.55,
    crystalPerLevel: 1,
    craft: { crystals: 12, gold: 8_000 },
    desc: 'A shadow hound that hunts by scent, not sight.',
    skill: {
      name: 'Moonlit Howl',
      kind: 'heal',
      chanceBase: 0.09,
      chancePerLevel: 0.01,
      chanceCap: 0.2,
      powerBase: 0.05,
      powerPerLevel: 0.006,
      desc: 'Howls, closing some of the knight’s wounds.',
    },
  },
  {
    id: 'frost-stag',
    name: 'Frost Stag',
    tier: 2,
    element: 'ice',
    sprite: 'mount-stag',
    color: '#7fd8ff',
    atkPctPerLevel: 0.012,
    hpPctPerLevel: 0.02,
    defPctPerLevel: 0.008,
    maxLevel: 10,
    costBase: 4_200,
    costGrowth: 1.55,
    crystalPerLevel: 2,
    craft: { crystals: 26, gold: 25_000 },
    desc: 'Antlers of clear ice, hooves that leave frost.',
    skill: {
      name: 'Glacial Ward',
      kind: 'shield',
      chanceBase: 0.08,
      chancePerLevel: 0.01,
      chanceCap: 0.2,
      powerBase: 0.08,
      powerPerLevel: 0.006,
      desc: 'Wraps the knight in a shield of packed snow.',
    },
  },
  {
    id: 'storm-gryphon',
    name: 'Storm Gryphon',
    tier: 3,
    element: 'lightning',
    sprite: 'mount-gryphon',
    color: '#ffe066',
    atkPctPerLevel: 0.025,
    hpPctPerLevel: 0.02,
    defPctPerLevel: 0.008,
    maxLevel: 10,
    costBase: 9_500,
    costGrowth: 1.6,
    crystalPerLevel: 3,
    craft: { crystals: 42, gold: 60_000 },
    desc: 'Half eagle, half storm, entirely unwilling to land.',
    skill: {
      name: 'Thunder Dive',
      kind: 'damage',
      chanceBase: 0.07,
      chancePerLevel: 0.01,
      chanceCap: 0.18,
      powerBase: 1.8,
      powerPerLevel: 0.12,
      desc: 'Dives from above with a crack of lightning.',
    },
  },
];

const BY_ID = new Map(MOUNTS.map((mount) => [mount.id, mount]));

export function mountById(id: string | null | undefined): MountInfo | undefined {
  if (!id) return undefined;
  return BY_ID.get(id as MountId);
}

export function mountsForTier(tier: number): MountInfo[] {
  return MOUNTS.filter((mount) => mount.tier === tier);
}

/** Skill chance at a level; the cap keeps a lucky build from firing always. */
export function mountSkillChance(info: MountInfo, level: number): number {
  if (level <= 0) return 0;
  return Math.min(
    info.skill.chanceCap,
    info.skill.chanceBase + info.skill.chancePerLevel * (level - 1),
  );
}

/** Damage (fraction of ATK) or heal/shield (fraction of max HP). */
export function mountSkillPower(info: MountInfo, level: number): number {
  if (level <= 0) return 0;
  return info.skill.powerBase + info.skill.powerPerLevel * (level - 1);
}

export function mountLevelCost(info: MountInfo, level: number): {
  gold: number;
  crystals: number;
} {
  if (level <= 0 || level >= info.maxLevel) return { gold: 0, crystals: 0 };
  return {
    gold: Math.ceil(info.costBase * Math.pow(info.costGrowth, level - 1)),
    crystals: info.crystalPerLevel,
  };
}
