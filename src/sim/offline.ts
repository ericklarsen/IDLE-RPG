import { BALANCE } from '../data/balance';
import { elementMultiplier } from '../data/elements';
import { skillById, skillScale } from '../data/skills';
import { enemyKindForWave, enemyStats, levelUpCost, rewardFor } from './formulas';
import type { Element, Item, SkillLoadout } from './types';

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

/** Averages the ten waves of a stage, including the elite and boss. */
export function stageRates(stage: number): StageRates {
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

  for (let wave = 1; wave <= BALANCE.wavePerStage; wave += 1) {
    const kind = enemyKindForWave(wave);
    const stats = enemyStats(stage, wave);
    const reward = rewardFor(stage, wave, kind);
    const share = 1 / BALANCE.wavePerStage;

    rates.hp += stats.hp * share;
    rates.def += stats.def * share;
    rates.gold += reward.gold * share;
    rates.exp += reward.exp * share;
    rates.dropRate +=
      (kind === 'boss' ? 1 : kind === 'elite' ? 0.45 : 0.16) * share;

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

  return basic + skills + Math.max(0, input.petDps ?? 0);
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
  const timePerKill = Math.max(
    BALANCE.offlineKillFloorSeconds,
    input.rates.hp / Math.max(1, input.dps),
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
