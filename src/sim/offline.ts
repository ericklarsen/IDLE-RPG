import { BALANCE } from '../data/balance';
import { elementMultiplier } from '../data/elements';
import { skillById, skillScale } from '../data/skills';
import type { SkillInfo } from '../data/skills';
import {
  dropChanceFor,
  enemyKindForWave,
  enemyStats,
  levelUpCost,
  partyDropMult,
  rewardFor,
} from './formulas';
import type { Element, EnemyKind, Item, SkillLoadout } from './types';

export interface OfflineReport {
  seconds: number;
  capSeconds: number;
  capped: boolean;
  efficiency: number;
  kills: number;
  gold: number;
  exp: number;
  levels: number;
  items: Item[];
  drops: number;
  salvaged: number;
  salvageGold: number;
  essence: number;
  cores: number;
  books: number;
}

export interface StageRates {
  hp: number;
  def: number;
  gold: number;
  exp: number;
  dropRate: number;
  essence: number;
  cores: number;
  books: number;
}

/**
 * Averages the ten waves of a stage, including the elite and boss.
 *
 * A party-wide wave holds one monster per member, each with 1/√count of its
 * solo HP and paying 1/√count of the solo reward, so with `partySize` above one
 * every number here is per monster — the same unit the live run credits a kill
 * in. Elites, bosses and side modes keep fighting alone, exactly like the sim,
 * and a party still lifts their drop chance because five characters chase five
 * sets. Leaving `partySize` out reproduces the solo averages the economy was
 * balanced against.
 */
export function stageRates(stage: number, partySize = 1): StageRates {
  const party = Math.max(1, Math.floor(partySize));
  const packCount = Math.min(BALANCE.enemyPackCap, party);
  const rates: StageRates = {
    hp: 0,
    def: 0,
    gold: 0,
    exp: 0,
    dropRate: 0,
    essence: 0,
    cores: 0,
    books: 0,
  };

  // Every number below is per monster, so a wave is weighted by how many
  // monsters it holds: a party kills 24 normal monsters for every elite and
  // boss, and an even per-wave average would over-price those two.
  const waves: { kind: EnemyKind; pack: number }[] = [];
  for (let wave = 1; wave <= BALANCE.wavePerStage; wave += 1) {
    const kind = enemyKindForWave(wave);
    waves.push({ kind, pack: kind === 'normal' ? packCount : 1 });
  }
  const monsters = waves.reduce((sum, entry) => sum + entry.pack, 0);

  for (let wave = 1; wave <= BALANCE.wavePerStage; wave += 1) {
    const { kind, pack } = waves[wave - 1];
    const stats = enemyStats(stage, wave);
    const reward = rewardFor(stage, wave, kind);
    const share = pack / monsters;
    const split = 1 / Math.sqrt(pack);

    rates.hp += stats.hp * split * share;
    // Only HP and ATK are split on the field; armour stays whole.
    rates.def += stats.def * share;
    rates.gold += reward.gold * split * share;
    rates.exp += reward.exp * split * share;
    rates.dropRate += Math.min(1, (dropChanceFor(kind) * partyDropMult(party)) / pack) * share;

    if (kind === 'elite') rates.essence += BALANCE.eliteEssence * share;
    if (kind === 'boss') {
      rates.essence += BALANCE.bossEssence * share;
      rates.cores += (BALANCE.bossCoreBase + Math.floor((stage - 1) / 10)) * share;
      rates.books += (BALANCE.bossBookBase + Math.floor((stage - 1) / 20)) * share;
    }
  }

  return rates;
}

export interface OfflineDpsInput {
  attackPower: number;
  atkSpeed: number;
  crit: number;
  critDmg: number;
  def: number;
  skills: SkillLoadout;
  attuned: Element | null;
  elemBonus: number;
  enemyElement: Element;
  /** Element multiplier for basic attacks; offline estimates leave it neutral. */
  basicElemMult?: number;
  /** Ember Wisp contribution; neutral damage, already in damage per second. */
  petDps?: number;
  /** That fighter's roster signature, if it deals damage (heals add nothing). */
  signature?: SkillInfo | null;
}

/** Damage per second a signature adds; heals, shields and buffs add zero. */
export function signatureDps(attackPower: number, info: SkillInfo | null | undefined): number {
  if (!info || (info.kind !== 'damage' && info.kind !== 'drain')) return 0;
  const cooldown = Math.max(1, info.cooldown ?? 10);
  return (attackPower * (info.multiplier ?? 1)) / cooldown;
}

