import type { Element, PetKind } from '../sim/types';

export interface PetInfo {
  id: PetKind;
  name: string;
  element: Element;
  /** Farm stage that awakens the pet. */
  unlockStage: number;
  color: string;
  /** Seconds between attacks. */
  interval: number;
  /** Hit damage as a fraction of hero ATK at level 1. */
  damagePerAtk: number;
  /** Extra ATK fraction per level after the first. */
  damagePerLevel: number;
  /** What the hit leaves behind. */
  effect: 'burn' | 'slow' | 'chain';
  /** Burn damage per second, as a fraction of the hit. */
  burnRatio?: number;
  burnSeconds?: number;
  slowPct?: number;
  slowSeconds?: number;
  /** Extra hit as a fraction of the first, for the storm wisp. */
  chainRatio?: number;
  costBase: number;
  costGrowth: number;
  desc: string;
}

/**
 * Three wisps, one awake at a time. Each keeps the same power budget — total
 * pet DPS stays at or below 20% of the hero's — and differs only in how the
 * damage arrives: burn over time, a slow, or a second chained hit.
 *
 * `base` level caps at 10. Duplicates (eggs) raise the ceiling by two levels up
 * to 20, which is where the 20% budget still holds.
 */
export const PETS: PetInfo[] = [
  {
    id: 'ember',
    name: 'Ember Wisp',
    element: 'fire',
    unlockStage: 20,
    color: '#ff9a4a',
    interval: 3,
    damagePerAtk: 0.15,
    damagePerLevel: 0.016,
    effect: 'burn',
    burnRatio: 0.15,
    burnSeconds: 3,
    costBase: 400,
    costGrowth: 1.75,
    desc: 'Hits and leaves the target burning for 3s.',
  },
  {
    id: 'frost',
    name: 'Frost Wisp',
    element: 'ice',
    unlockStage: 40,
    color: '#7fd8ff',
    interval: 2.6,
    damagePerAtk: 0.12,
    damagePerLevel: 0.012,
    effect: 'slow',
    slowPct: 0.2,
    slowSeconds: 2.5,
    costBase: 600,
    costGrowth: 1.7,
    desc: 'Chills the target, slowing its attacks for 2.5s.',
  },
  {
    id: 'storm',
    name: 'Storm Wisp',
    element: 'lightning',
    unlockStage: 60,
    color: '#ffe066',
    interval: 3.4,
    damagePerAtk: 0.18,
    damagePerLevel: 0.016,
    effect: 'chain',
    chainRatio: 0.6,
    costBase: 900,
    costGrowth: 1.65,
    desc: 'Strikes twice, the second hit at 60% damage.',
  },
];

export const PET_BASE_MAX = 10;
/** Duplicates stop raising the ceiling here, which keeps the DPS budget. */
export const PET_MAX_CAP = 20;
/** Levels added to the ceiling per duplicate egg. */
export const PET_SYNTH_STEP = 2;
/** Share of boss kills that drop an egg once a pet can still grow. */
export const PET_EGG_CHANCE = 0.06;
/** Share of tower caches that also carry an egg. */
export const PET_TRIAL_EGG_CHANCE = 0.5;

const BY_ID = new Map(PETS.map((pet) => [pet.id, pet]));

export function petById(id: string | null | undefined): PetInfo | undefined {
  if (!id) return undefined;
  return BY_ID.get(id as PetKind);
}

export function petDamage(info: PetInfo, atk: number, level: number): number {
  if (level <= 0) return 0;
  const ratio = info.damagePerAtk + info.damagePerLevel * (level - 1);
  return Math.max(1, Math.round(atk * ratio));
}

/** Average damage per second, including the effect that ships with each pet. */
export function petDps(info: PetInfo, atk: number, level: number): number {
  const damage = petDamage(info, atk, level);
  if (damage <= 0) return 0;

  const base = damage / info.interval;
  if (info.effect === 'burn') return base + damage * (info.burnRatio ?? 0);
  if (info.effect === 'chain') return base * (1 + (info.chainRatio ?? 0));
  return base;
}

export function petCost(info: PetInfo, level: number): number {
  if (level <= 0 || level >= PET_MAX_CAP) return 0;
  return Math.ceil(info.costBase * Math.pow(info.costGrowth, level - 1));
}
