import { ITEM_NAMES, RARITIES, RARITY, SLOTS, SLOT_WEIGHT } from '../data/items';
import { setForName } from '../data/sets';
import { EVENT_SET } from './event';
import type { EnemyKind, Item, ItemSet, Rarity, Slot } from './types';
import { itemStats, rollSubstats } from './upgrade';

export interface ItemOptions {
  /** Force a piece from this set, e.g. the weekly Emberforged cache. */
  set?: ItemSet;
  /** Outside an event the exclusive set never enters the ordinary loot pool. */
  allowEventSet?: boolean;
  /** Forge output can pin the rarity and slot instead of rolling them. */
  rarity?: Rarity;
  slot?: Slot;
}

function namesFor(slot: Slot, options: ItemOptions = {}): string[] {
  const pool = ITEM_NAMES[slot].filter((name) => {
    if (options.set) return setForName(name) === options.set;
    return options.allowEventSet === true || setForName(name) !== EVENT_SET;
  });
  return pool.length > 0 ? pool : ITEM_NAMES[slot];
}

export function rollRarity(kind: EnemyKind, rng: () => number): Rarity {
  const weighted = RARITIES.map((rarity) => {
    const info = RARITY[rarity];
    const weight =
      kind === 'boss' ? info.bossWeight : kind === 'elite' ? info.eliteWeight : info.weight;
    return { rarity, weight };
  }).filter((entry) => entry.weight > 0);

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.rarity;
  }

  return weighted[weighted.length - 1].rarity;
}

export function createItem(
  level: number,
  kind: EnemyKind,
  rng: () => number,
  id: string,
  options: ItemOptions = {},
): Item {
  const rarity = options.rarity ?? rollRarity(kind, rng);
  const rarityInfo = RARITY[rarity];
  const slots =
    options.slot !== undefined
      ? [options.slot]
      : options.set
        ? SLOTS.filter((slot) =>
            namesFor(slot, options).some((name) => setForName(name) === options.set),
          )
        : SLOTS;
  const slot = slots[Math.floor(rng() * slots.length)];
  const weights = SLOT_WEIGHT[slot];
  const variance = 0.9 + rng() * 0.2;
  const safeLevel = Math.max(1, Math.floor(level));

  const atk = Math.max(
    0,
    Math.round((2 + safeLevel * 0.8) * weights.atk * rarityInfo.mult * variance),
  );
  const hp = Math.max(
    1,
    Math.round((10 + safeLevel * 3.1) * weights.hp * rarityInfo.mult * variance),
  );
  const def = Math.max(
    0,
    Math.round((0.8 + safeLevel * 0.22) * weights.def * rarityInfo.mult * variance),
  );
  const names = namesFor(slot, options);
  const name = names[Math.floor(rng() * names.length)];
  const power = Math.round(atk * 3 + hp * 0.35 + def * 2);
  const salvage = Math.ceil((3 + safeLevel * 1.2) * rarityInfo.salvageMult);

  const item: Item = {
    id,
    slot,
    rarity,
    name,
    set: setForName(name),
    level: safeLevel,
    atk,
    hp,
    def,
    power,
    salvage,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
  };

  item.substats = rollSubstats(item, rng);
  return item;
}

export function itemStatLine(item: Item): string {
  const stats = itemStats(item);
  const parts: string[] = [];
  if (stats.atk > 0) parts.push(`+${stats.atk} ATK`);
  if (stats.hp > 0) parts.push(`+${stats.hp} HP`);
  if (stats.def > 0) parts.push(`+${stats.def} DEF`);
  return parts.join('  ');
}
