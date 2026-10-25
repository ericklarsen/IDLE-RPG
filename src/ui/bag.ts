import type { Item, Rarity, Slot } from '../sim/types';
import { itemPower } from '../sim/upgrade';

export type BagFilter = 'all' | Slot;
export type BagSort = 'power' | 'rarity';

const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  mythic: 4,
};

/**
 * The bag view: filter by slot, then order by raw power (default) or by
 * rarity first. Ties fall back to the other key so the list never shuffles.
 */
export function filterBag(items: Item[], filter: BagFilter, sort: BagSort): Item[] {
  const visible = filter === 'all' ? items : items.filter((item) => item.slot === filter);

  return [...visible].sort((a, b) => {
    if (sort === 'rarity' && a.rarity !== b.rarity) {
      return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
    }
    const power = itemPower(b) - itemPower(a);
    if (power !== 0) return power;
    return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
  });
}
