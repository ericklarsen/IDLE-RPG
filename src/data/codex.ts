import type { Element, EnemyKind, ItemSet, Slot, SpriteKey } from '../sim/types';
import { BOSS_ELEMENTS, BOSS_NAMES, ENEMY_TIERS } from './enemies';
import { ITEM_NAMES, SLOTS } from './items';
import { setForName } from './sets';

export interface CodexEnemy {
  name: string;
  sprite: SpriteKey;
  element: Element;
  kind: EnemyKind;
}

/** Everything the bestiary can reveal: 15 normal, 15 elite, 5 bosses. */
export const CODEX_ENEMIES: CodexEnemy[] = [
  ...ENEMY_TIERS.flatMap((tier) =>
    tier.names.map((name) => ({
      name,
      sprite: tier.sprite,
      element: tier.element,
      kind: 'normal' as EnemyKind,
    })),
  ),
  ...ENEMY_TIERS.flatMap((tier) =>
    tier.names.map((name) => ({
      name: `Elite ${name}`,
      sprite: tier.sprite,
      element: tier.element,
      kind: 'elite' as EnemyKind,
    })),
  ),
  ...BOSS_NAMES.map((name, index) => ({
    name,
    sprite: 'demon' as SpriteKey,
    element: BOSS_ELEMENTS[index],
    kind: 'boss' as EnemyKind,
  })),
];

export const CODEX_ENEMY_NAMES = new Set(CODEX_ENEMIES.map((entry) => entry.name));

export interface CodexItem {
  name: string;
  slot: Slot;
  set: ItemSet | null;
}

export const CODEX_ITEMS: CodexItem[] = SLOTS.flatMap((slot) =>
  ITEM_NAMES[slot].map((name) => ({ name, slot, set: setForName(name) })),
);

export const CODEX_ITEM_NAMES = new Set(CODEX_ITEMS.map((entry) => entry.name));

export function codexItemsForSlot(slot: Slot): CodexItem[] {
  return CODEX_ITEMS.filter((entry) => entry.slot === slot);
}
