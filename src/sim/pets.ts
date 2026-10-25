import {
  PETS,
  PET_BASE_MAX,
  PET_MAX_CAP,
  PET_SYNTH_STEP,
  petById,
  petDps,
  type PetInfo,
} from '../data/pets';
import type { PetKind, PetsState, PetState } from './types';

/**
 * The kennel: three wisps, exactly one awake at a time. A pet is awakened by
 * clearing its stage and then trained with gold; duplicate eggs raise the level
 * ceiling rather than the level itself, so synthesising never hands out free
 * power — it only lets the gold grind go further.
 */

function clampLevel(level: number, maxLevel: number): number {
  return Math.max(0, Math.min(maxLevel, Math.floor(level)));
}

export function currentPets(): PetsState {
  return { active: null, kinds: {} };
}

export function normalizePets(raw?: Partial<PetsState> | null): PetsState {
  const kinds: Partial<Record<PetKind, PetState>> = {};

  const source = raw?.kinds && typeof raw.kinds === 'object' ? raw.kinds : {};
  for (const info of PETS) {
    const entry = source[info.id];
    if (!entry || typeof entry !== 'object') continue;

    const maxLevel = Number(entry.maxLevel);
    const ceiling = Number.isFinite(maxLevel)
      ? Math.max(PET_BASE_MAX, Math.min(PET_MAX_CAP, Math.floor(maxLevel)))
      : PET_BASE_MAX;
    const level = Number(entry.level);
    const eggs = Number(entry.eggs);

    kinds[info.id] = {
      level: Number.isFinite(level) ? clampLevel(level, ceiling) : 0,
      maxLevel: ceiling,
      eggs: Number.isFinite(eggs) ? Math.max(0, Math.floor(eggs)) : 0,
    };
  }

  const active =
    typeof raw?.active === 'string' && kinds[raw.active as PetKind]?.level
      ? (raw.active as PetKind)
      : (PETS.find((info) => (kinds[info.id]?.level ?? 0) > 0)?.id ?? null);

  return { active, kinds };
}

export function activePetInfo(state: PetsState): PetInfo | null {
  return petById(state.active) ?? null;
}

export function activePetState(state: PetsState): PetState | null {
  return state.active ? (state.kinds[state.active] ?? null) : null;
}

export function petLevel(state: PetsState): number {
  return activePetState(state)?.level ?? 0;
}

export function petDpsFor(state: PetsState, atk: number): number {
  const info = activePetInfo(state);
  const pet = activePetState(state);
  if (!info || !pet) return 0;
  return petDps(info, atk, pet.level);
}

/** Awakens a pet the first time its stage is cleared. */
export function awakenPet(state: PetsState, id: PetKind): PetsState {
  const info = petById(id);
  if (!info) return state;
  if ((state.kinds[id]?.level ?? 0) > 0) return state;

  return {
    active: state.active ?? id,
    kinds: {
      ...state.kinds,
      [id]: { level: 1, maxLevel: PET_BASE_MAX, eggs: 0 },
    },
  };
}

/** Picks which pet fights; unknown or locked ids are refused. */
export function setActive(state: PetsState, id: PetKind | null): PetsState | null {
  if (id === null) return { ...state, active: null };
  if ((state.kinds[id]?.level ?? 0) <= 0) return null;
  return { ...state, active: id };
}

/** Adds one duplicate egg to a pet that can still grow. */
export function addEgg(state: PetsState, id: PetKind): { pets: PetsState; eggs: number } | null {
  const pet = state.kinds[id];
  if (!pet || pet.level <= 0) return null;
  if (pet.maxLevel >= PET_MAX_CAP) return null;

  const eggs = pet.eggs + 1;
  return {
    pets: { ...state, kinds: { ...state.kinds, [id]: { ...pet, eggs } } },
    eggs,
  };
}

/** Spends one egg to raise the ceiling by a step. */
export function synthesize(
  state: PetsState,
  id: PetKind,
): { pets: PetsState; maxLevel: number } | null {
  const pet = state.kinds[id];
  if (!pet || pet.eggs <= 0 || pet.maxLevel >= PET_MAX_CAP) return null;

  const maxLevel = Math.min(PET_MAX_CAP, pet.maxLevel + PET_SYNTH_STEP);
  return {
    pets: {
      ...state,
      kinds: { ...state.kinds, [id]: { ...pet, eggs: pet.eggs - 1, maxLevel } },
    },
    maxLevel,
  };
}

export function trainPet(
  state: PetsState,
  id: PetKind,
  gold: number,
): { pets: PetsState; cost: number; level: number } | null {
  const pet = state.kinds[id];
  if (!pet || pet.level <= 0 || pet.level >= pet.maxLevel) return null;

  const info = petById(id);
  if (!info) return null;

  const cost = Math.ceil(info.costBase * Math.pow(info.costGrowth, pet.level - 1));
  if (gold < cost) return null;

  return {
    pets: { ...state, kinds: { ...state.kinds, [id]: { ...pet, level: pet.level + 1 } } },
    cost,
    level: pet.level + 1,
  };
}
