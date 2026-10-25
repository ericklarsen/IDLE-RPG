import { ELEMENTS } from '../data/elements';
import { rewardFor } from './formulas';
import { SETS } from '../data/sets';
import { SKILLS } from '../data/skills';
import type {
  ArenaRival,
  ArenaResult,
  ArenaSnapshot,
  ArenaState,
  Element,
  PetKind,
} from './types';

/**
 * Asynchronous PvP.
 *
 * There is no backend, so a "rival" is a snapshot of a player-shaped build taken
 * once per day: stats in the same league as the hero, plus an element and a set
 * for flavour. The ladder, tickets, and rewards are all local, which keeps the
 * arena playable offline and testable without a server.
 */

export const ARENA_UNLOCK_STAGE = 30;
export const ARENA_TICKETS = 3;
export const ARENA_RIVAL_COUNT = 3;
export const ARENA_POINTS_WIN = 24;
export const ARENA_POINTS_LOSS = 8;
export const ARENA_SKILL_COOLDOWN = 6.5;

export const ARENA_TIERS = [
  { name: 'Squire', min: 0 },
  { name: 'Knight', min: 120 },
  { name: 'Champion', min: 300 },
  { name: 'Warlord', min: 600 },
  { name: 'Legend', min: 1000 },
] as const;

export interface ArenaBase {
  atk: number;
  maxHp: number;
  def: number;
  atkSpeed: number;
}

/** Three difficulty steps, so a day always offers a safe and a risky fight. */
const RIVAL_MULTIPLIERS = [0.85, 1.0, 1.16];
const RIVAL_LABELS = ['STEADY', 'EVEN', 'DEADLY'];

const RIVAL_NAMES = [
  'Sir Alden',
  'Mira Vex',
  'Kael the Red',
  'Dusk Warden',
  'Orin Blackbriar',
  'Vesna Kray',
  'Rook Hallow',
  'Ilsa Vane',
  'Bram Sable',
  'Torv Ash',
  'Nyx Carrow',
  'Sera Dunhollow',
];

function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emptyArena(day: string): ArenaState {
  return {
    day,
    tickets: ARENA_TICKETS,
    points: 0,
    wins: 0,
    losses: 0,
    rivals: [],
    fought: [],
  };
}

export function arenaTierIndex(points: number): number {
  let index = 0;
  for (let i = 0; i < ARENA_TIERS.length; i += 1) {
    if (points >= ARENA_TIERS[i].min) index = i;
  }
  return index;
}

export function arenaTierInfo(points: number): {
  index: number;
  name: string;
  next: string | null;
  into: number;
  span: number;
} {
  const index = arenaTierIndex(points);
  const tier = ARENA_TIERS[index];
  const next = ARENA_TIERS[index + 1] ?? null;
  return {
    index,
    name: tier.name,
    next: next?.name ?? null,
    into: Math.max(0, points - tier.min),
    span: next ? next.min - tier.min : 0,
  };
}

/**
 * Rivals are seeded by the local day, so the same three opponents wait for the
 * whole day no matter how many times the sheet is reopened.
 */
export function arenaRivals(day: string, base: ArenaBase): ArenaRival[] {
  const rand = seeded(hash(`arena:${day}`));
  const names = [...RIVAL_NAMES];
  for (let i = names.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }

  // The event set stays exclusive to Emberfall, so rivals never advertise it.
  const sets = Object.values(SETS).filter((set) => set.id !== 'emberforged');
  const skills = SKILLS.filter((skill) => skill.type !== 'passive');
  const elementOffset = Math.floor(rand() * ELEMENTS.length);
  const jitter = (): number => 0.94 + rand() * 0.12;

  return RIVAL_MULTIPLIERS.map((multiplier, index) => {
    const atk = Math.max(1, Math.round(base.atk * multiplier * jitter()));
    const hp = Math.max(1, Math.round(base.maxHp * multiplier * jitter()));
    const def = Math.max(0, Math.round(base.def * (0.75 + multiplier * 0.25) * jitter()));
    const atkSpeed =
      Math.round(
        Math.min(1.8, Math.max(0.6, base.atkSpeed * (0.92 + rand() * 0.16))) * 1000,
      ) / 1000;
    const set = sets[Math.floor(rand() * sets.length)];
    const skill = skills[Math.floor(rand() * skills.length)];

    return {
      id: `${day}-${index}`,
      name: names[index],
      element: ELEMENTS[(elementOffset + index) % ELEMENTS.length] as Element,
      hp,
      atk,
      def,
      atkSpeed,
      power: Math.round(atk * atkSpeed * 1.8 + hp / 8 + def * 1.2),
      label: RIVAL_LABELS[index],
      build: `${set.label} · ${skill.name}`,
    };
  });
}

