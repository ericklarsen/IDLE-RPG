import { BOOST_BRANCHES, BOOST_MAX, boostCost } from '../data/boost';
import { petCost } from '../data/pets';
import { pickEnemy } from '../data/enemies';
import { BALANCE } from '../data/balance';
import { skillById } from '../data/skills';
import type { BattleSim } from './battle';
import { activePetInfo, activePetState } from './pets';
import { enemyStats } from './formulas';
import type { BoostBranch } from './types';
import { enhanceChanceFor, enhanceCostFor } from './upgrade';

export type ForecastCurrency = 'gold' | 'cores' | 'books';

export interface ForecastOption {
  id: string;
  label: string;
  cost: number;
  currency: ForecastCurrency;
  chance?: number;
  affordable: boolean;
  killed: boolean;
  seconds: number | null;
  remainingPct: number;
}

export interface ForecastReport {
  stage: number;
  bossName: string;
  bossHp: number;
  baseline: ForecastOption;
  /** Fastest kill first; survivors are sorted by boss HP left. */
  options: ForecastOption[];
}

interface Candidate {
  id: string;
  label: string;
  cost: number;
  currency: ForecastCurrency;
  chance?: number;
  affordable: boolean;
  mutate: (sim: BattleSim) => boolean;
}

function ensureGold(sim: BattleSim, amount: number): void {
  if (sim.gold < amount) sim.gold = amount;
}

function ensureCores(sim: BattleSim, amount: number): void {
  if (sim.cores < amount) sim.cores = amount;
}

function ensureBooks(sim: BattleSim, amount: number): void {
  if (sim.books < amount) sim.books = amount;
}

function buildCandidates(sim: BattleSim): Candidate[] {
  const candidates: Candidate[] = [];

  const weapon = sim.weapon;
  if (weapon && weapon.enhance < BALANCE.enhanceMax) {
    const cost = enhanceCostFor(weapon);
    const chance = enhanceChanceFor(weapon);
    candidates.push({
      id: 'enhance',
      label: `${weapon.name} +${weapon.enhance + 1}`,
      cost,
      currency: 'gold',
      chance,
      affordable: sim.gold >= cost,
      mutate: (clone) => {
        ensureGold(clone, cost);
        return clone.trialEnhance(weapon.id, 1);
      },
    });
  }

  if (sim.inventory.length > 0) {
    candidates.push({
      id: 'equip-best',
      label: 'EQUIP BEST',
      cost: 0,
      currency: 'gold',
      affordable: true,
      mutate: (clone) => clone.equipBest() > 0,
    });
  }

  const boostBranches = (Object.keys(BOOST_BRANCHES) as BoostBranch[])
    .filter((branch) => sim.boosts[branch] < BOOST_MAX)
    .sort((a, b) => boostCost(sim.boosts[a]) - boostCost(sim.boosts[b]))
    .slice(0, 2);

  for (const branch of boostBranches) {
    const level = sim.boosts[branch];
    const cost = boostCost(level);
    candidates.push({
      id: `boost-${branch}`,
      label: `${BOOST_BRANCHES[branch].label} rank ${level + 1}`,
      cost,
      currency: 'cores',
      affordable: sim.cores >= cost,
      mutate: (clone) => {
        ensureCores(clone, cost);
        return clone.upgradeBoost(branch).ok;
      },
    });
  }

  for (const slot of sim.skills.active) {
    const info = skillById(slot);
    if (!info || info.kind !== 'damage') continue;
    const level = sim.skills.levels[info.id] ?? 1;
    if (level >= 10) continue;

    candidates.push({
      id: `skill-${info.id}`,
      label: `${info.name} lv ${level + 1}`,
      cost: level,
      currency: 'books',
      affordable: sim.books >= level,
      mutate: (clone) => {
        ensureBooks(clone, level);
        return clone.upgradeSkill(info.id).ok;
      },
    });
    break;
  }

  const petInfo = activePetInfo(sim.pets);
  const pet = activePetState(sim.pets);
  if (petInfo && pet && pet.level > 0 && pet.level < pet.maxLevel) {
    const cost = petCost(petInfo, pet.level);
    candidates.push({
      id: 'pet',
      label: `${petInfo.name} lv ${pet.level + 1}`,
      cost,
      currency: 'gold',
      affordable: sim.gold >= cost,
      mutate: (clone) => {
        ensureGold(clone, cost);
        return clone.upgradePet(petInfo.id).ok;
      },
    });
  }

  return candidates;
}

function rank(a: ForecastOption, b: ForecastOption): number {
  if (a.killed !== b.killed) return a.killed ? -1 : 1;
  if (a.killed && b.killed) return (a.seconds ?? Infinity) - (b.seconds ?? Infinity);
  return a.remainingPct - b.remainingPct;
}

/**
 * Runs the real battle rules on a detached copy of the run for the next boss
 * and returns what each affordable upgrade would change.
 */
export function forecastNextBoss(sim: BattleSim): ForecastReport {
  const stage = sim.pushing ? sim.stage : sim.farmStage + 1;
  const identity = pickEnemy(stage, BALANCE.bossWave, 'boss');
  const stats = enemyStats(stage, BALANCE.bossWave);

  const baselineTrial = sim.trialBoss(stage);
  const baseline: ForecastOption = {
    id: 'now',
    label: 'Current build',
    cost: 0,
    currency: 'gold',
    affordable: true,
    ...baselineTrial,
  };

  const options: ForecastOption[] = [];
  for (const candidate of buildCandidates(sim)) {
    let changed = false;
    const trial = sim.trialBoss(stage, {
      mutate: (clone) => {
        changed = candidate.mutate(clone);
      },
    });
    if (!changed) continue;

    options.push({
      id: candidate.id,
      label: candidate.label,
      cost: candidate.cost,
      currency: candidate.currency,
      chance: candidate.chance,
      affordable: candidate.affordable,
      killed: trial.killed,
      seconds: trial.seconds,
      remainingPct: trial.remainingPct,
    });
  }

  options.sort(rank);

  return {
    stage,
    bossName: identity.name,
    bossHp: Math.round(stats.hp),
    baseline,
    options,
  };
}
