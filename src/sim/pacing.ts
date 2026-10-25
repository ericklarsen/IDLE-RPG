import { BALANCE } from '../data/balance';
import { BOOST_MAX, boostCost } from '../data/boost';
import { starterWeapon } from '../data/items';
import { petCost } from '../data/pets';
import { activePetInfo, activePetState } from './pets';
import { BattleSim } from './battle';
import type { BoostBranch, SaveData, WingId } from './types';
import { enhanceCostFor } from './upgrade';

export type PacingPolicy = 'idle' | 'casual' | 'engaged';

/** Stages tracked in `PLAN.md` §7.2. */
export const PACING_STAGES = [5, 10, 20, 30, 40, 50] as const;

/** A check-in player waits for the tracker to turn green, then pushes anyway. */
const PUSH_RETRY_SECONDS = 5 * 60;

export interface PacingOptions {
  /** Defaults to 'engaged'. */
  policy?: PacingPolicy;
  /** Defaults to 1. */
  seed?: number;
  /** Simulated active play time, defaults to 12 hours. */
  seconds?: number;
  /** Stop once this stage is reached, defaults to 50. */
  targetStage?: number;
  /** Costume id worn from the first second, for tier regression checks. */
  costume?: string;
  /** Wing worn from the first second, for power regression checks. */
  wing?: { id: WingId; level: number };
}

export interface PacingFinal {
  stage: number;
  level: number;
  gold: number;
  atk: number;
  gearScore: number;
  kills: number;
  dust: number;
}

export interface PacingOffline {
  kills: number;
  gold: number;
  exp: number;
  levels: number;
  drops: number;
}

export interface PacingResult {
  policy: PacingPolicy;
  seed: number;
  seconds: number;
  reached: Record<number, number | null>;
  firstKill: number | null;
  firstEnhance: number | null;
  final: PacingFinal;
  offline: PacingOffline | null;
  /** Share of post-unlock combat time spent in Forge Surge. */
  surgeUptime: number;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setEngagedLoadout(sim: BattleSim): void {
  sim.setSkill(0, 'heavy-strike');
  sim.setSkill(1, 'ember-burst');
  sim.setSkill(2, 'holy-mend');
  sim.setPassive('keen-edge');
}

/**
 * Models a player checking in every 30 seconds: equipping upgrades, salvaging
 * commons, enhancing, buying boosts, and upgrading skills. Returns true when
 * an enhancement was attempted so the caller can time the first forge.
 */
function applyPolicy(sim: BattleSim, policy: PacingPolicy): boolean {
  if (policy === 'idle') return false;

  sim.equipBest();
  sim.salvageCommons();

  // Keep the active wisp fed with a slice of each check-in's gold.
  const petInfo = activePetInfo(sim.pets);
  let pet = activePetState(sim.pets);
  if (petInfo && pet && pet.level > 0) {
    const share = policy === 'engaged' ? 0.25 : 0.1;
    let guard = 0;
    while (pet && pet.level < pet.maxLevel && guard < 3) {
      const cost = petCost(petInfo, pet.level);
      if (cost > sim.gold * share) break;
      if (!sim.upgradePet(petInfo.id).ok) break;
      pet = activePetState(sim.pets);
      guard += 1;
      if (policy === 'casual') break;
    }
  }

  let enhanced = false;
  const weapon = sim.weapon;
  if (weapon) {
    // A casual player keeps most of their gold in reserve.
    let remaining = policy === 'casual' ? sim.gold * 0.25 : sim.gold;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (weapon.enhance >= BALANCE.enhanceMax) break;
      const cost = enhanceCostFor(weapon);
      if (remaining < cost) break;

      const outcome = sim.enhanceItem(weapon.id, 1);
      if (outcome.attempts === 0) break;
      remaining -= cost;
      enhanced = true;
    }
  }

  const branches: BoostBranch[] =
    policy === 'engaged'
      ? ['offense', 'speed', 'fortune', 'defense', 'element']
      : ['offense', 'fortune'];

  for (const branch of branches) {
    let guard = 0;
    while (guard < 20) {
      const level = sim.boosts[branch];
      if (level >= BOOST_MAX || sim.cores < boostCost(level)) break;
      sim.upgradeBoost(branch);
      guard += 1;
      if (policy === 'casual') break;
    }
  }

