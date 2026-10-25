import { BALANCE } from '../data/balance';
import { enemyStats, rewardFor } from './formulas';
import { weekEndsAt, weekKey } from './week';
import type {
  Element,
  TrialFloorInfo,
  TrialSnapshot,
  TrialState,
  TrialRule,
} from './types';

/**
 * Weekly trial tower.
 *
 * Ten bosses, each one a little taller than the last. The tower is not farmable:
 * a floor can be cleared once per week and the only thing a loss costs is one of
 * three retries, so the player is pushed to actually improve their build rather
 * than grind the same fight. Floors and their rules are seeded from the week, so
 * everyone faces the same tower and it changes on Monday with the league season.
 */

export const TRIAL_FLOORS = 10;
/** Losses allowed per week; a win never spends one. */
export const TRIAL_ATTEMPTS = 3;
export const TRIAL_UNLOCK_STAGE = 35;

export const TRIAL_RULES: TrialRule[] = [
  { id: 'bulwark', label: 'Bulwark', desc: 'Boss HP +35%', hp: 1.35 },
  { id: 'frenzy', label: 'Frenzy', desc: 'Boss ATK +25%', atk: 1.25 },
  { id: 'haste', label: 'Haste', desc: 'Boss ATK SPD +30%', atkSpeed: 1.3 },
  { id: 'plated', label: 'Plated', desc: 'Boss DEF +60%', def: 1.6 },
  { id: 'twin', label: 'Twin Core', desc: 'Boss HP +20% · ATK +15%', hp: 1.2, atk: 1.15 },
  { id: 'leaden', label: 'Leaden', desc: 'Boss ATK SPD −20%', atkSpeed: 0.8 },
];

const FLOOR_NAMES = [
  'Gate Warden',
  'Cinder Judge',
  'Frost Sentinel',
  'Bone Prelate',
  'Void Herald',
  'Ash Vizier',
  'Storm Keeper',
  'Hollow Saint',
  'Iron Regent',
  'Prism Tyrant',
];

const FLOOR_ELEMENTS: Element[] = [
  'dark',
  'fire',
  'ice',
  'holy',
  'lightning',
  'fire',
  'lightning',
  'holy',
  'ice',
  'dark',
];

function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clampFloor(floor: number): number {
  if (!Number.isFinite(floor)) return 1;
  return Math.max(1, Math.min(TRIAL_FLOORS, Math.floor(floor)));
}

/** Two rules per floor, stable for the week and different every Monday. */
export function trialRules(key: string, floor: number): TrialRule[] {
  const rand = seeded(hash(`${key}:trial:${clampFloor(floor)}`));
  const pool = [...TRIAL_RULES];
  const picked: TrialRule[] = [];
  while (picked.length < 2 && pool.length > 0) {
    picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return picked;
}

function ruleMultiplier(rules: TrialRule[], field: 'hp' | 'atk' | 'def' | 'atkSpeed'): number {
  return rules.reduce((value, rule) => value * (rule[field] ?? 1), 1);
}

/**
 * A floor is the farm stage's boss plus a steady climb: +12% HP, +5% ATK, and
 * +4% DEF per floor, before the week's rules. Cropping the growth to a ladder
 * keeps floor 10 hard but reachable instead of a stage-curve cliff.
 */
export function trialFloorInfo(key: string, floor: number, farmStage: number): TrialFloorInfo {
  const safe = clampFloor(floor);
  const boss = enemyStats(Math.max(1, Math.floor(farmStage)), BALANCE.bossWave);
  const rules = trialRules(key, safe);
  const step = safe - 1;

  return {
    floor: safe,
    name: FLOOR_NAMES[safe - 1],
    element: FLOOR_ELEMENTS[safe - 1],
    hp: Math.round(boss.hp * (1 + step * 0.12) * ruleMultiplier(rules, 'hp')),
    atk: Math.round(boss.atk * (1 + step * 0.05) * ruleMultiplier(rules, 'atk')),
    def: Math.round(boss.def * (1 + step * 0.04) * ruleMultiplier(rules, 'def')),
    atkSpeed:
      Math.round(boss.atkSpeed * (1 + step * 0.01) * ruleMultiplier(rules, 'atkSpeed') * 100) /
      100,
    rules,
  };
}

/**
 * Floors pay Forge materials rather than gold, so the tower feeds upgrades
 * instead of the main-run stage race. Only the tenth floor adds a cache.
 */
export function trialReward(
  floor: number,
  farmStage: number,
): { gold: number; dust: number; essence: number; cores: number; cache: boolean } {
  const safe = clampFloor(floor);
  const cache = safe >= TRIAL_FLOORS;
  return {
    gold: cache ? Math.round(rewardFor(farmStage, BALANCE.bossWave, 'boss').gold * 2) : 0,
    dust: 4 + safe * 2,
    essence: 2 + safe,
    cores: safe % 5 === 0 ? safe / 5 : 0,
    cache,
  };
}

export function emptyTrial(key: string): TrialState {
  return { key, cleared: 0, attempts: TRIAL_ATTEMPTS };
}

/** Monday rollover gives the tower back: cleared floors and retries both reset. */
export function trialRollover(
  state: TrialState,
  now = new Date(),
): { trial: TrialState; settled: boolean } {
  const key = weekKey(now);
  if (state.key === key) return { trial: state, settled: false };
  return { trial: { key, cleared: 0, attempts: TRIAL_ATTEMPTS }, settled: true };
}

export function trialFloor(state: TrialState): number {
  return clampFloor(state.cleared + 1);
}

export function trialSnapshot(
  state: TrialState,
  farmStage: number,
  active: boolean,
  now = new Date(),
): TrialSnapshot {
  const done = state.cleared >= TRIAL_FLOORS;
  const floor = trialFloor(state);
  return {
    unlocked: farmStage >= TRIAL_UNLOCK_STAGE,
    key: state.key,
    cleared: Math.max(0, Math.min(TRIAL_FLOORS, state.cleared)),
    floor,
    maxFloor: TRIAL_FLOORS,
    attempts: state.attempts,
    maxAttempts: TRIAL_ATTEMPTS,
    active,
    done,
    endsAt: weekEndsAt(now),
    next: done ? null : trialFloorInfo(state.key, floor, farmStage),
  };
}

export function normalizeTrial(raw?: Partial<TrialState> | null, now = new Date()): TrialState {
  const current = weekKey(now);
  if (!raw || typeof raw !== 'object') return emptyTrial(current);

  const cleared = Number(raw.cleared);
  const attempts = Number(raw.attempts);
  return {
    key: typeof raw.key === 'string' && raw.key.length > 0 ? raw.key.slice(0, 10) : current,
    cleared: Number.isFinite(cleared)
      ? Math.max(0, Math.min(TRIAL_FLOORS, Math.floor(cleared)))
      : 0,
    attempts: Number.isFinite(attempts)
      ? Math.max(0, Math.min(TRIAL_ATTEMPTS, Math.floor(attempts)))
      : TRIAL_ATTEMPTS,
  };
}
