import { BALANCE } from '../data/balance';
import { CHARACTERS } from '../data/characters';
import { emptyEquipped, INVENTORY_CAP, RARITIES, SLOTS } from '../data/items';
import { normalizeParty } from '../sim/party';
import { normalizeArena } from '../sim/arena';
import { normalizeAscension } from '../sim/ascension';
import { normalizeBoosts } from '../sim/boost';
import { normalizeCodex } from '../sim/codex';
import { normalizePalette } from '../sim/palette';
import { normalizePets } from '../sim/pets';
import { normalizeMounts } from '../sim/mounts';
import { normalizeWings } from '../sim/wings';
import { normalizeRefine } from '../sim/refine';
import { normalizeDungeon, normalizeShop } from '../sim/dungeon';
import { normalizeCostume } from '../sim/costume';
import { normalizeEvent } from '../sim/event';
import { normalizeLeague } from '../sim/league';
import { normalizeTrial } from '../sim/trial';
import { normalizeSkills } from '../sim/skills';
import type {
  CharacterId,
  CostumeState,
  Equipped,
  Item,
  Rarity,
  Rune,
  SaveData,
  Slot,
} from '../sim/types';
import { normalizeItem } from '../sim/upgrade';

const SAVE_KEY = 'idle-forge-save-v1';
const SAVE_VERSION = 24;
const SAVE_CODE_PREFIX = 'IF1-';

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeItem(value: unknown): Item | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<Item>;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (!SLOTS.includes(raw.slot as Slot)) return null;
  if (!RARITIES.includes(raw.rarity as Rarity)) return null;
  if (typeof raw.name !== 'string') return null;

  return normalizeItem({
    id: raw.id,
    slot: raw.slot as Slot,
    rarity: raw.rarity as Rarity,
    name: raw.name,
    level: Math.max(1, Math.floor(finite(raw.level, 1))),
    atk: Math.max(0, finite(raw.atk, 0)),
    hp: Math.max(0, finite(raw.hp, 0)),
    def: Math.max(0, finite(raw.def, 0)),
    power: Math.max(0, finite(raw.power, 0)),
    salvage: Math.max(0, finite(raw.salvage, 0)),
    enhance: Math.max(0, Math.floor(finite(raw.enhance, 0))),
    pity: Math.max(0, Math.floor(finite(raw.pity, 0))),
    refines: Math.max(0, Math.floor(finite(raw.refines, 0))),
    enchants: Math.max(0, Math.floor(finite(raw.enchants, 0))),
    substats: Array.isArray(raw.substats) ? raw.substats : [],
    runes: Array.isArray(raw.runes) ? (raw.runes as (Rune | null)[]) : [],
  });
}