export function arenaSnapshot(
  state: ArenaState,
  unlocked: boolean,
  duelActive: boolean,
): Omit<ArenaSnapshot, 'league'> {
  const tier = arenaTierInfo(state.points);
  return {
    unlocked,
    day: state.day,
    tickets: state.tickets,
    maxTickets: ARENA_TICKETS,
    points: state.points,
    tier: tier.name,
    tierIndex: tier.index,
    nextTier: tier.next,
    into: tier.into,
    span: tier.span,
    wins: state.wins,
    losses: state.losses,
    rivals: state.rivals.map((rival) => ({
      ...rival,
      fought: state.fought.includes(rival.id),
    })),
    duelActive,
  };
}

/**
 * Wisp eggs behind the ladder: only Champion and above can drop one, and the
 * chance climbs with the rank so the top of the ladder keeps paying after gold
 * and cores stop scaling. Three tickets a day cap the supply either way.
 */
export function arenaEggChance(tierIndex: number): number {
  if (tierIndex < 2) return 0;
  return Math.min(0.65, 0.35 + (tierIndex - 2) * 0.15);
}

/** A win pays gold and essence; higher tiers add the occasional core. */export function arenaReward(
  win: boolean,
  points: number,
  farmStage: number,
): { gold: number; essence: number; cores: number } {
  if (!win) return { gold: 0, essence: 0, cores: 0 };
  const tier = arenaTierIndex(points);
  return {
    gold: Math.max(25, Math.round(rewardFor(farmStage, 1, 'normal').gold * 4)),
    essence: 2 + tier,
    cores: tier >= 2 ? 1 : 0,
  };
}

export function arenaResult(input: {
  win: boolean;
  rival: string;
  element: Element;
  points: number;
  pointsAfter: number;
  rank: string;
  rankUp: boolean;
  gold: number;
  essence: number;
  cores: number;
  tickets: number;
  egg: { id: PetKind; eggs: number } | null;
}): ArenaResult {
  return { ...input };
}

const VALID_ELEMENTS = new Set<string>(ELEMENTS);

function cleanRival(value: unknown): ArenaRival | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ArenaRival>;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (typeof raw.name !== 'string' || raw.name.length === 0) return null;
  if (typeof raw.element !== 'string' || !VALID_ELEMENTS.has(raw.element)) return null;
  if (typeof raw.build !== 'string') return null;
  const hp = Number(raw.hp);
  const atk = Number(raw.atk);
  const def = Number(raw.def);
  const atkSpeed = Number(raw.atkSpeed);
  const power = Number(raw.power);
  if (![hp, atk, def, atkSpeed, power].every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (hp <= 0 || atk <= 0 || atkSpeed <= 0) return null;

  return {
    id: raw.id.slice(0, 40),
    name: raw.name.slice(0, 32),
    element: raw.element as Element,
    hp: Math.round(hp),
    atk: Math.round(atk),
    def: Math.round(def),
    atkSpeed: Math.round(atkSpeed * 1000) / 1000,
    power: Math.round(power),
    label: RIVAL_LABELS.includes(raw.label ?? '') ? (raw.label as string) : 'EVEN',
    build: raw.build.slice(0, 64),
  };
}

/** Drops malformed rivals so an edited save cannot inject impossible stats. */
export function normalizeArena(raw?: Partial<ArenaState> | null): ArenaState | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.day !== 'string' || raw.day.length === 0) return null;

  const rivals = Array.isArray(raw.rivals)
    ? raw.rivals
        .map(cleanRival)
        .filter((rival): rival is ArenaRival => rival !== null)
        .slice(0, ARENA_RIVAL_COUNT)
    : [];
  const ids = new Set(rivals.map((rival) => rival.id));
  const fought = Array.isArray(raw.fought)
    ? raw.fought.filter((id): id is string => typeof id === 'string' && ids.has(id))
    : [];

  return {
    day: raw.day.slice(0, 10),
    tickets: Math.max(0, Math.min(ARENA_TICKETS, Math.floor(Number(raw.tickets) || 0))),
    points: Math.max(0, Math.floor(Number(raw.points) || 0)),
    wins: Math.max(0, Math.floor(Number(raw.wins) || 0)),
    losses: Math.max(0, Math.floor(Number(raw.losses) || 0)),
    rivals,
    fought: [...new Set(fought)],
  };
}
