import type { ItemSet, Rarity } from '../sim/types';

/** Dust returned by salvaging one item, by rarity. */
export const DUST_BY_RARITY: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 4,
  legendary: 8,
  mythic: 15,
};

/** Three items of one rarity fuse into one of the next; mythic is the cap. */
export const FUSE_UP: Partial<Record<Rarity, Rarity>> = {
  common: 'rare',
  rare: 'epic',
  epic: 'legendary',
  legendary: 'mythic',
};

export const FUSE_COUNT = 3;

/** A crafted set piece is always Epic, so it is priced as a long-term goal. */
export const FORGE_COST = {
  dust: 60,
  essence: 15,
};

/**
 * Emberforged stays event-exclusive: letting players craft it would undercut
 * the weekly cache. The other three sets can be crafted once discovered.
 */
export const CRAFTABLE_SETS: ItemSet[] = ['ashforged', 'voidbound', 'oath'];