function sanitizeEquipped(value: unknown): Equipped {
  const equipped = emptyEquipped();
  if (!value || typeof value !== 'object') return equipped;

  const raw = value as Partial<Record<Slot, unknown>>;
  for (const slot of SLOTS) {
    const item = sanitizeItem(raw[slot]);
    if (item && item.slot === slot) equipped[slot] = item;
  }
  return equipped;
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function parseSave(raw: string): SaveData | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SaveData> & { enhanceLevel?: unknown };
    const version = Math.floor(finite(parsed.version, 1));
    if (version < 1 || version > SAVE_VERSION) return null;

    const seen = new Set<string>();
    const inventory = (Array.isArray(parsed.inventory) ? parsed.inventory : [])
      .map(sanitizeItem)
      .filter((item): item is Item => {
        if (!item || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, INVENTORY_CAP);

    // v24 keeps one equipment set per character. Saves from before that carry
    // a single set, which belongs to the knight; the rest start empty.
    const gear = {} as Record<CharacterId, Equipped>;
    for (const entry of CHARACTERS) {
      const stored = parsed.gear ? sanitizeEquipped(parsed.gear[entry.id]) : null;
      const legacy =
        !parsed.gear && entry.id === 'knight' ? sanitizeEquipped(parsed.equipped) : null;
      const equipped = stored ?? legacy ?? emptyEquipped();

      for (const slot of SLOTS) {
        const item = equipped[slot];
        if (!item) continue;
        if (seen.has(item.id)) equipped[slot] = null;
        else seen.add(item.id);
      }
      gear[entry.id] = equipped;
    }
    // Top-level `equipped` stays as the knight's set for older readers.
    const equipped = gear.knight;

    const costumes = {} as Record<CharacterId, CostumeState>;
    for (const entry of CHARACTERS) {
      const legacy = entry.id === 'knight' ? parsed.costume : null;
      costumes[entry.id] = normalizeCostume(parsed.costumes?.[entry.id] ?? legacy);
    }

    let maxSeq = Math.max(0, Math.floor(finite(parsed.itemSeq, 0)));
    for (const item of [
      ...inventory,
      ...CHARACTERS.flatMap((entry) => SLOTS.map((slot) => gear[entry.id][slot])),
    ]) {
      if (!item) continue;
      const match = /^it_(\d+)$/.exec(item.id);
      if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
    }

    // v1/v2 enhancement was global. Move it onto the best weapon so players
    // keep the power they paid for instead of losing the upgrade.
    if (version < 3) {
      const legacy = Math.max(
        0,
        Math.min(BALANCE.enhanceMax, Math.floor(finite(parsed.enhanceLevel, 0))),
      );
      if (legacy > 0) {
        const target = equipped.weapon ?? inventory.find((item) => item.slot === 'weapon');
        if (target) target.enhance = Math.max(target.enhance, legacy);
      }
    }

    const maxStage = Math.max(1, Math.min(999, Math.floor(finite(parsed.maxStage, 1))));

    return {
      version: SAVE_VERSION,
      level: Math.max(1, Math.min(999, Math.floor(finite(parsed.level, 1)))),
      exp: Math.max(0, finite(parsed.exp, 0)),
      gold: Math.max(0, finite(parsed.gold, 0)),
      essence: Math.max(0, Math.floor(finite(parsed.essence, 0))),
      cores: Math.max(0, Math.floor(finite(parsed.cores, 0))),
      books: Math.max(0, Math.floor(finite(parsed.books, 0))),
      dust: Math.max(0, Math.floor(finite(parsed.dust, 0))),
      boosts: normalizeBoosts(parsed.boosts),
      skills: normalizeSkills(parsed.skills),
      ascension: normalizeAscension(parsed.ascension),
      maxStage,
      farmStage: Math.max(
        1,
        Math.min(
          999,
          Math.floor(finite(parsed.maxStage, 1)),
          Math.floor(finite(parsed.farmStage, finite(parsed.maxStage, 1))),
        ),
      ),
      stage: Math.max(
        1,
        Math.min(999, Math.floor(finite(parsed.stage, finite(parsed.maxStage, 1)))),
      ),
      rift:
        parsed.rift && typeof parsed.rift.day === 'string'
          ? {
              day: parsed.rift.day.slice(0, 10),
              kills: Math.max(0, Math.floor(finite(parsed.rift.kills, 0))),
            }
          : undefined,
      arena: normalizeArena(parsed.arena) ?? undefined,
      league: normalizeLeague(parsed.league),
      trial: normalizeTrial(parsed.trial),
      costume: costumes.knight,
      costumes,
      gear,
      party: normalizeParty(parsed.party, maxStage),
      event: normalizeEvent(parsed.event),
      codex: normalizeCodex(parsed.codex),
      palette: normalizePalette(parsed.palette),
      mounts: normalizeMounts(parsed.mounts),
      wings: normalizeWings(parsed.wings),
      // Left undefined when absent so the sim can migrate the old per-item roll
      // count onto the equipped slots.
      ...(parsed.refine ? { refine: normalizeRefine(parsed.refine) } : {}),
      crystals: Math.max(0, Math.floor(finite(parsed.crystals, 0))),
      dungeon: normalizeDungeon(parsed.dungeon),
      shop: normalizeShop(parsed.shop),
      pets: normalizePets(
        parsed.pets ??
          (parsed.companion?.level
            ? {
                active: 'ember',
                kinds: {
                  ember: { level: parsed.companion.level, maxLevel: 10, eggs: 0 },
                },
              }
            : undefined),
      ),
      kills: Math.max(0, Math.floor(finite(parsed.kills, 0))),
      inventory,
      equipped,
      itemSeq: maxSeq,
      lastSeen: Math.max(0, Math.floor(finite(parsed.lastSeen, 0))),
    };
  } catch {
    return null;
  }
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return parseSave(raw);
  } catch {
    return null;
  }
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(encoded: string): string | null {
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Portable, copy-paste backup. Sanitised on the way out and back in. */
export function exportSave(): string | null {
  const data = loadSave();
  if (!data) return null;
  return `${SAVE_CODE_PREFIX}${toBase64(JSON.stringify(data))}`;
}

export function importSave(code: string): SaveData | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const raw = trimmed.startsWith(SAVE_CODE_PREFIX)
    ? fromBase64(trimmed.slice(SAVE_CODE_PREFIX.length))
    : trimmed;
  if (!raw) return null;

  const data = parseSave(raw);
  if (!data) return null;

  // Restoring a backup should not immediately trigger an offline report.
  writeSave({ ...data, lastSeen: Date.now() });
  return data;
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Private mode or quota exceeded: keep playing without persistence.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage errors.
  }
}