  if (policy === 'engaged') {
    for (const id of ['heavy-strike', 'ember-burst', 'holy-mend', 'keen-edge']) {
      let guard = 0;
      while (guard < 10) {
        const level = sim.skills.levels[id] ?? 1;
        if (level >= 10 || sim.books < level) break;
        sim.upgradeSkill(id);
        guard += 1;
      }
    }
  }

  return enhanced;
}

/** A fresh save that already wears one wing, starter weapon included. */
function wingSave(wing: { id: WingId; level: number }): SaveData {
  return {
    version: 21,
    level: 1,
    exp: 0,
    gold: 0,
    maxStage: 1,
    kills: 0,
    inventory: [],
    equipped: { weapon: starterWeapon() },
    itemSeq: 1,
    wings: { active: wing.id, owned: { [wing.id]: { level: wing.level } } },
  };
}

export function simulatePacing(options: PacingOptions = {}): PacingResult {
  const policy = options.policy ?? 'engaged';
  const seed = options.seed ?? 1;
  const limit = options.seconds ?? 12 * 60 * 60;
  const targetStage = options.targetStage ?? 50;

  // Costume drops get their own deterministic stream so a 12h run replays the
  // same wardrobe, and therefore the same power curve, on every seed.
  const start = options.wing ? wingSave(options.wing) : null;
  const sim = new BattleSim(start, mulberry32(seed), mulberry32(seed * 7919 + 13));
  if (policy !== 'idle') setEngagedLoadout(sim);

  // The tower/wardrobe test outfits start worn; the forge cost is only a way to
  // grant one, so the dust is put straight back to zero.
  if (options.costume) {
    sim.dust = 1_000_000;
    sim.essence = 1_000;
    sim.forgeCostume(options.costume);
    sim.dust = 0;
    sim.essence = 0;
  }

  const reached: Record<number, number | null> = {};
  for (const stage of PACING_STAGES) reached[stage] = stage <= sim.maxStage ? 0 : null;

  let firstKill: number | null = null;
  let firstEnhance: number | null = null;
  let lastStage = sim.maxStage;
  let lastPolicy = 0;
  let lastPush = 0;
  let elapsed = 0;
  let unlockedTime = 0;
  let surgeTime = 0;
  const dt = 0.1;

  while (elapsed < limit) {
    sim.tick(dt);
    elapsed = sim.time;

    if (sim.surgeUnlocked) {
      unlockedTime += dt;
      if (sim.surgeActive) surgeTime += dt;
    }

    if (firstKill === null && sim.kills > 0) firstKill = elapsed;

    if (sim.maxStage > lastStage) {
      for (let stage = lastStage + 1; stage <= sim.maxStage; stage += 1) {
        if (stage in reached && reached[stage] === null) reached[stage] = elapsed;
      }
      lastStage = sim.maxStage;
    }

    if (elapsed - lastPolicy >= 30) {
      if (applyPolicy(sim, policy)) firstEnhance ??= elapsed;
      lastPolicy = elapsed;

      if (policy !== 'idle' && sim.canPush) {
        const ready = sim.snapshot().target.ready;
        if (ready || elapsed - lastPush >= PUSH_RETRY_SECONDS) {
          if (sim.push().ok) lastPush = elapsed;
        }
      }
    }

    if (lastStage >= targetStage) break;
  }

  const report = sim.estimateOffline(8 * 60 * 60 * 1000);

  return {
    policy,
    seed,
    seconds: elapsed,
    reached,
    firstKill,
    firstEnhance,
    final: {
      stage: sim.stage,
      level: sim.level,
      gold: Math.round(sim.gold),
      atk: sim.hero.atk,
      gearScore: sim.gearScore,
      kills: sim.kills,
      dust: sim.dust,
    },
    surgeUptime: unlockedTime > 0 ? surgeTime / unlockedTime : 0,
    offline: report
      ? {
          kills: report.kills,
          gold: report.gold + report.salvageGold,
          exp: report.exp,
          levels: report.levels,
          drops: report.drops,
        }
      : null,
  };
}
