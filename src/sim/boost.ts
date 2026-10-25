import { BOOST_BRANCHES, BOOST_MAX, boostCost, emptyBoosts } from '../data/boost';
import type { BoostBranch, Boosts } from './types';

export function normalizeBoosts(value?: Partial<Boosts>): Boosts {
  const boosts = emptyBoosts();
  if (!value) return boosts;
  for (const branch of Object.keys(boosts) as BoostBranch[]) {
    const level = value[branch];
    boosts[branch] =
      typeof level === 'number' && Number.isFinite(level)
        ? Math.max(0, Math.min(BOOST_MAX, Math.floor(level)))
        : 0;
  }
  return boosts;
}

export interface BoostBonuses {
  atkPct: number;
  hpPct: number;
  goldPct: number;
  speedPct: number;
  elemBonus: number;
}

export function boostBonuses(boosts: Boosts): BoostBonuses {
  return {
    atkPct: boosts.offense * BOOST_BRANCHES.offense.per,
    hpPct: boosts.defense * BOOST_BRANCHES.defense.per,
    goldPct: boosts.fortune * BOOST_BRANCHES.fortune.per,
    speedPct: boosts.speed * BOOST_BRANCHES.speed.per,
    elemBonus: boosts.element * BOOST_BRANCHES.element.per,
  };
}

export function boostUpgradeCost(level: number): number {
  return boostCost(level);
}

export function canUpgradeBoost(level: number, cores: number): boolean {
  return level < BOOST_MAX && cores >= boostCost(level);
}

/** Cores spent so far in one branch: 1 + 2 + ... + level. */
export function boostSpent(level: number): number {
  return (level * (level + 1)) / 2;
}

export function totalBoostRefund(boosts: Boosts): number {
  return (Object.keys(boosts) as BoostBranch[]).reduce(
    (sum, branch) => sum + boostSpent(boosts[branch]),
    0,
  );
}
