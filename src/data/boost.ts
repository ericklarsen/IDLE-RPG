import type { BoostBranch, Boosts } from '../sim/types';

export interface BoostInfo {
  label: string;
  effect: string;
  per: number;
  color: string;
}

export const BOOST_MAX = 10;

export const BOOST_BRANCHES: Record<BoostBranch, BoostInfo> = {
  offense: {
    label: 'Offense',
    effect: '+6% ATK',
    per: 0.06,
    color: '#b0362a',
  },
  defense: {
    label: 'Defense',
    effect: '+6% HP',
    per: 0.06,
    color: '#16295c',
  },
  fortune: {
    label: 'Fortune',
    effect: '+6% gold',
    per: 0.06,
    color: '#96700f',
  },
  speed: {
    label: 'Speed',
    effect: '+3% ATK SPD',
    per: 0.03,
    color: '#1f5aa6',
  },
  element: {
    label: 'Element',
    effect: '+5% element damage',
    per: 0.05,
    color: '#3a2a52',
  },
};

export const BOOST_ORDER: BoostBranch[] = ['offense', 'defense', 'fortune', 'speed', 'element'];

export function emptyBoosts(): Boosts {
  return { offense: 0, defense: 0, fortune: 0, speed: 0, element: 0 };
}

export function boostCost(level: number): number {
  return level + 1;
}
