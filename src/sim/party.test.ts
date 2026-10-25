import { describe, expect, it } from 'vitest';
import { CHARACTERS, PARTY_SIZE, characterById, charactersUnlockedAt } from '../data/characters';
import { SKILLS } from '../data/skills';
import {
  emptyParty,
  fillNextSlot,
  normalizeParty,
  partyMembers,
  partyResonance,
  setPartySlot,
  unlockParty,
} from './party';
import type { PartyState } from './types';

const rosterIds = CHARACTERS.map((entry) => entry.id);

describe('character roster', () => {
  it('offers one character per role with unique ids', () => {
    expect(CHARACTERS).toHaveLength(PARTY_SIZE);
    expect(new Set(rosterIds).size).toBe(rosterIds.length);
    expect(new Set(CHARACTERS.map((entry) => entry.role)).size).toBe(CHARACTERS.length);
  });

  it('keeps every stat multiplier positive and near parity', () => {
    for (const entry of CHARACTERS) {
      for (const key of ['hp', 'atk', 'def', 'atkSpeed'] as const) {
        expect(entry[key], `${entry.id}.${key}`).toBeGreaterThan(0.5);
        expect(entry[key], `${entry.id}.${key}`).toBeLessThanOrEqual(1.5);
      }
      expect(entry.crit, entry.id).toBeGreaterThanOrEqual(0);
      expect(entry.crit, entry.id).toBeLessThan(0.15);
    }
  });

  it('gives each character a signature skill that is not a loadout skill', () => {
    const loadout = new Set(SKILLS.map((skill) => skill.id));
    for (const entry of CHARACTERS) {
      expect(entry.skill.id, entry.id).toMatch(/^sig-/);
      expect(loadout.has(entry.skill.id), entry.id).toBe(false);
      expect(entry.skill.cooldown ?? 0, entry.id).toBeGreaterThanOrEqual(6);
    }
    expect(new Set(CHARACTERS.map((entry) => entry.skill.id)).size).toBe(CHARACTERS.length);
  });

  it('unlocks by stage milestone, with the knight always available', () => {
    expect(charactersUnlockedAt(1)).toEqual(['knight']);
    expect(charactersUnlockedAt(9)).not.toContain('ranger');
    expect(charactersUnlockedAt(10)).toContain('ranger');

    const stages = CHARACTERS.map((entry) => entry.unlockStage);
    expect([...stages].sort((a, b) => a - b)).toEqual(stages);
    expect(charactersUnlockedAt(50)).toHaveLength(CHARACTERS.length);
    expect(characterById('nobody')).toBeNull();
  });
});

describe('party state', () => {
  it('starts with the knight in the front slot', () => {
    const party = emptyParty();
    expect(party.slots).toHaveLength(PARTY_SIZE);
    expect(party.slots[0]).toBe('knight');
    expect(party.slots.slice(1).every((slot) => slot === null)).toBe(true);
    expect(party.activeSlot).toBe(0);
  });

  it('repairs a missing, corrupt, or duplicated save', () => {
    expect(normalizeParty(undefined).slots[0]).toBe('knight');

    const repaired = normalizeParty(
      {
        slots: ['mage', 'knight', 'knight', 'ghost', 'ranger'] as PartyState['slots'],
        unlocked: ['ghost', 'knight', 'ranger'] as PartyState['unlocked'],
        activeSlot: 99,
      },
      10,
    );
    // The mage is still locked at stage 10, the second knight is a duplicate,
    // and "ghost" is not a character; only the two earned ids survive in place.
    expect(repaired.slots).toEqual([null, 'knight', null, null, 'ranger']);
    expect(repaired.unlocked).toEqual(['knight', 'ranger']);
    expect(repaired.activeSlot).toBe(1);
  });

  it('re-grants milestones the run already passed', () => {
    const party = normalizeParty({ slots: ['knight', null, null, null, null], unlocked: ['knight'], activeSlot: 0 }, 35);
    expect(party.unlocked).toEqual(['knight', 'ranger', 'cleric', 'mage']);
  });

  it('never leaves the party empty', () => {
    const party = normalizeParty({ slots: [null, null, null, null, null], unlocked: [], activeSlot: 0 }, 1);
    expect(party.slots[0]).toBe('knight');
    expect(partyMembers(party)).toEqual(['knight']);
  });

  it('refuses locked, duplicate, and out-of-range slots', () => {
    const party = normalizeParty(undefined, 10);
    expect(setPartySlot(party, 1, 'ranger')?.slots[1]).toBe('ranger');
    expect(setPartySlot(party, 2, 'mage')).toBeNull();
    expect(setPartySlot(party, 1, 'knight')).toBeNull();
    expect(setPartySlot(party, 9, 'ranger')).toBeNull();
    expect(setPartySlot(party, 0, null)).toBeNull();
  });

  it('moves the reported member when its slot is cleared', () => {
    const party = normalizeParty({ slots: ['knight', 'ranger', null, null, null], unlocked: ['knight', 'ranger'], activeSlot: 1 }, 10);
    const cleared = setPartySlot(party, 1, null);
    expect(cleared?.slots[1]).toBeNull();
    expect(cleared?.activeSlot).toBe(0);
  });

  it('unlocks once per milestone and fills free slots in roster order', () => {
    const party = emptyParty();
    const once = unlockParty(party, 20);
    expect(once.added).toEqual(['ranger', 'cleric']);
    expect(unlockParty(once.party, 20).added).toEqual([]);

    const filled = fillNextSlot(once.party);
    expect(filled?.slots[1]).toBe('ranger');
    expect(fillNextSlot(filled!)?.slots[2]).toBe('cleric');
  });

  it('rewards two members of the same element with a resonance', () => {
    expect(partyResonance(emptyParty())).toBeNull();

    const holyPair = normalizeParty(
      { slots: ['knight', 'cleric', null, null, null], unlocked: ['knight', 'cleric'], activeSlot: 0 },
      20,
    );
    expect(partyResonance(holyPair)).toEqual({ element: 'holy', count: 2, atkPct: 0.06 });

    const mixed = normalizeParty(
      { slots: ['knight', 'ranger', null, null, null], unlocked: ['knight', 'ranger'], activeSlot: 0 },
      10,
    );
    expect(partyResonance(mixed)).toBeNull();
  });
});