export function offlineDps(input: OfflineDpsInput): number {
  const mitigation = Math.max(1, input.attackPower - input.def * 0.5);
  const basic =
    mitigation *
    input.atkSpeed *
    (1 + input.crit * (input.critDmg - 1)) *
    (input.basicElemMult ?? 1);

  let skills = 0;
  for (const slot of input.skills.active) {
    const info = skillById(slot);
    if (!info || info.kind !== 'damage') continue;

    const level = input.skills.levels[info.id] ?? 1;
    const mult = elementMultiplier(info.element ?? null, input.enemyElement);
    const bonus = info.element && input.attuned === info.element ? input.elemBonus : 0;
    const hit = input.attackPower * (info.multiplier ?? 1) * skillScale(level) * mult * (1 + bonus);
    skills += hit / (info.cooldown ?? 10);
  }

  return basic + skills + signatureDps(input.attackPower, input.signature) + Math.max(0, input.petDps ?? 0);
}

export interface OfflineInput {
  elapsedMs: number;
  stage: number;
  level: number;
  exp: number;
  dps: number;
  rates: StageRates;
  goldPct: number;
  capSeconds?: number;
  /** Monsters per wave and the splash every hit spills onto the ones behind. */
  pack?: { count: number; splash: number };
}

/**
 * Share of the nominal pack splash the estimate credits.
 *
 * A 0,3 splash is worth only 0,18 of effective splash in the field: the hit
 * that kills the front monster wastes its tail, and back monsters sit on the
 * one-point floor while the next target is being chewed through. Measured
 * kills per hour with splash on against splash off, a full pack gains 1,44×
 * and a trio 1,20× at stages 25, 40 and 50 — a 0,18 credit reproduces every
 * one of those within a percent, where the full 0,30 would claim 1,80×.
 */
const OFFLINE_SPLASH_CREDIT = 0.6;

/**
 * How long a wave of `count` monsters takes, as a multiple of the time a single
 * monster of the same HP costs. The front target takes direct hits while the
 * rest bleed `splash` of every one of them, so each next monster walks in
 * already down to (1 - splash) of its bar and the wave costs the sum of that
 * geometric series instead of `count` full bars. Splash never kills, which is
 * why the curve bends instead of dividing by `count`.
 */
export function packTimeFactor(count: number, splash: number): number {
  const monsters = Math.max(1, Math.floor(count));
  const share = Math.min(0.9, Math.max(0, splash));
  if (monsters === 1 || share === 0) return 1;
  return (1 - Math.pow(1 - share, monsters)) / (share * monsters);
}

export interface OfflinePlan {
  seconds: number;
  capped: boolean;
  kills: number;
  gold: number;
  exp: number;
  levels: number;
  drops: number;
  essence: number;
  cores: number;
  books: number;
}

/** Caps and discounts the elapsed time, then converts it into kill counts. */
export function planOffline(input: OfflineInput): OfflinePlan | null {
  const capSeconds = input.capSeconds ?? BALANCE.offlineCapSeconds;
  const rawSeconds = Math.max(0, input.elapsedMs / 1000);
  const seconds = Math.min(rawSeconds, capSeconds);
  if (seconds < BALANCE.offlineMinSeconds) return null;

  const effectiveSeconds = seconds * BALANCE.offlineEfficiency;
  // Elite and boss waves field a single monster; two kills of a twenty-six-kill
  // stage are a small enough share to carry the pack factor as well.
  const packFactor = input.pack
    ? packTimeFactor(input.pack.count, input.pack.splash * OFFLINE_SPLASH_CREDIT)
    : 1;
  const timePerKill = Math.max(
    BALANCE.offlineKillFloorSeconds,
    (input.rates.hp / Math.max(1, input.dps)) * packFactor,
  );
  const kills = Math.floor(effectiveSeconds / timePerKill);

  return {
    seconds,
    capped: rawSeconds >= capSeconds,
    kills,
    gold: Math.floor(kills * input.rates.gold * (1 + input.goldPct)),
    exp: Math.floor(kills * input.rates.exp),
    levels: projectLevels(input.level, input.exp, Math.floor(kills * input.rates.exp)),
    drops: Math.floor(kills * input.rates.dropRate),
    essence: Math.floor(kills * input.rates.essence),
    cores: Math.floor(kills * input.rates.cores),
    books: Math.floor(kills * input.rates.books),
  };
}

export function projectLevels(level: number, exp: number, gain: number): number {
  let current = level;
  let total = exp + gain;
  let next = levelUpCost(current);
  let guard = 0;

  while (total >= next && guard < 500) {
    total -= next;
    current += 1;
    next = levelUpCost(current);
    guard += 1;
  }

  return current - level;
}
