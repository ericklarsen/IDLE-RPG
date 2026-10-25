import { CHARACTERS, PARTY_SIZE, characterById, charactersUnlockedAt, isCharacterId } from '../data/characters';
import type { CharacterId, Element, PartyState } from './types';

/** Two characters of the same element already count as a resonance. */
export const RESONANCE_MIN = 2;
/** Party-wide ATK bonus once two members share an element. */
export const RESONANCE_ATK_PCT = 0.06;

export interface PartyResonance {
  element: Element;
  count: number;
  atkPct: number;
}

/** A fresh save starts with the knight alone in the front slot. */
export function emptyParty(bestStage = 1): PartyState {
  const slots: (CharacterId | null)[] = Array.from({ length: PARTY_SIZE }, () => null);
  slots[0] = 'knight';
  return { slots, unlocked: charactersUnlockedAt(bestStage), activeSlot: 0 };
}

function firstFilled(slots: (CharacterId | null)[]): number {
  const index = slots.findIndex(Boolean);
  return index === -1 ? 0 : index;
}

/**
 * Repairs any party blob from storage. Unknown ids are dropped, duplicates are
 * ignored, locked characters are refused, and milestones the save already
 * passed are re-granted — a hand-edited or older save can never field a
 * character it has not earned.
 */
export function normalizeParty(
  raw: Partial<PartyState> | null | undefined,
  bestStage = 1,
): PartyState {
  const earned = new Set<CharacterId>(charactersUnlockedAt(bestStage));
  if (Array.isArray(raw?.unlocked)) {
    for (const id of raw.unlocked) if (isCharacterId(id)) earned.add(id);
  }
  earned.add('knight');

  // Roster order, so the party screen never depends on save order.
  const unlocked = CHARACTERS.filter((entry) => earned.has(entry.id)).map((entry) => entry.id);

  const seen = new Set<CharacterId>();
  const slots: (CharacterId | null)[] = [];
  const rawSlots = Array.isArray(raw?.slots) ? raw.slots : [];
  for (let i = 0; i < PARTY_SIZE; i += 1) {
    const id = rawSlots[i];
    if (!isCharacterId(id) || !earned.has(id) || seen.has(id)) {
      slots.push(null);
      continue;
    }
    seen.add(id);
    slots.push(id);
  }

  // A party is never empty: fall back to the first unlocked character.
  if (!slots.some(Boolean)) {
    const fallback = unlocked[0] ?? 'knight';
    slots[0] = fallback;
    seen.add(fallback);
  }

  const active = Math.floor(Number(raw?.activeSlot));
  const activeSlot =
    Number.isFinite(active) && active >= 0 && active < PARTY_SIZE && slots[active]
      ? active
      : firstFilled(slots);

  return { slots, unlocked, activeSlot };
}

/** Grants every character whose stage milestone the run has reached. */
export function unlockParty(party: PartyState, bestStage: number): { party: PartyState; added: CharacterId[] } {
  const earned = new Set(party.unlocked);
  const added = charactersUnlockedAt(bestStage).filter((id) => !earned.has(id));
  if (added.length === 0) return { party, added: [] };

  const unlocked = CHARACTERS.filter((entry) => earned.has(entry.id) || added.includes(entry.id)).map(
    (entry) => entry.id,
  );
  return { party: { ...party, unlocked }, added };
}

/** Puts a character in a slot (or clears it). Locked or duplicate picks fail. */
export function setPartySlot(
  party: PartyState,
  slot: number,
  id: CharacterId | null,
): PartyState | null {
  if (!Number.isInteger(slot) || slot < 0 || slot >= PARTY_SIZE) return null;
  if (id !== null && !party.unlocked.includes(id)) return null;
  if (id !== null && party.slots.some((current, index) => index !== slot && current === id)) {
    return null;
  }

  const slots = [...party.slots];
  slots[slot] = id;
  if (!slots.some(Boolean)) return null;

  const activeSlot = slots[party.activeSlot] ? party.activeSlot : firstFilled(slots);
  return { ...party, slots, activeSlot };
}

/** Adds the next unlocked character that is not in the party yet. */
export function fillNextSlot(party: PartyState): PartyState | null {
  const free = party.slots.indexOf(null);
  if (free === -1) return null;
  const next = party.unlocked.find((id) => !party.slots.includes(id));
  return next ? setPartySlot(party, free, next) : null;
}

/** The member whose stats the HUD reports: the active slot, else the leader. */
export function activeCharacterId(party: PartyState): CharacterId {
  return party.slots[party.activeSlot] ?? party.slots[firstFilled(party.slots)] ?? 'knight';
}

export function partyMembers(party: PartyState): CharacterId[] {
  return party.slots.filter((id): id is CharacterId => Boolean(id));
}

/** What the PARTY screen renders; built from the live sim, not from the save. */
export interface PartyView {
  slots: (CharacterId | null)[];
  unlocked: CharacterId[];
  activeSlot: number;
  members: {
    id: CharacterId;
    name: string;
    /** Ink colour of the roster chip, so the HUD strip matches the PARTY screen. */
    color: string;
    element: Element;
    hp: number;
    maxHp: number;
    active: boolean;
    down: boolean;
  }[];
}

/** Element resonance: two matching members give the party +6% ATK. */
export function partyResonance(party: PartyState): PartyResonance | null {
  const counts = new Map<Element, number>();
  for (const id of partyMembers(party)) {
    const info = characterById(id);
    if (!info) continue;
    counts.set(info.element, (counts.get(info.element) ?? 0) + 1);
  }

  let best: PartyResonance | null = null;
  for (const [element, count] of counts) {
    if (count < RESONANCE_MIN) continue;
    if (best && best.count >= count) continue;
    best = { element, count, atkPct: RESONANCE_ATK_PCT };
  }
  return best;
}
