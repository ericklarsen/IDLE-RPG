import { CRAFTABLE_SETS, FUSE_COUNT, FUSE_UP } from '../data/forge';
import { setForName } from '../data/sets';
import type { Item, ItemSet, Rarity } from './types';
import { itemPower } from './upgrade';

export interface ForgeOutcome {
  ok: boolean;
  reason?: 'items' | 'rarity' | 'dust' | 'essence' | 'set' | 'slot';
  item?: Item;
  consumed?: Item[];
}

export function fuseTarget(rarity: Rarity): Rarity | null {
  return FUSE_UP[rarity] ?? null;
}

/** Weakest items first, so a fuse never eats the piece the player is saving. */
export function fuseCandidates(inventory: Item[], rarity: Rarity): Item[] {
  return inventory
    .filter((item) => item.rarity === rarity)
    .sort((a, b) => itemPower(a) - itemPower(b) || a.id.localeCompare(b.id))
    .slice(0, FUSE_COUNT);
}

/** Sets the player has actually seen, minus the event-exclusive one. */
export function craftableSets(foundNames: Iterable<string>): ItemSet[] {
  const found = new Set<ItemSet>();
  for (const name of foundNames) {
    const set = setForName(name);
    if (set) found.add(set);
  }
  return CRAFTABLE_SETS.filter((id) => found.has(id));
}
