import { PALETTES, paletteById, type PaletteId } from '../data/palettes';
import type { PaletteState } from './types';

/**
 * Palette ownership.
 *
 * Milestones are checked every tick but only ever *add* to the unlocked list,
 * so a Champion who later drops a division keeps the colour, and a trial floor
 * that resets on Monday does not take it back. The list lives in the save, which
 * is why earning a palette does not depend on replaying the old milestone.
 */

/** Everything a milestone needs; comes from live sim state. */
export interface PaletteProgress {
  ascensions: number;
  arenaPoints: number;
  trialCleared: number;
  /** True while this week's Emberfall cache has been claimed. */
  eventClaimed: boolean;
  farmStage: number;
}

export const PALETTE_MILESTONES: Record<PaletteId, (progress: PaletteProgress) => boolean> = {
  ashen: (progress) => progress.ascensions >= 1,
  champion: (progress) => progress.arenaPoints >= 300,
  trialborn: (progress) => progress.trialCleared >= 10,
  emberfall: (progress) => progress.eventClaimed,
  stormtouched: (progress) => progress.farmStage >= 60,
};

export function emptyPalette(): PaletteState {
  return { worn: null, unlocked: [] };
}

export function normalizePalette(raw?: Partial<PaletteState> | null): PaletteState {
  const unlocked: PaletteId[] = [];
  if (Array.isArray(raw?.unlocked)) {
    for (const entry of raw.unlocked) {
      const info = paletteById(entry);
      if (!info || unlocked.includes(info.id)) continue;
      unlocked.push(info.id);
    }
  }

  const worn =
    typeof raw?.worn === 'string' && unlocked.includes(raw.worn as PaletteId)
      ? (raw.worn as PaletteId)
      : null;

  return { worn, unlocked };
}

/** Adds every palette whose milestone is met; returns only the new ids. */
export function earnPalettes(
  state: PaletteState,
  progress: PaletteProgress,
): { palette: PaletteState; earned: PaletteId[] } {
  const earned: PaletteId[] = [];
  for (const info of PALETTES) {
    if (state.unlocked.includes(info.id)) continue;
    if (PALETTE_MILESTONES[info.id](progress)) earned.push(info.id);
  }

  if (earned.length === 0) return { palette: state, earned };
  return { palette: { ...state, unlocked: [...state.unlocked, ...earned] }, earned };
}

/** Wears an owned palette, or clears the accent; locked ids are refused. */
export function wearPalette(state: PaletteState, id: string | null): PaletteState | null {
  if (id === null) return { ...state, worn: null };
  const info = paletteById(id);
  if (!info || !state.unlocked.includes(info.id)) return null;
  return { ...state, worn: info.id };
}
