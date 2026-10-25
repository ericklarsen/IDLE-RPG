import type { CharacterId, Element } from '../sim/types';
import type { SkillInfo } from './skills';

export type CharacterRole = 'tank' | 'striker' | 'ranged' | 'caster' | 'support';

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  role: CharacterRole;
  element: Element;
  /** Ink colour used for the portrait chip and the name plate. */
  color: string;
  /** Multipliers layered on the party's gear-derived stats. */
  hp: number;
  atk: number;
  def: number;
  atkSpeed: number;
  crit: number;
  /** Farm stage that unlocks the character; the knight is always available. */
  unlockStage: number;
  /** Auto-cast signature skill, on its own cooldown like the outfit skill. */
  skill: SkillInfo;
  passive: string;
  desc: string;
}

/** Longest battle party; gear and wardrobe are tracked per character. */
export const PARTY_SIZE = 5;

/**
 * The roster. Multipliers are deliberately conservative: five characters
 * fighting at once already multiplies party output, so no character may be
 * strictly better than another — the knight trades damage for HP/DEF, the
 * mage the reverse, and the support brings the only party heal.
 */
export const CHARACTERS: CharacterInfo[] = [
  {
    id: 'knight',
    name: 'Warden',
    role: 'tank',
    element: 'holy',
    color: '#16295c',
    hp: 1.15,
    atk: 0.9,
    def: 1.3,
    atkSpeed: 0.95,
    crit: 0,
    unlockStage: 1,
    skill: {
      id: 'sig-aegis',
      name: 'Aegis Oath',
      type: 'active',
      kind: 'shield',
      element: 'holy',
      shieldPct: 18,
      cooldown: 14,
      desc: 'Shield the party for 18% max HP',
      color: '#16295c',
    },
    passive: '+15% HP, +30% DEF, −10% ATK',
    desc: 'Runs in front and takes the hits the rest of the party cannot.',
  },
  {
    id: 'ranger',
    name: 'Ranger',
    role: 'ranged',
    element: 'lightning',
    color: '#a8720f',
    hp: 0.9,
    atk: 1.1,
    def: 0.9,
    atkSpeed: 1.15,
    crit: 0.04,
    unlockStage: 10,
    skill: {
      id: 'sig-volley',
      name: 'Storm Volley',
      type: 'active',
      kind: 'damage',
      element: 'lightning',
      multiplier: 1.7,
      cooldown: 6,
      desc: '170% ATK lightning damage',
      color: '#a8720f',
    },
    passive: '+15% ATK SPD, +4% CRIT',
    desc: 'Fast single-target pressure that keeps the target softened.',
  },
  {
    id: 'cleric',
    name: 'Cleric',
    role: 'support',
    element: 'holy',
    color: '#2f6f86',
    hp: 1,
    atk: 0.75,
    def: 1.05,
    atkSpeed: 1,
    crit: 0,
    unlockStage: 20,
    skill: {
      id: 'sig-mending',
      name: 'Mending Light',
      type: 'active',
      kind: 'heal',
      element: 'holy',
      healPct: 16,
      cooldown: 12,
      desc: 'Heal the party for 16% max HP',
      color: '#2f6f86',
    },
    passive: '−25% ATK, party heal every 12 s',
    desc: 'The only source of party healing, so a wipe ends before it starts.',
  },
  {
    id: 'mage',
    name: 'Mage',
    role: 'caster',
    element: 'fire',
    color: '#b0362a',
    hp: 0.85,
    atk: 1.3,
    def: 0.85,
    atkSpeed: 0.9,
    crit: 0.02,
    unlockStage: 35,
    skill: {
      id: 'sig-inferno',
      name: 'Inferno',
      type: 'active',
      kind: 'damage',
      element: 'fire',
      multiplier: 2.4,
      cooldown: 9,
      desc: '240% ATK fire damage',
      color: '#b0362a',
    },
    passive: '+30% ATK, −15% HP, −10% ATK SPD',
    desc: 'Slow but the biggest single hit in the roster.',
  },
  {
    id: 'rogue',
    name: 'Rogue',
    role: 'striker',
    element: 'dark',
    color: '#5c3a8c',
    hp: 0.85,
    atk: 1.2,
    def: 0.85,
    atkSpeed: 1.05,
    crit: 0.06,
    unlockStage: 50,
    skill: {
      id: 'sig-nightfall',
      name: 'Nightfall',
      type: 'active',
      kind: 'drain',
      element: 'dark',
      multiplier: 1.9,
      drainPct: 30,
      cooldown: 8,
      desc: '190% ATK dark damage, heals 30% of it',
      color: '#5c3a8c',
    },
    passive: '+6% CRIT, self-sustain',
    desc: 'Crit-hungry striker that keeps itself alive with drain.',
  },
];

export function characterById(id: string | null | undefined): CharacterInfo | null {
  if (!id) return null;
  return CHARACTERS.find((entry) => entry.id === id) ?? null;
}

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && CHARACTERS.some((entry) => entry.id === value);
}

/** Characters a player at this best stage has earned, in roster order. */
export function charactersUnlockedAt(stage: number): CharacterId[] {
  return CHARACTERS.filter((entry) => stage >= entry.unlockStage).map((entry) => entry.id);
}
