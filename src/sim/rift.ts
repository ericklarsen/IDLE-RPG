import { rewardFor } from './formulas';
import type { RiftChest, RiftModifier } from './types';

export const RIFT_DURATION_SECONDS = 60;
export const RIFT_UNLOCK_STAGE = 10;
export const RIFT_ITEM_KILLS = 5;

export const RIFT_MODIFIERS: RiftModifier[] = [
  { id: 'frenzy', label: 'Frenzy', desc: 'Enemy ATK +25%', enemyAtk: 1.25 },
  { id: 'bulwark', label: 'Bulwark', desc: 'Enemy HP +30%', enemyHp: 1.3 },
  { id: 'haste', label: 'Haste', desc: 'Enemy ATK SPD +25%', enemyAtkSpeed: 1.25 },
  { id: 'plated', label: 'Plated', desc: 'Enemy DEF +50%', enemyDef: 1.5 },
  { id: 'frail', label: 'Frail', desc: 'Hero max HP -20%', heroHp: 0.8 },
  { id: 'rust', label: 'Rust', desc: 'Hero ATK -15%', heroAtk: 0.85 },
  { id: 'fury', label: 'Fury', desc: 'Hero ATK +20% · enemy HP +35%', heroAtk: 1.2, enemyHp: 1.35 },
  { id: 'greed', label: 'Greed', desc: 'Chest gold ×1.5 · enemy HP +15%', enemyHp: 1.15, chestGold: 1.5 },
];

const MODIFIER_COUNT = 2;

/** Local calendar day, so the rift resets at the player's midnight. */
export function dayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

/** Two distinct modifiers, the same for every player on a given day. */
export function riftModifiers(day: string): RiftModifier[] {
  let seed = hash(day);
  const next = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const pool = [...RIFT_MODIFIERS];
  const picked: RiftModifier[] = [];
  while (picked.length < MODIFIER_COUNT && pool.length > 0) {
    const index = Math.floor(next() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export function riftChest(kills: number, stage: number, chestGold = 1): RiftChest {
  const safeKills = Math.max(0, Math.floor(kills));
  const base = rewardFor(stage, 1, 'normal').gold;
  return {
    kills: safeKills,
    gold: Math.round(safeKills * base * 2 * chestGold),
    essence: Math.floor(safeKills / 5),
    item: safeKills >= RIFT_ITEM_KILLS,
  };
}

export function riftChestGoldMult(modifiers: RiftModifier[]): number {
  return modifiers.reduce((mult, modifier) => mult * (modifier.chestGold ?? 1), 1);
}
