import { BALANCE } from '../data/balance';
import type { EnemyKind } from './types';

export function globalWave(stage: number, wave: number): number {
  return (stage - 1) * BALANCE.wavePerStage + wave;
}

export function enemyKindForWave(wave: number): EnemyKind {
  if (wave >= BALANCE.bossWave) return 'boss';
  if (wave === BALANCE.eliteWave) return 'elite';
  return 'normal';
}

export interface EnemyStats {
  kind: EnemyKind;
  hp: number;
  atk: number;
  def: number;
  atkSpeed: number;
}

function baseEnemyHp(stage: number, wave: number): number {
  const waves = globalWave(stage, wave) - 1;
  return (
    BALANCE.enemyHpBase +
    BALANCE.enemyHpPerWave * waves +
    BALANCE.enemyHpQuad * waves * waves +
    BALANCE.enemyHpCubic * waves * waves * waves
  );
}

export function enemyStats(stage: number, wave: number): EnemyStats {
  const kind = enemyKindForWave(wave);
  const g = globalWave(stage, wave);
  const hpMult =
    kind === 'boss' ? BALANCE.bossHpMult : kind === 'elite' ? BALANCE.eliteHpMult : 1;
  const atkMult =
    kind === 'boss' ? BALANCE.bossAtkMult : kind === 'elite' ? BALANCE.eliteAtkMult : 1;
  const speed =
    kind === 'boss'
      ? BALANCE.bossAtkSpeed
      : kind === 'elite'
        ? BALANCE.eliteAtkSpeed
        : BALANCE.enemyAtkSpeed;

  const waves = g - 1;

  return {
    kind,
    hp: Math.round(baseEnemyHp(stage, wave) * hpMult),
    atk: Math.round((BALANCE.enemyAtkBase + BALANCE.enemyAtkPerWave * waves) * atkMult),
    def: Math.round(
      BALANCE.enemyDefBase +
        (g - 1) * BALANCE.enemyDefPerWave +
        (kind === 'boss' ? 4 : kind === 'elite' ? 2 : 0),
    ),
    atkSpeed: speed,
  };
}

/**
 * Chance that a kill leaves an item. One place for the number, because the
 * live run and the offline expedition must agree on what an hour is worth.
 */
export function dropChanceFor(kind: EnemyKind): number {
  if (kind === 'boss') return BALANCE.dropBoss;
  if (kind === 'elite') return BALANCE.dropElite;
  return BALANCE.dropNormal;
}

/**
 * Item drop multiplier for a roster of `partySize` fighters. Gear is per
 * character, so a party of five is chasing five sets; solo is the multiplier
 * of one and therefore exactly the economy every balance number was measured
 * against. Capped at the wave size so a larger roster cannot inflate it.
 */
export function partyDropMult(partySize: number): number {
  const count = Math.max(1, Math.min(BALANCE.enemyPackCap, Math.floor(partySize)));
  return 1 + BALANCE.dropPartyStep * (count - 1);
}

export interface Reward {
  gold: number;
  exp: number;
}

export function rewardFor(stage: number, wave: number, kind: EnemyKind): Reward {
  const goldMult = kind === 'boss' ? BALANCE.bossGoldMult : 1;
  const expMult = kind === 'boss' ? BALANCE.bossExpMult : 1;

  const hp = baseEnemyHp(stage, wave);

  return {
    gold: Math.ceil((BALANCE.goldBase + hp * BALANCE.goldPerHp) * goldMult),
    exp: Math.ceil((BALANCE.expBase + hp * BALANCE.expPerHp) * expMult),
  };
}

export interface HeroStats {
  maxHp: number;
  atk: number;
  def: number;
  atkSpeed: number;
  crit: number;
  critDmg: number;
}

export function heroStats(level: number): HeroStats {
  return {
    maxHp: BALANCE.heroHpBase + (level - 1) * BALANCE.heroHpPerLevel,
    atk: BALANCE.heroAtkBase + (level - 1) * BALANCE.heroAtkPerLevel,
    def: BALANCE.heroDefBase + (level - 1) * BALANCE.heroDefPerLevel,
    atkSpeed: BALANCE.heroAtkSpeed,
    crit: BALANCE.heroCrit,
    critDmg: BALANCE.heroCritDmg,
  };
}

export function levelUpCost(level: number): number {
  return Math.ceil(BALANCE.levelExpBase * Math.pow(BALANCE.levelExpGrowth, level - 1));
}

export interface DamageRoll {
  damage: number;
  crit: boolean;
}

export interface DamageOptions {
  elemMult?: number;
  elemBonus?: number;
}

export function damageRoll(
  atk: number,
  def: number,
  critRate: number,
  critDmg: number,
  rng: () => number,
  opts: DamageOptions = {},
): DamageRoll {
  const crit = rng() < critRate;
  const raw = Math.max(1, atk * (opts.elemMult ?? 1) - def * 0.5);
  const boosted = raw * (1 + (opts.elemBonus ?? 0)) * (crit ? critDmg : 1);
  return {
    damage: Math.max(1, Math.round(boosted)),
    crit,
  };
}
