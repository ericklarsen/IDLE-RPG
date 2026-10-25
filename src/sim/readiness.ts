import { BALANCE } from '../data/balance';
import { elementMultiplier } from '../data/elements';
import { pickEnemy } from '../data/enemies';
import { enemyStats } from './formulas';
import { offlineDps } from './offline';
import type { BossTarget, Element, SkillLoadout } from './types';

export interface ReadinessInput {
  atk: number;
  atkSpeed: number;
  crit: number;
  critDmg: number;
  def: number;
  maxHp: number;
  skills: SkillLoadout;
  element: Element | null;
  elemBonus: number;
  petDps?: number;
}

/**
 * Boss check for a stage. The hero is sent back to the farm stage after
 * `retreatAfterDeaths` deaths, so a stage is only clearable if the boss dies
 * inside that many lives. Skills, crit and element advantage are included.
 */
export function bossTarget(input: ReadinessInput, stage: number): BossTarget {
  const wave = BALANCE.bossWave;
  const identity = pickEnemy(stage, wave, 'boss');
  const stats = enemyStats(stage, wave);
  const elemMult = elementMultiplier(input.element, identity.element);

  const dps = Math.max(
    1,
    offlineDps({
      attackPower: input.atk,
      atkSpeed: input.atkSpeed,
      crit: input.crit,
      critDmg: input.critDmg,
      def: stats.def,
      skills: input.skills,
      attuned: input.element,
      elemBonus: input.elemBonus,
      enemyElement: identity.element,
      basicElemMult: elemMult,
      petDps: input.petDps,
    }),
  );

  const bossHit = Math.max(1, stats.atk - input.def * 0.5);
  const surviveSeconds = input.maxHp / Math.max(0.1, bossHit * stats.atkSpeed);
  const windowSeconds = surviveSeconds * BALANCE.retreatAfterDeaths;
  const requiredDps = stats.hp / Math.max(1, windowSeconds);
  const ready = dps >= requiredDps;

  return {
    stage,
    name: identity.name,
    element: identity.element,
    hp: Math.round(stats.hp),
    dps: Math.round(dps),
    requiredDps: Math.round(requiredDps),
    gapPct: ready ? 0 : Math.ceil((requiredDps / dps - 1) * 100),
    ready,
  };
}
