import type { ItemSet } from '../sim/types';

/** Stat deltas a set tier grants. Mirrors the fields of GearBonuses. */
export interface SetStats {
  atkPct?: number;
  hpPct?: number;
  def?: number;
  crit?: number;
  speed?: number;
}

export interface SetTier {
  pieces: number;
  stats: SetStats;
}

export interface SetInfo {
  id: ItemSet;
  label: string;
  color: string;
  flavor: string;
  pieces: string[];
  bonuses: SetTier[];
}

export const SETS: Record<ItemSet, SetInfo> = {
  ashforged: {
    id: 'ashforged',
    label: 'Ashforged',
    color: '#9c6a0c',
    flavor: 'Ember plate hammered thin — it burns hotter the harder you swing.',
    pieces: [
      'Ember Cleaver',
      'Crown of Ash',
      'Ember Aegis',
      'Ash Striders',
      'Ember Loop',
      'Ash Pendant',
    ],
    bonuses: [
      { pieces: 2, stats: { atkPct: 0.1 } },
      { pieces: 4, stats: { speed: 0.08 } },
    ],
  },
  voidbound: {
    id: 'voidbound',
    label: 'Voidbound',
    color: '#2b2350',
    flavor: 'Cut from something that was never alive. It rewards the reckless.',
    pieces: [
      'Void Reaver',
      'Void Visor',
      'Void Carapace',
      'Void Treads',
      'Void Signet',
      'Void Heart',
    ],
    bonuses: [
      { pieces: 2, stats: { crit: 0.06 } },
      { pieces: 4, stats: { atkPct: 0.2 } },
    ],
  },
  emberforged: {
    id: 'emberforged',
    label: 'Emberforged',
    color: '#bd3a20',
    flavor: 'Quenched during the Emberfall, still warm when the week turns.',
    pieces: [
      'Cinder Fang',
      'Cinder Crown',
      'Emberforged Plate',
      'Cinder Treads',
      'Ember Sigil',
      'Cinder Heart',
    ],
    bonuses: [
      { pieces: 2, stats: { speed: 0.06 } },
      { pieces: 4, stats: { crit: 0.08, atkPct: 0.12 } },
    ],
  },
  oath: {
    id: 'oath',
    label: "Knight's Oath",
    color: '#16295c',
    flavor: 'The old watch never broke formation, and neither does this steel.',
    pieces: [
      "Knight's Blade",
      'Sentinel Helm',
      'Knight Plate',
      'Knight Sabatons',
      'Sigil Ring',
      'Warden Talisman',
    ],
    bonuses: [
      { pieces: 2, stats: { hpPct: 0.12 } },
      { pieces: 4, stats: { def: 40, hpPct: 0.1 } },
    ],
  },
};

export const SET_IDS = Object.keys(SETS) as ItemSet[];

/** Every set piece is named after its set, so the name alone carries the tag. */
export const SET_BY_NAME: Record<string, ItemSet> = Object.fromEntries(
  SET_IDS.flatMap((id) => SETS[id].pieces.map((name) => [name, id] as const)),
);

export function setForName(name: string): ItemSet | null {
  return SET_BY_NAME[name] ?? null;
}

export function isItemSet(value: unknown): value is ItemSet {
  return typeof value === 'string' && value in SETS;
}

/** "+10% ATK · +8% ATK SPD" summary shown next to each set tier. */
export function setTierText(stats: SetStats): string {
  const parts: string[] = [];
  if (stats.atkPct) parts.push(`+${Math.round(stats.atkPct * 100)}% ATK`);
  if (stats.hpPct) parts.push(`+${Math.round(stats.hpPct * 100)}% HP`);
  if (stats.def) parts.push(`+${Math.round(stats.def)} DEF`);
  if (stats.crit) parts.push(`+${Math.round(stats.crit * 100)}% CRIT`);
  if (stats.speed) parts.push(`+${Math.round(stats.speed * 100)}% ATK SPD`);
  return parts.join(' · ');
}
