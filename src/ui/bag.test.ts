import { describe, expect, it } from 'vitest';
import type { Item, Rarity, Slot } from '../sim/types';
import { filterBag } from './bag';

function make(id: string, slot: Slot, rarity: Rarity, atk: number): Item {
  return {
    id,
    slot,
    rarity,
    name: id,
    level: 1,
    atk,
    hp: 0,
    def: 0,
    power: 0,
    salvage: 1,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [],
  };
}

// power = atk * 3 + hp * 0.35 + def * 2, so atk alone orders these fixtures.
const blade = make('blade', 'weapon', 'rare', 10);
const hat = make('hat', 'helm', 'epic', 2);
const boots = make('boots', 'boots', 'common', 8);
const relic = make('relic', 'weapon', 'mythic', 5);
const bag = [blade, hat, boots, relic];

describe('filterBag', () => {
  it('sorts the whole bag by power by default', () => {
    expect(filterBag(bag, 'all', 'power').map((item) => item.name)).toEqual([
      'blade',
      'boots',
      'relic',
      'hat',
    ]);
  });

  it('keeps only the chosen slot', () => {
    expect(filterBag(bag, 'weapon', 'power').map((item) => item.name)).toEqual(['blade', 'relic']);
  });

  it('puts the rarest first when sorting by rarity', () => {
    expect(filterBag(bag, 'all', 'rarity').map((item) => item.name)).toEqual([
      'relic',
      'hat',
      'blade',
      'boots',
    ]);
  });

  it('breaks power ties by rarity', () => {
    const equalA = make('equalA', 'ring', 'common', 4);
    const equalB = make('equalB', 'ring', 'legendary', 4);
    expect(filterBag([equalA, equalB], 'all', 'power').map((item) => item.name)).toEqual([
      'equalB',
      'equalA',
    ]);
  });

  it('leaves the source list untouched', () => {
    const source = [...bag];
    filterBag(source, 'all', 'power');
    expect(source.map((item) => item.name)).toEqual(['blade', 'hat', 'boots', 'relic']);
  });

  it('returns an empty list for a slot with no items', () => {
    expect(filterBag(bag, 'amulet', 'power')).toEqual([]);
  });
});
