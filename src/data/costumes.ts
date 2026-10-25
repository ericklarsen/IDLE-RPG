import type { SkillInfo } from './skills';
import type { CostumeTier } from '../sim/types';

export interface CostumeTierInfo {
  label: string;
  color: string;
  /** Farming stage where bosses start dropping this tier. */
  stage: number;
  /** Relative chance once the tier is unlocked. */
  weight: number;
  /** Dust paid when a costume the player already owns drops again. */
  dust: number;
  /** Cost to forge this tier directly from duplicates instead of waiting. */
  forge: { dust: number; essence: number };
}

/**
 * Six tiers, cheapest first. A tier is never a recolour of the one below it:
 * each step adds a stat line, a bigger passive, and a harder-hitting outfit
 * skill, so upgrading genuinely changes how a fight plays out.
 */
export const COSTUME_TIERS: Record<CostumeTier, CostumeTierInfo> = {
  bronze: {
    label: 'Bronze',
    color: '#9a5f2a',
    stage: 15,
    weight: 40,
    dust: 12,
    forge: { dust: 150, essence: 6 },
  },
  silver: {
    label: 'Silver',
    color: '#7d8794',
    stage: 30,
    weight: 26,
    dust: 24,
    forge: { dust: 320, essence: 12 },
  },
  gold: {
    label: 'Gold',
    color: '#9c6a0c',
    stage: 45,
    weight: 17,
    dust: 45,
    forge: { dust: 650, essence: 24 },
  },
  platinum: {
    label: 'Platinum',
    color: '#4f82a8',
    stage: 60,
    weight: 10,
    dust: 80,
    forge: { dust: 1100, essence: 40 },
  },
  diamond: {
    label: 'Diamond',
    color: '#5f9fd8',
    stage: 80,
    weight: 5.5,
    dust: 140,
    forge: { dust: 1800, essence: 60 },
  },
  emerald: {
    label: 'Emerald',
    color: '#1f7a4d',
    stage: 100,
    weight: 3,
    dust: 220,
    forge: { dust: 2800, essence: 90 },
  },
};

/** Share of boss kills that hand out a costume once the lowest tier is open. */
export const COSTUME_BOSS_CHANCE = 0.08;
/** Boss kills without a costume before one is guaranteed; resets on every drop. */
export const COSTUME_PITY = 12;

/** One-time payout the first time the whole wardrobe is complete. */
export const COSTUME_COMPLETE_DUST = 600;
export const COSTUME_COMPLETE_ESSENCE = 60;

export const COSTUME_TIER_ORDER: CostumeTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'emerald',
];

export interface CostumeInfo {
  id: string;
  name: string;
  tier: CostumeTier;
  /** Percentage bonuses applied on top of gear, boosts, and passives. */
  atkPct: number;
  hpPct: number;
  defPct: number;
  speedPct: number;
  crit: number;
  effect: string;
  /** Always-on seventh skill: it fires on its own while the outfit is worn. */
  skill: SkillInfo;
}

const skill = (info: Omit<SkillInfo, 'type' | 'kind'> & { kind: SkillInfo['kind'] }): SkillInfo => ({
  type: 'active',
  ...info,
});

export const COSTUMES: CostumeInfo[] = [
  {
    id: 'ash-ronin',
    name: 'Ash Ronin',
    tier: 'bronze',
    atkPct: 0.06,
    hpPct: 0.04,
    defPct: 0,
    speedPct: 0,
    crit: 0,
    effect: '+6% ATK · +4% max HP',
    skill: skill({
      id: 'ronin-cut',
      name: 'Ronin Cut',
      kind: 'damage',
      multiplier: 1.5,
      cooldown: 10,
      desc: '150% ATK damage',
      color: '#9a5f2a',
    }),
  },
  {
    id: 'frostveil-shroud',
    name: 'Frostveil Shroud',
    tier: 'silver',
    atkPct: 0.09,
    hpPct: 0.07,
    defPct: 0.06,
    speedPct: 0,
    crit: 0,
    effect: '+9% ATK · +7% HP · +6% DEF',
    skill: skill({
      id: 'frostveil',
      name: 'Frostveil',
      kind: 'shield',
      shieldPct: 0.18,
      duration: 8,
      cooldown: 16,
      desc: 'Shield 18% max HP for 8s',
      color: '#7d8794',
    }),
  },
  {
    id: 'ember-duelist',
    name: 'Ember Duelist',
    tier: 'gold',
    atkPct: 0.13,
    hpPct: 0.1,
    defPct: 0,
    speedPct: 0,
    crit: 0.04,
    effect: '+13% ATK · +10% HP · +4% crit',
    skill: skill({
      id: 'ember-cross',
      name: 'Ember Cross',
      kind: 'damage',
      element: 'fire',
      multiplier: 1.75,
      cooldown: 11,
      desc: '175% ATK fire damage',
      color: '#b0362a',
    }),
  },
  {
    id: 'storm-herald',
    name: 'Storm Herald',
    tier: 'platinum',
    atkPct: 0.17,
    hpPct: 0.13,
    defPct: 0,
    speedPct: 0.05,
    crit: 0,
    effect: '+17% ATK · +13% HP · +5% ATK SPD',
    skill: skill({
      id: 'storm-verdict',
      name: 'Storm Verdict',
      kind: 'damage',
      element: 'lightning',
      multiplier: 2,
      cooldown: 12,
      desc: '200% ATK lightning damage',
      color: '#96700f',
    }),
  },
  {
    id: 'void-regent',
    name: 'Void Regent',
    tier: 'diamond',
    atkPct: 0.21,
    hpPct: 0.17,
    defPct: 0.08,
    speedPct: 0,
    crit: 0,
    effect: '+21% ATK · +17% HP · +8% DEF',
    skill: skill({
      id: 'void-devour',
      name: 'Void Devour',
      kind: 'drain',
      element: 'dark',
      multiplier: 2.25,
      drainPct: 0.3,
      cooldown: 13,
      desc: '225% ATK dark damage · heal 30% of it',
      color: '#3a2a52',
    }),
  },
  {
    id: 'verdant-sovereign',
    name: 'Verdant Sovereign',
    tier: 'emerald',
    atkPct: 0.26,
    hpPct: 0.22,
    defPct: 0.1,
    speedPct: 0.06,
    crit: 0.05,
    effect: '+26% ATK · +22% HP · +10% DEF · +6% ATK SPD · +5% crit',
    skill: skill({
      id: 'verdant-wrath',
      name: 'Verdant Wrath',
      kind: 'damage',
      element: 'holy',
      multiplier: 2.5,
      healPct: 0.12,
      cooldown: 14,
      desc: '250% ATK holy damage · heal 12% max HP',
      color: '#1f7a4d',
    }),
  },
];

/** Hero texture key for a tier; the builders live in game/dummy/assets.ts. */
export function costumeSprite(tier: CostumeTier): string {
  return `hero-${tier}`;
}

const BY_ID = new Map(COSTUMES.map((costume) => [costume.id, costume]));

export function costumeById(id: string | null | undefined): CostumeInfo | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}

export function costumesByTier(tier: CostumeTier): CostumeInfo[] {
  return COSTUMES.filter((costume) => costume.tier === tier);
}
