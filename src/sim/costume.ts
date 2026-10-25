import {
  COSTUMES,
  COSTUME_PITY,
  COSTUME_TIERS,
  COSTUME_TIER_ORDER,
  costumeById,
  type CostumeInfo,
} from '../data/costumes';
import type { SkillInfo } from '../data/skills';
import type { CostumeState, CostumeTier } from './types';

/**
 * Costumes are collectibles, not gear: the knight wears exactly one, it never
 * rolls stats, and a duplicate is converted into Forge dust. Each tier adds a
 * stronger passive and a harder-hitting outfit skill, so a higher tier really
 * is a different fight rather than the same one in a new colour.
 */

export interface CostumeBonuses {
  atkPct: number;
  hpPct: number;
  defPct: number;
  speedPct: number;
  crit: number;
}

export interface CostumeRoll {
  costume: CostumeInfo;
  duplicate: boolean;
  dust: number;
}

export interface CostumeGain {
  costume: CostumeState;
  /** True only on the acquisition that finished the whole wardrobe. */
  completed: boolean;
}

const NO_BONUS: CostumeBonuses = { atkPct: 0, hpPct: 0, defPct: 0, speedPct: 0, crit: 0 };

export function emptyCostume(): CostumeState {
  return { owned: [], equipped: null, pity: 0, mastered: false };
}

export function normalizeCostume(raw?: Partial<CostumeState> | null): CostumeState {
  const owned: string[] = [];
  if (raw && Array.isArray(raw.owned)) {
    for (const entry of raw.owned) {
      if (typeof entry !== 'string') continue;
      if (!costumeById(entry) || owned.includes(entry)) continue;
      owned.push(entry);
    }
  }

  const equipped =
    typeof raw?.equipped === 'string' && owned.includes(raw.equipped) ? raw.equipped : null;
  const pity = Number(raw?.pity);

  return {
    owned,
    equipped,
    pity: Number.isFinite(pity) ? Math.max(0, Math.min(COSTUME_PITY - 1, Math.floor(pity))) : 0,
    mastered: raw?.mastered === true || owned.length >= COSTUMES.length,
  };
}

export function equippedCostume(state: CostumeState): CostumeInfo | null {
  return costumeById(state.equipped) ?? null;
}

export function costumeBonuses(state: CostumeState): CostumeBonuses {
  const costume = equippedCostume(state);
  if (!costume) return NO_BONUS;
  return {
    atkPct: costume.atkPct,
    hpPct: costume.hpPct,
    defPct: costume.defPct,
    speedPct: costume.speedPct,
    crit: costume.crit,
  };
}

/** The outfit's signature cast; it runs alongside the six loadout slots. */
export function costumeSkill(state: CostumeState): SkillInfo | null {
  return equippedCostume(state)?.skill ?? null;
}

export function ownsCostume(state: CostumeState, id: string): boolean {
  return state.owned.includes(id);
}

export function tierRank(tier: CostumeTier): number {
  return COSTUME_TIER_ORDER.indexOf(tier);
}

export function tierUnlocked(tier: CostumeTier, farmStage: number): boolean {
  return farmStage >= COSTUME_TIERS[tier].stage;
}

/**
 * Bosses roll one costume out of the tiers the player has reached. The roll is
 * weighted per tier, so bronze stays the common find and emerald stays a story
 * the player tells. `maxTier` lets the tower cap its own cache.
 */
export function rollCostume(
  state: CostumeState,
  farmStage: number,
  rng: () => number,
  maxTier: CostumeTier = 'emerald',
): CostumeRoll | null {
  const cap = tierRank(maxTier);
  const eligible = COSTUMES.filter(
    (costume) => tierUnlocked(costume.tier, farmStage) && tierRank(costume.tier) <= cap,
  );
  if (eligible.length === 0) return null;

  // Unseen outfits always win the roll while any remain, so a drop never
  // repeats a tier the player already has and the wardrobe can actually fill.
  const fresh = eligible.filter((costume) => !ownsCostume(state, costume.id));
  const pool = fresh.length > 0 ? fresh : eligible;

  const total = pool.reduce((sum, costume) => sum + COSTUME_TIERS[costume.tier].weight, 0);
  let roll = rng() * total;
  let picked = pool[pool.length - 1];
  for (const costume of pool) {
    roll -= COSTUME_TIERS[costume.tier].weight;
    if (roll <= 0) {
      picked = costume;
      break;
    }
  }

  const duplicate = ownsCostume(state, picked.id);
  return {
    costume: picked,
    duplicate,
    dust: duplicate ? COSTUME_TIERS[picked.tier].dust : 0,
  };
}

/** Adds a freshly found outfit; the first one found is worn immediately. */
export function addCostume(state: CostumeState, id: string): CostumeGain {
  if (!costumeById(id) || ownsCostume(state, id)) return { costume: state, completed: false };

  const owned = [...state.owned, id];
  const completed = !state.mastered && owned.length >= COSTUMES.length;
  return {
    costume: {
      owned,
      equipped: state.equipped ?? id,
      pity: state.pity,
      mastered: state.mastered || completed,
    },
    completed,
  };
}

/** Price of forging a tier straight from duplicates, or null when unknown. */
export function forgeQuote(id: string): { dust: number; essence: number } | null {
  const costume = costumeById(id);
  return costume ? { ...COSTUME_TIERS[costume.tier].forge } : null;
}

/** Floors 5, 8, and 10 of the tower each open a higher grade of cache. */
export function trialCostumeTier(floor: number): CostumeTier | null {
  if (floor >= 10) return 'emerald';
  if (floor >= 8) return 'platinum';
  if (floor >= 5) return 'gold';
  return null;
}

/** Applies a roll to the collection, converting duplicates into dust. */
export function claimCostume(
  state: CostumeState,
  roll: CostumeRoll,
): { costume: CostumeState; dust: number; completed: boolean } {
  if (roll.duplicate) {
    return { costume: state, dust: roll.dust, completed: false };
  }

  const gained = addCostume(state, roll.costume.id);
  return { costume: gained.costume, dust: 0, completed: gained.completed };
}
