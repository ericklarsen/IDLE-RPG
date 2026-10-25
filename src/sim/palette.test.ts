import { describe, expect, it } from 'vitest';
import { PALETTES } from '../data/palettes';
import { BattleSim } from './battle';
import {
  earnPalettes,
  emptyPalette,
  normalizePalette,
  wearPalette,
  type PaletteProgress,
} from './palette';
import { weekKey } from './week';
import type { SaveData, SimEvent } from './types';

const NONE: PaletteProgress = {
  ascensions: 0,
  arenaPoints: 0,
  trialCleared: 0,
  eventClaimed: false,
  farmStage: 1,
};

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 19,
    level: 1,
    exp: 0,
    gold: 0,
    maxStage: 1,
    kills: 0,
    inventory: [],
    equipped: {},
    itemSeq: 10,
    ...overrides,
  };
}

describe('palette milestones', () => {
  it('memberi tiap palet hanya dari milestone-nya sendiri', () => {
    const earned = (progress: Partial<PaletteProgress>) =>
      earnPalettes(emptyPalette(), { ...NONE, ...progress }).earned;

    expect(earned({ ascensions: 1 })).toEqual(['ashen']);
    expect(earned({ arenaPoints: 300 })).toEqual(['champion']);
    expect(earned({ arenaPoints: 299 })).toEqual([]);
    expect(earned({ trialCleared: 10 })).toEqual(['trialborn']);
    expect(earned({ eventClaimed: true })).toEqual(['emberfall']);
    expect(earned({ farmStage: 60 })).toEqual(['stormtouched']);
    expect(earned({ farmStage: 59 })).toEqual([]);
  });

  it('hanya menambah, tidak pernah mencabut, dan idempoten', () => {
    const first = earnPalettes(emptyPalette(), { ...NONE, farmStage: 60, ascensions: 1 });
    expect(first.earned).toEqual(['ashen', 'stormtouched']);

    const again = earnPalettes(first.palette, { ...NONE, farmStage: 60, ascensions: 1 });
    expect(again.earned).toEqual([]);
    expect(again.palette.unlocked).toEqual(['ashen', 'stormtouched']);

    // Losing the arena points or the trial week does not take a palette back.
    const kept = earnPalettes(again.palette, NONE);
    expect(kept.palette.unlocked).toEqual(['ashen', 'stormtouched']);
  });

  it('membuang id tak dikenal dan duplikat saat normalisasi', () => {
    expect(normalizePalette(null)).toEqual({ worn: null, unlocked: [] });
    expect(
      normalizePalette({ worn: 'champion', unlocked: ['champion', 'ghost', 'champion', 'ashen'] }),
    ).toEqual({ worn: 'champion', unlocked: ['champion', 'ashen'] });

    // Wearing something not owned falls back to no accent.
    expect(normalizePalette({ worn: 'trialborn', unlocked: ['ashen'] })).toEqual({
      worn: null,
      unlocked: ['ashen'],
    });
  });

  it('menolak memakai palet yang belum dimiliki dan bisa dilepas', () => {
    const state = { worn: null, unlocked: ['ashen'] };
    expect(wearPalette(state, 'champion')).toBeNull();
    expect(wearPalette(state, 'ghost')).toBeNull();

    const worn = wearPalette(state, 'ashen');
    expect(worn?.worn).toBe('ashen');
    expect(wearPalette(worn!, null)?.worn).toBeNull();
  });
});

describe('palette di sim', () => {
  it('meng-earn palet saat load kalau save lama sudah memenuhi milestone', () => {
    const sim = new BattleSim(
      makeSave({
        farmStage: 60,
        maxStage: 60,
        ascension: { count: 1, shards: 0, nodes: {} },
        trial: { key: weekKey(), cleared: 10, attempts: 2 },
        arena: {
          day: '2026-10-24',
          tickets: 3,
          points: 320,
          wins: 14,
          losses: 2,
          rivals: [],
          fought: [],
        },
        event: { key: '2026-10-23', bosses: 5, claimed: true },
      }),
      seeded(1),
    );

    expect([...sim.palette.unlocked].sort()).toEqual([
      'ashen',
      'champion',
      'emberfall',
      'stormtouched',
      'trialborn',
    ]);
    expect(sim.snapshot().palette.unlocked).toHaveLength(PALETTES.length);
  });

  it('tidak membuka palet sebelum milestone dan memakai palet tersimpan', () => {
    const sim = new BattleSim(
      makeSave({ palette: { worn: 'ashen', unlocked: ['ashen'] } }),
      seeded(2),
    );
    expect(sim.palette.worn).toBe('ashen');
    expect(sim.palette.unlocked).toEqual(['ashen']);

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    expect(sim.wearPalette('champion')).toBe(false);
    expect(events.some((event) => event.type === 'palette')).toBe(false);

    expect(sim.wearPalette(null)).toBe(true);
    expect(events.some((event) => event.type === 'palette')).toBe(true);
  });

  it('ascension membuka ashen dan tidak menghapus palet', () => {
    const sim = new BattleSim(
      makeSave({
        level: 30,
        maxStage: 50,
        farmStage: 60,
        stage: 60,
        palette: { worn: 'stormtouched', unlocked: ['stormtouched'] },
      }),
      seeded(3),
    );

    expect(sim.ascend().ok).toBe(true);
    expect(sim.palette.unlocked).toContain('ashen');
    expect(sim.palette.unlocked).toContain('stormtouched');
    expect(sim.palette.worn).toBe('stormtouched');
    expect(sim.saveData().palette).toEqual({
      worn: 'stormtouched',
      unlocked: expect.arrayContaining(['ashen', 'stormtouched']),
    });
  });
});
