import type { Equipped, Item, Rarity, Slot } from '../sim/types';

export const SLOTS: Slot[] = ['weapon', 'helm', 'armor', 'boots', 'ring', 'amulet'];

export const SLOT_LABEL: Record<Slot, string> = {
  weapon: 'Weapon',
  helm: 'Helm',
  armor: 'Armor',
  boots: 'Boots',
  ring: 'Ring',
  amulet: 'Amulet',
};

// One bag for the whole roster. Raising this is not a free capacity change:
// a bigger bag keeps more per-slot candidates alive, so EQUIP BEST gets better
// gear. Measured through scripts/pacing.ts, 40 slots cut stage 50 from 7.6h to
// 6.1h and pushed surge uptime to 24.3%, outside its 15-20% band. It stays 24
// until the arc is re-baselined on purpose.
export const INVENTORY_CAP = 24;

export interface RarityInfo {
  label: string;
  color: string;
  mult: number;
  salvageMult: number;
  weight: number;
  eliteWeight: number;
  bossWeight: number;
}

export const RARITY: Record<Rarity, RarityInfo> = {
  common: {
    label: 'Common',
    color: '#6b7488',
    mult: 1,
    salvageMult: 1,
    weight: 58,
    eliteWeight: 24,
    bossWeight: 0,
  },
  rare: {
    label: 'Rare',
    color: '#1f4fa8',
    mult: 1.5,
    salvageMult: 2,
    weight: 26,
    eliteWeight: 42,
    bossWeight: 0,
  },
  epic: {
    label: 'Epic',
    color: '#a0212c',
    mult: 2.2,
    salvageMult: 4,
    weight: 11,
    eliteWeight: 25,
    bossWeight: 55,
  },
  legendary: {
    label: 'Legendary',
    color: '#9c6a0c',
    mult: 3.2,
    salvageMult: 8,
    weight: 4.2,
    eliteWeight: 8,
    bossWeight: 35,
  },
  mythic: {
    label: 'Mythic',
    color: '#101322',
    mult: 4.6,
    salvageMult: 15,
    weight: 0.8,
    eliteWeight: 1,
    bossWeight: 10,
  },
};

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

interface SlotWeight {
  atk: number;
  hp: number;
  def: number;
}

export const SLOT_WEIGHT: Record<Slot, SlotWeight> = {
  weapon: { atk: 1, hp: 0.35, def: 0.1 },
  helm: { atk: 0.15, hp: 0.7, def: 0.55 },
  armor: { atk: 0.1, hp: 1, def: 0.8 },
  boots: { atk: 0.15, hp: 0.5, def: 0.4 },
  ring: { atk: 0.6, hp: 0.35, def: 0.15 },
  amulet: { atk: 0.4, hp: 0.55, def: 0.25 },
};

export const ITEM_NAMES: Record<Slot, string[]> = {
  weapon: [
    'Rusty Shortsword',
    "Knight's Blade",
    'Ember Cleaver',
    'Frostfang',
    'Void Reaver',
    'Cinder Fang',
  ],
  helm: ['Dented Helm', 'Iron Casque', 'Sentinel Helm', 'Crown of Ash', 'Void Visor', 'Cinder Crown'],
  armor: [
    'Patched Leather',
    'Chainmail',
    'Knight Plate',
    'Ember Aegis',
    'Void Carapace',
    'Emberforged Plate',
  ],
  boots: [
    'Worn Boots',
    'Scout Greaves',
    'Knight Sabatons',
    'Ash Striders',
    'Void Treads',
    'Cinder Treads',
  ],
  ring: ['Copper Band', 'Silver Ring', 'Sigil Ring', 'Ember Loop', 'Void Signet', 'Ember Sigil'],
  amulet: [
    'Bone Charm',
    'Silver Locket',
    'Warden Talisman',
    'Ash Pendant',
    'Void Heart',
    'Cinder Heart',
  ],
};

export function starterWeapon(): Item {
  return {
    id: 'it_0',
    slot: 'weapon',
    rarity: 'common',
    name: 'Rusty Shortsword',
    level: 1,
    atk: 6,
    hp: 10,
    def: 1,
    power: 22,
    salvage: 3,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
  };
}

export function emptyEquipped(): Equipped {
  return {
    weapon: null,
    helm: null,
    armor: null,
    boots: null,
    ring: null,
    amulet: null,
  };
}
