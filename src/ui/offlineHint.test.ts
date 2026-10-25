import { describe, expect, it } from 'vitest';
import { emptyBoosts } from '../data/boost';
import { SKILLS } from '../data/skills';
import type { OfflineReport } from '../sim/offline';
import type { Equipped, Item } from '../sim/types';
import { offlineHints } from './offlineHint';

function report(over: Partial<OfflineReport> = {}): OfflineReport {
  return {
    seconds: 3600,
    capSeconds: 8 * 3600,
    capped: false,
    efficiency: 0.85,
    kills: 120,
    gold: 0,
    exp: 0,
    levels: 0,
    items: [],
    drops: 0,
    salvaged: 0,
    salvageGold: 0,
    essence: 0,
    cores: 0,
    books: 0,
    ...over,
  };
}

function weapon(over: Partial<Item> = {}): Item {
  return {
    id: 'w1',
    slot: 'weapon',
    rarity: 'common',
    name: 'Rusty Shortsword',
    level: 1,
    atk: 6,
    hp: 0,
    def: 0,
    power: 12,
    salvage: 2,
    enhance: 0,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
    ...over,
  };
}

function emptyEquipped(): Equipped {
  return { weapon: null, helm: null, armor: null, boots: null, ring: null, amulet: null };
}

function state(over: Record<string, unknown> = {}) {
  return {
    gold: 0,
    cores: 0,
    books: 0,
    essence: 0,
    farmStage: 3,
    equipped: emptyEquipped(),
    boosts: emptyBoosts(),
    skills: { active: [null, null, null], passive: null, levels: {} },
    ...over,
  };
}

describe('offline upgrade hints', () => {
  it('counts the reward before suggesting a purchase', () => {
    expect(offlineHints(state(), report()).some((hint) => hint.startsWith('ENHANCE'))).toBe(false);

    const equipped = { ...emptyEquipped(), weapon: weapon() };
    const hints = offlineHints(state({ equipped }), report({ gold: 5000 }));
    expect(hints[0]).toContain('ENHANCE WEAPON +0 → +1');
  });

  it('suggests a boost when the claim pays out cores', () => {
    const hints = offlineHints(state(), report({ cores: 1 }));
    expect(hints[0]).toContain('BOOST OFFENSE RANK 1');
  });

  it('suggests a skill level when books are available', () => {
    const skill = SKILLS.find((entry) => entry.type === 'active');
    if (!skill) throw new Error('no active skill');

    const hints = offlineHints(
      state({ skills: { active: [skill.id, null, null], passive: null, levels: {} } }),
      report({ books: 5 }),
    );
    expect(hints[0]).toContain(skill.name.toUpperCase());
  });

  it('suggests a rune when essence is enough', () => {
    const equipped = { ...emptyEquipped(), weapon: weapon({ enhance: 15 }) };
    const hints = offlineHints(state({ equipped, essence: 500 }), report());
    expect(hints.some((hint) => hint.startsWith('SOCKET RUNE'))).toBe(true);
  });

  it('falls back to farming and never returns more than two hints', () => {
    expect(offlineHints(state(), report())[0]).toBe('FARM STAGE 3 · no affordable upgrade yet');

    const equipped = { ...emptyEquipped(), weapon: weapon() };
    const hints = offlineHints(
      state({ equipped, essence: 500, skills: { active: [null, null, null], passive: null, levels: {} } }),
      report({ gold: 5000, cores: 9, books: 9 }),
    );
    expect(hints.length).toBeLessThanOrEqual(2);
  });
});
