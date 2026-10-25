/**
 * The mount dungeon.
 *
 * Three tiers, each a short run of trash waves followed by a boss. Clearing one
 * pays mount crystals and rolls for a mount of that tier (1% / 3% / 5%, rising
 * with the tier). Tickets are the daily gate: five free entries per day, with
 * more available from the shop for gold.
 */

export const DUNGEON_TICKETS = 5;
/** Three trash waves, then the boss. */
export const DUNGEON_WAVES = 4;
export const DUNGEON_UNLOCK_STAGE = 30;
/** Purchased tickets per day, on top of the five free ones. */
export const DUNGEON_TICKET_CAP = 5;
/** Crystals a player may buy per day, so gold cannot skip the dungeon entirely. */
export const SHOP_CRYSTAL_CAP = 2;

export interface DungeonTierInfo {
  id: 'cinder' | 'rime' | 'skyfall';
  name: string;
  /** Farm stage required to enter, and the power level enemies are built from. */
  stage: number;
  /** Chance that a clear also drops a mount of this tier. */
  mountChance: number;
  crystals: { min: number; max: number };
  color: string;
  desc: string;
}

export const DUNGEON_TIERS: DungeonTierInfo[] = [
  {
    id: 'cinder',
    name: 'Cinder Den',
    stage: 30,
    mountChance: 0.01,
    crystals: { min: 3, max: 5 },
    color: '#ff9a4a',
    desc: 'Ash-choked tunnels under the forge. Ember Steeds and Dusk Wolves den here.',
  },
  {
    id: 'rime',
    name: 'Rime Hollow',
    stage: 50,
    mountChance: 0.03,
    crystals: { min: 6, max: 9 },
    color: '#7fd8ff',
    desc: 'A frozen grotto where hoarfrost grows antlers. Frost Stags graze in the dark.',
  },
  {
    id: 'skyfall',
    name: 'Skyfall Aerie',
    stage: 70,
    mountChance: 0.05,
    crystals: { min: 10, max: 14 },
    color: '#ffe066',
    desc: 'Broken cliffs above the storm line. Storm Gryphons nest at the summit.',
  },
];

export function dungeonTier(id: string): DungeonTierInfo | undefined {
  return DUNGEON_TIERS.find((tier) => tier.id === id);
}

/** Trash hits softer; the boss is the wall that makes a build checked. */
export const DUNGEON_SCALE = {
  trashHp: 0.65,
  trashAtk: 0.6,
  bossHp: 2.8,
  bossAtk: 1.25,
  bossDef: 1.1,
};
