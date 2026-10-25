import { describe, expect, it } from 'vitest';
import { pickEnemy } from '../data/enemies';
import { BattleSim } from './battle';
import { forecastNextBoss } from './forecast';
import type { Item, SaveData } from './types';
import { enhanceCostFor } from './upgrade';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeWeapon(overrides: Partial<Item> = {}): Item {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'epic',
    name: 'Test Blade',
    level: 20,
    atk: 20_000,
    hp: 100,
    def: 10,
    power: 60_000,
    salvage: 50,
    enhance: 3,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
    ...overrides,
  };
}

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 11,
    level: 30,
    exp: 0,
    gold: 100_000,
    maxStage: 21,
    farmStage: 20,
    stage: 21,
    kills: 500,
    inventory: [],
    equipped: {},
    itemSeq: 10,
    ...overrides,
  };
}

function strongSim(overrides: Partial<SaveData> = {}): BattleSim {
  return new BattleSim(
    makeSave({
      equipped: {
        weapon: makeWeapon(),
        // Enough HP to survive the stage 21 boss long enough to kill it.
        helm: makeWeapon({ id: 'it_2', slot: 'helm', name: 'Test Helm', atk: 1000, hp: 500_000 }),
        armor: makeWeapon({ id: 'it_3', slot: 'armor', name: 'Test Plate', atk: 0, hp: 500_000 }),
      },
      ...overrides,
    }),
    seeded(1),
  );
}

describe('forecast', () => {
  it('trialBoss membunuh boss dengan build kuat tanpa menyentuh run asli', () => {
    const sim = strongSim();
    const gold = sim.gold;
    const atk = sim.hero.atk;
    const inventory = sim.inventory.length;
    const enhance = sim.equipped.weapon?.enhance;

    const trial = sim.trialBoss(21);

    expect(trial.killed).toBe(true);
    expect(trial.seconds).toBeGreaterThan(0);
    expect(trial.deaths).toBe(0);
    expect(sim.gold).toBe(gold);
    expect(sim.hero.atk).toBe(atk);
    expect(sim.inventory).toHaveLength(inventory);
    expect(sim.equipped.weapon?.enhance).toBe(enhance);
  });

  it('trialBoss gagal untuk build lemah dan melaporkan sisa HP', () => {
    const sim = new BattleSim(makeSave({ level: 1, maxStage: 1 }), seeded(1));
    const trial = sim.trialBoss(2);

    expect(trial.killed).toBe(false);
    expect(trial.seconds).toBeNull();
    expect(trial.deaths).toBeGreaterThan(0);
    expect(trial.remainingPct).toBeGreaterThan(0);
  });

  it('dua trial dengan build yang sama memberi hasil identik', () => {
    const sim = strongSim();
    expect(sim.trialBoss(21)).toEqual(sim.trialBoss(21));
  });

  it('report memakai boss stage berikutnya dan menyertakan baseline', () => {
    const sim = strongSim();
    const report = forecastNextBoss(sim);

    expect(report.stage).toBe(21);
    expect(report.bossName).toBe(pickEnemy(21, 10, 'boss').name);
    expect(report.bossHp).toBeGreaterThan(0);
    expect(report.baseline.killed).toBe(true);
    expect(report.options.length).toBeGreaterThan(0);
  });

  it('kandidat enhance memakai biaya nyata dan ditandai affordable', () => {
    const sim = strongSim();
    const report = forecastNextBoss(sim);
    const enhance = report.options.find((option) => option.id === 'enhance');

    expect(enhance).toBeDefined();
    expect(enhance?.cost).toBe(enhanceCostFor(sim.equipped.weapon!));
    expect(enhance?.affordable).toBe(true);
    expect(enhance?.chance).toBeGreaterThan(0);
  });

  it('kandidat tanpa perubahan tidak dimasukkan', () => {
    const sim = strongSim({ inventory: [] });
    const report = forecastNextBoss(sim);
    expect(report.options.some((option) => option.id === 'equip-best')).toBe(false);
  });

  it('opsi diurutkan: kill tercepat dulu, lalu sisa HP terkecil', () => {
    const sim = strongSim();
    const report = forecastNextBoss(sim);

    for (let index = 1; index < report.options.length; index += 1) {
      const previous = report.options[index - 1];
      const current = report.options[index];
      if (!previous.killed) expect(current.killed).toBe(false);
      if (previous.killed && current.killed) {
        expect(previous.seconds ?? Infinity).toBeLessThanOrEqual(current.seconds ?? Infinity);
      }
      if (!previous.killed && !current.killed) {
        expect(previous.remainingPct).toBeLessThanOrEqual(current.remainingPct);
      }
    }
  });

  it('simulasi tidak membelanjakan gold atau mengubah gear asli', () => {
    const sim = strongSim({ inventory: [makeWeapon({ id: 'it_2', atk: 30_000 })] });
    const before = {
      gold: sim.gold,
      books: sim.books,
      cores: sim.cores,
      inventory: sim.inventory.map((item) => item.id),
      equipped: sim.equipped.weapon?.id,
      atk: sim.hero.atk,
    };

    forecastNextBoss(sim);

    expect(sim.gold).toBe(before.gold);
    expect(sim.books).toBe(before.books);
    expect(sim.cores).toBe(before.cores);
    expect(sim.inventory.map((item) => item.id)).toEqual(before.inventory);
    expect(sim.equipped.weapon?.id).toBe(before.equipped);
    expect(sim.hero.atk).toBe(before.atk);
  });
});
