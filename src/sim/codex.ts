import { CODEX_ENEMY_NAMES, CODEX_ITEM_NAMES } from '../data/codex';
import { COSTUMES } from '../data/costumes';
import { MOUNTS } from '../data/mounts';
import { WINGS } from '../data/wings';
import { RIFT_MODIFIERS } from './rift';
import type { CodexState } from './types';

export const CODEX_MODIFIER_IDS = new Set(RIFT_MODIFIERS.map((modifier) => modifier.id));
export const CODEX_COSTUME_IDS = new Set(COSTUMES.map((costume) => costume.id));
export const CODEX_MOUNT_IDS = new Set(MOUNTS.map((mount) => mount.id));
export const CODEX_WING_IDS = new Set(WINGS.map((wing) => wing.id));

export function emptyCodex(): CodexState {
  return { enemies: [], items: [], modifiers: [], costumes: [], mounts: [], wings: [] };
}

function clean(list: unknown, valid: Set<string>): string[] {
  if (!Array.isArray(list)) return [];
  const found: string[] = [];
  for (const value of list) {
    if (typeof value !== 'string' || !valid.has(value) || found.includes(value)) continue;
    found.push(value);
  }
  return found;
}

/** Drops unknown names so an edited or corrupted save cannot bloat the codex. */
export function normalizeCodex(raw?: Partial<CodexState> | null): CodexState {
  return {
    enemies: clean(raw?.enemies, CODEX_ENEMY_NAMES),
    items: clean(raw?.items, CODEX_ITEM_NAMES),
    modifiers: clean(raw?.modifiers, CODEX_MODIFIER_IDS),
    costumes: clean(raw?.costumes, CODEX_COSTUME_IDS),
    mounts: clean(raw?.mounts, CODEX_MOUNT_IDS),
    wings: clean(raw?.wings, CODEX_WING_IDS),
  };
}

export function codexHas(state: CodexState, group: keyof CodexState, value: string): boolean {
  return state[group].includes(value);
}
