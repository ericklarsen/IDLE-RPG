import { BALANCE } from '../data/balance';
import { ELEMENTS } from '../data/elements';
import { RARITY, SLOTS } from '../data/items';
import { SETS, SET_IDS, isItemSet, setForName, setTierText, type SetStats } from '../data/sets';
import type {
  Element,
  Equipped,
  Item,
  ItemSet,
  Rarity,
  Rune,
  SubStat,
  SubStatKey,
} from './types';

export const MAX_RUNES = BALANCE.maxRunes;

export const SUBSTAT_KEYS: SubStatKey[] = ['atkPct', 'hpPct', 'def', 'crit', 'speed'];

export const SUBSTAT_LABEL: Record<SubStatKey, string> = {
  atkPct: 'ATK',
  hpPct: 'HP',
  def: 'DEF',
  crit: 'CRIT',
  speed: 'SPD',
};

const SUBSTAT_POWER: Record<SubStatKey, number> = {
  atkPct: 400,
  hpPct: 500,
  def: 2,
  crit: 600,
  speed: 400,
};

export interface ItemStats {
  atk: number;
  hp: number;
  def: number;
}

export interface GearBonuses {
  atk: number;
  hp: number;
  def: number;
  atkPct: number;
  hpPct: number;
  crit: number;
  speed: number;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clampInt(value: unknown, min: number, max: number): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

export function substatSlots(rarity: Rarity): number {
  return BALANCE.substatSlots[rarity];
}

/** Fills in defaults so saves and test fixtures from older versions stay valid. */
export function normalizeItem(item: Item): Item {
  const raw = item as Partial<Item>;
  const substats = Array.isArray(raw.substats)
    ? raw.substats
        .filter(
          (sub): sub is SubStat =>
            Boolean(sub) &&
            SUBSTAT_KEYS.includes(sub.key) &&
            Number.isFinite(sub.value) &&
            sub.value >= 0,
        )
        .slice(0, substatSlots(item.rarity))
        .map((sub) => ({ key: sub.key, value: sub.value, locked: Boolean(sub.locked) }))
    : [];

  const runes: (Rune | null)[] = Array.from({ length: MAX_RUNES }, (_, index) => {
    const rune = Array.isArray(raw.runes)
      ? (raw.runes[index] as Partial<Rune> | null | undefined)
      : null;
    if (!rune || !ELEMENTS.includes(rune.element as Element)) return null;
    if (!Number.isFinite(rune.value) || (rune.value as number) <= 0) return null;
    return {
      element: rune.element as Element,
      value: round(rune.value as number, 3),
    };
  });

  return {
    ...item,
    set: isItemSet(raw.set) ? raw.set : setForName(item.name),
    enhance: clampInt(raw.enhance, 0, BALANCE.enhanceMax),
    pity: clampInt(raw.pity, 0, 999),
    refines: clampInt(raw.refines, 0, 9999),
    enchants: clampInt(raw.enchants, 0, 9999),
    substats,
    runes,
  };
}

export function enhanceMultiplier(item: Item): number {
  return 1 + BALANCE.enhanceItemPerLevel * item.enhance;
}

export function itemStats(item: Item): ItemStats {
  const mult = enhanceMultiplier(item);
  return {
    atk: round(item.atk * mult),
    hp: Math.round(item.hp * mult),
    def: round(item.def * mult),
  };
}

export function itemPower(item: Item): number {
  const stats = itemStats(item);
  let power = stats.atk * 3 + stats.hp * 0.35 + stats.def * 2;
  for (const sub of item.substats) {
    power += SUBSTAT_POWER[sub.key] * sub.value;
  }
  for (const rune of item.runes) {
    if (rune) power += rune.value * BALANCE.runePowerWeight;
  }
  return Math.round(power);
}

export function enhanceCostFor(item: Item): number {
  const base = BALANCE.enhanceCostBase + item.level * BALANCE.enhanceCostPerLevel;
  return Math.ceil(
    base * RARITY[item.rarity].mult * Math.pow(BALANCE.enhanceCostGrowth, item.enhance),
  );
}

export function enhanceChanceFor(item: Item): number {
  if (item.enhance >= BALANCE.enhanceMax) return 0;
  if (item.enhance <= BALANCE.enhanceGuaranteed) return 1;
  const over = item.enhance - BALANCE.enhanceGuaranteed;
  const chance =
    BALANCE.enhanceChanceStart -
    over * BALANCE.enhanceChanceStep +
    item.pity * BALANCE.enhancePityStep;
  return Math.max(BALANCE.enhanceChanceMin, Math.min(1, chance));
}

export { refineCostFor } from './refine';

/** Inverse of `substatQuality`: the value a roll would need for a quality. */
export function substatValueAtQuality(
  key: SubStatKey,
  item: Item,
  quality: number,
): number {
  const mult = BALANCE.substatMult[item.rarity];
  const q = Math.max(0, Math.min(1, quality));
  let value: number;

  switch (key) {
    case 'atkPct':
      value = (BALANCE.substatAtkPct.min + (BALANCE.substatAtkPct.max - BALANCE.substatAtkPct.min) * q) * mult;
      break;
    case 'hpPct':
      value = (BALANCE.substatHpPct.min + (BALANCE.substatHpPct.max - BALANCE.substatHpPct.min) * q) * mult;
      break;
    case 'crit':
      value = (BALANCE.substatCrit.min + (BALANCE.substatCrit.max - BALANCE.substatCrit.min) * q) * mult;
      break;
    case 'speed':
      value = (BALANCE.substatSpeed.min + (BALANCE.substatSpeed.max - BALANCE.substatSpeed.min) * q) * mult;
      break;
    case 'def':
      value = (1 + item.level * BALANCE.substatDefPerLevel) * mult * (0.7 + 0.6 * q);
      break;
  }

  return key === 'def' ? Math.max(1, Math.round(value)) : Math.max(0.001, round(value, 3));
}

function rollSubstat(key: SubStatKey, item: Item, rng: () => number, cap = 1): SubStat {
  return {
    key,
    value: substatValueAtQuality(key, item, rng() * Math.max(0, Math.min(1, cap))),
    locked: false,
  };
}

export function substatText(sub: SubStat): string {
  if (sub.key === 'def') return `+${Math.round(sub.value)} DEF`;
  const percent = `${(sub.value * 100).toFixed(1)}%`;
  return `+${percent} ${SUBSTAT_LABEL[sub.key]}`;
}

export type SubstatTier = 'C' | 'B' | 'A' | 'S' | 'SS';

export const TIER_ORDER: Record<SubstatTier, number> = { C: 0, B: 1, A: 2, S: 3, SS: 4 };

const TIER_CUTS: { tier: SubstatTier; min: number }[] = [
  { tier: 'SS', min: 0.9 },
  { tier: 'S', min: 0.75 },
  { tier: 'A', min: 0.6 },
  { tier: 'B', min: 0.4 },
];

/** Where a roll sits inside its possible range: 0 (worst) to 1 (best). */
export function substatQuality(sub: SubStat, item: Item): number {
  const mult = BALANCE.substatMult[item.rarity];
  let min = 0;
  let max = 1;
  let base = 1;

  switch (sub.key) {
    case 'atkPct':
      ({ min, max } = BALANCE.substatAtkPct);
      break;
    case 'hpPct':
      ({ min, max } = BALANCE.substatHpPct);
      break;
    case 'crit':
      ({ min, max } = BALANCE.substatCrit);
      break;
    case 'speed':
      ({ min, max } = BALANCE.substatSpeed);
      break;
    case 'def':
      min = 0.7;
      max = 1.3;
      base = 1 + item.level * BALANCE.substatDefPerLevel;
      break;
  }

  const raw = sub.value / (mult * base);
  return Math.max(0, Math.min(1, (raw - min) / (max - min)));
}

export function substatTier(sub: SubStat, item: Item): SubstatTier {
  const quality = substatQuality(sub, item);
  for (const cut of TIER_CUTS) {
    if (quality >= cut.min) return cut.tier;
  }
  return 'C';
}

/**
 * Rerolls every substat that is not locked, keeps locked ones, and fills any
 * empty slots up to the rarity's substat count.
 */
export function rollSubstats(
  item: Item,
  rng: () => number,
  previous: SubStat[] = [],
  cap = 1,
): SubStat[] {
  const slots = substatSlots(item.rarity);
  const kept = previous
    .filter((sub) => sub.locked)
    .slice(0, slots)
    .map((sub) => ({ ...sub }));
  const used = new Set<SubStatKey>(kept.map((sub) => sub.key));
  const result = [...kept];

  while (result.length < slots) {
    const pool = SUBSTAT_KEYS.filter((key) => !used.has(key));
    const key = pool[Math.floor(rng() * pool.length)] ?? SUBSTAT_KEYS[0];
    used.add(key);
    result.push(rollSubstat(key, item, rng, cap));
  }

  return result;
}

export interface RefineRollOptions {
  /** Best quality a normal roll may reach (from the slot's refine level). */
  cap?: number;
  /** Pity trigger: lift the weakest unlocked line to an S-grade roll. */
  force?: boolean;
}

/**
 * Rerolls unlocked substats under a quality cap. When `force` is set (the pity
 * counter filled), the weakest unlocked line is raised to an S-grade roll.
 */
export function refineSubstats(
  item: Item,
  rng: () => number,
  options: RefineRollOptions = {},
): SubStat[] {
  const rolled = rollSubstats(item, rng, item.substats, options.cap ?? 1);
  if (!options.force) return rolled;

  let target = -1;
  let worst = Infinity;
  rolled.forEach((sub, index) => {
    if (sub.locked) return;
    const quality = substatQuality(sub, item);
    if (quality < worst) {
      worst = quality;
      target = index;
    }
  });
  if (target < 0) return rolled;

  const sub = rolled[target];
  rolled[target] = {
    ...sub,
    value: substatValueAtQuality(sub.key, item, BALANCE.refinePityQuality),
  };
  return rolled;
}

/** Lowest quality needed to count as each tier; used by auto-refine. */
export const TIER_MIN: Record<SubstatTier, number> = {
  C: 0,
  B: 0.4,
  A: 0.6,
  S: 0.75,
  SS: 0.9,
};

/** Best tier a capped roll can still reach, for the panel's range label. */
export function capTier(cap: number): SubstatTier {
  for (const cut of TIER_CUTS) {
    if (cap >= cut.min) return cut.tier;
  }
  return 'C';
}

export function gearBonuses(equipped: Equipped): GearBonuses {
  const bonus: GearBonuses = { atk: 0, hp: 0, def: 0, atkPct: 0, hpPct: 0, crit: 0, speed: 0 };

  for (const slot of SLOTS) {
    const item = equipped[slot];
    if (!item) continue;

    const stats = itemStats(item);
    bonus.atk += stats.atk;
    bonus.hp += stats.hp;
    bonus.def += stats.def;

    for (const sub of item.substats) {
      switch (sub.key) {
        case 'atkPct':
          bonus.atkPct += sub.value;
          break;
        case 'hpPct':
          bonus.hpPct += sub.value;
          break;
        case 'def':
          bonus.def += sub.value;
          break;
        case 'crit':
          bonus.crit += sub.value;
          break;
        case 'speed':
          bonus.speed += sub.value;
          break;
      }
    }
  }

  const sets = setBonuses(equipped);
  bonus.atkPct += sets.atkPct ?? 0;
  bonus.hpPct += sets.hpPct ?? 0;
  bonus.def += sets.def ?? 0;
  bonus.crit += sets.crit ?? 0;
  bonus.speed += sets.speed ?? 0;

  return bonus;
}

export function runeCostFor(item: Item): number {
  const rarityIndex = (['common', 'rare', 'epic', 'legendary', 'mythic'] as Rarity[]).indexOf(
    item.rarity,
  );
  return Math.ceil(
    (BALANCE.essenceCostBase + rarityIndex) * Math.pow(BALANCE.essenceCostGrowth, item.enchants),
  );
}

/** First empty slot, otherwise the slot holding the weakest rune. */
export function nextRuneSlot(item: Item): number {
  let slot = -1;
  let lowest = Infinity;

  for (let i = 0; i < MAX_RUNES; i += 1) {
    const rune = item.runes[i];
    if (!rune) return i;
    if (rune.value < lowest) {
      lowest = rune.value;
      slot = i;
    }
  }

  return slot;
}

export function rollRune(item: Item, element: Element, rng: () => number): Rune {
  const mult = BALANCE.substatMult[item.rarity];
  const value = (BALANCE.runeValueMin + rng() * (BALANCE.runeValueMax - BALANCE.runeValueMin)) * mult;
  return { element, value: Math.max(0.001, round(value, 3)) };
}

export function runeText(rune: Rune): string {
  return `+${(rune.value * 100).toFixed(1)}%`;
}

export interface Attunement {
  element: Element | null;
  bonus: number;
  counts: Record<Element, number>;
}

function emptyCounts(): Record<Element, number> {
  return { fire: 0, ice: 0, lightning: 0, holy: 0, dark: 0 };
}

/** Element damage bonus this item contributes when that element is attuned. */
export function itemRuneBonus(item: Item, element: Element): number {
  const runes = item.runes.filter((rune): rune is Rune => Boolean(rune));
  if (runes.length === 0) return 0;

  const matching = runes.filter((rune) => rune.element === element);
  if (matching.length === 0) return 0;

  const total = matching.reduce((sum, rune) => sum + rune.value, 0);
  const resonance = runes.length === MAX_RUNES && matching.length === runes.length;
  return resonance ? total * BALANCE.runeResonanceMult : total;
}

/** The element with the most equipped runes wins; ties go to the higher value. */
export function attunement(equipped: Equipped): Attunement {
  const counts = emptyCounts();
  const values = emptyCounts();

  for (const slot of SLOTS) {
    const item = equipped[slot];
    if (!item) continue;

    for (const rune of item.runes) {
      if (!rune) continue;
      counts[rune.element] += 1;
    }
    for (const element of ELEMENTS) {
      values[element] += itemRuneBonus(item, element);
    }
  }

  let element: Element | null = null;
  let bestCount = 0;
  let bestValue = 0;

  for (const candidate of ELEMENTS) {
    const count = counts[candidate];
    if (count === 0) continue;
    if (count > bestCount || (count === bestCount && values[candidate] > bestValue)) {
      element = candidate;
      bestCount = count;
      bestValue = values[candidate];
    }
  }

  return { element, bonus: element ? values[element] : 0, counts };
}

/**
 * Item power plus what the active set tiers are worth. Set percentages are
 * valued against the worn gear they multiply, so a finished set reads as a
 * real upgrade instead of vanishing from the score.
 */
export function gearScoreOf(equipped: Equipped): number {
  let raw = 0;
  let atk = 0;
  let hp = 0;

  for (const slot of SLOTS) {
    const item = equipped[slot];
    if (!item) continue;
    raw += itemPower(item);
    const stats = itemStats(item);
    atk += stats.atk;
    hp += stats.hp;
  }

  const sets = setBonuses(equipped);
  const dpsLift = (sets.atkPct ?? 0) + (sets.speed ?? 0);
  const setScore =
    dpsLift * atk * 3 +
    (sets.hpPct ?? 0) * hp * 0.35 +
    (sets.def ?? 0) * 2 +
    (sets.crit ?? 0) * atk * 1.5;

  return Math.round(raw + setScore);
}

export interface SetTierStatus {
  pieces: number;
  text: string;
  active: boolean;
}

export interface SetProgress {
  id: ItemSet;
  label: string;
  color: string;
  flavor: string;
  count: number;
  total: number;
  tiers: SetTierStatus[];
}

/** Per-set piece counts for everything currently worn. */
export function setProgress(equipped: Equipped): SetProgress[] {
  const counts: Partial<Record<ItemSet, number>> = {};

  for (const slot of SLOTS) {
    const item = equipped[slot];
    if (!item) continue;
    const id = item.set ?? setForName(item.name);
    if (!id) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }

  return SET_IDS.map((id) => {
    const info = SETS[id];
    const count = counts[id] ?? 0;
    return {
      id,
      label: info.label,
      color: info.color,
      flavor: info.flavor,
      count,
      total: info.pieces.length,
      tiers: info.bonuses.map((tier) => ({
        pieces: tier.pieces,
        text: setTierText(tier.stats),
        active: count >= tier.pieces,
      })),
    };
  }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Stacked stats from every set tier the player currently meets. */
export function setBonuses(equipped: Equipped): SetStats {
  const total: SetStats = {};

  for (const progress of setProgress(equipped)) {
    for (const tier of SETS[progress.id].bonuses) {
      if (progress.count < tier.pieces) continue;
      const stats = tier.stats;
      if (stats.atkPct) total.atkPct = (total.atkPct ?? 0) + stats.atkPct;
      if (stats.hpPct) total.hpPct = (total.hpPct ?? 0) + stats.hpPct;
      if (stats.def) total.def = (total.def ?? 0) + stats.def;
      if (stats.crit) total.crit = (total.crit ?? 0) + stats.crit;
      if (stats.speed) total.speed = (total.speed ?? 0) + stats.speed;
    }
  }

  return total;
}
