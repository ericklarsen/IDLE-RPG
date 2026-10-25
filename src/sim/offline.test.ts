import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { INVENTORY_CAP } from '../data/items';
import { BattleSim } from './battle';
import { enemyKindForWave, partyDropMult, rewardFor } from './formulas';
import {
  offlineDps,
  packTimeFactor,
  planOffline,
  projectLevels,
  signatureDps,
  stageRates,
} from './offline';
import { setPartySlot } from './party';
import { normalizeSkills } from './skills';
import type { Item, SaveData } from './types';

function makeWeapon(overrides: Partial<Item> = {}): Item {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'epic',
    name: 'Test Blade',
    level: 20,
    atk: 2000,
    hp: 200,
    def: 20,
    power: 6000,
    salvage: 50,
    enhance: 0,
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
    version: 6,
    level: 1,
    exp: 0,
    gold: 0,
    maxStage: 1,
    kills: 0,
    inventory: [],
    equipped: {},
    itemSeq: 0,
    ...overrides,
  };
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('offline planning', () => {
  it('stage rates memasukkan reward boss, core, dan book', () => {
    const rates = stageRates(10);
    expect(rates.hp).toBeGreaterThan(0);
    expect(rates.gold).toBeGreaterThan(0);
    expect(rates.cores).toBeGreaterThan(0);
    expect(rates.books).toBeGreaterThan(0);
    expect(rates.dropRate).toBeGreaterThan(0.2);
  });

  it('membatasi waktu ke 8 jam dan memakai efisiensi 85%', () => {
    const rates = stageRates(1);
    const plan = planOffline({
      elapsedMs: 20 * 60 * 60 * 1000,
      stage: 1,
      level: 1,
      exp: 0,
      dps: 100,
      rates,
      goldPct: 0,
    });

    expect(plan).not.toBeNull();
    expect(plan?.seconds).toBe(8 * 60 * 60);
    expect(BALANCE.offlineEfficiency).toBe(0.85);
    expect(plan?.capped).toBe(true);
    expect(plan?.kills).toBeGreaterThan(0);
  });

  it('tidak menghitung waktu di bawah satu menit', () => {
    const plan = planOffline({
      elapsedMs: 30_000,
      stage: 1,
      level: 1,
      exp: 0,
      dps: 100,
      rates: stageRates(1),
      goldPct: 0,
    });
    expect(plan).toBeNull();
  });

  it('offlineDps menambahkan kontribusi wisp', () => {
    const input = {
      attackPower: 100,
      atkSpeed: 1,
      crit: 0,
      critDmg: 1.5,
      def: 0,
      skills: normalizeSkills(),
      attuned: null,
      elemBonus: 0,
      enemyElement: 'fire' as const,
    };
    const baseDps = offlineDps(input);

    expect(offlineDps({ ...input, petDps: 42 })).toBeCloseTo(baseDps + 42, 5);
  });

  it('projectLevels menghitung level dari EXP', () => {
    expect(projectLevels(1, 0, 0)).toBe(0);
    expect(projectLevels(1, 0, 25)).toBe(1);
    expect(projectLevels(1, 0, 1000)).toBeGreaterThan(1);
  });
});

describe('offline party', () => {
  /** Monsters per stage: normal waves widen to one per member, elites and
   *  bosses fight alone. */
  function monstersPerStage(party: number): number {
    const pack = Math.min(BALANCE.enemyPackCap, party);
    let count = 0;
    for (let wave = 1; wave <= BALANCE.wavePerStage; wave += 1) {
      count += enemyKindForWave(wave) === 'normal' ? pack : 1;
    }
    return count;
  }

  /** Total gold a cleared stage pays, the way the live run credits it. */
  function stageGold(party: number): number {
    const pack = Math.min(BALANCE.enemyPackCap, party);
    let gold = 0;
    for (let wave = 1; wave <= BALANCE.wavePerStage; wave += 1) {
      const kind = enemyKindForWave(wave);
      const monsters = kind === 'normal' ? pack : 1;
      gold += rewardFor(30, wave, kind).gold * Math.sqrt(monsters);
    }
    return gold;
  }

  it('satu stage tetap bernilai √count gold untuk party, bukan count kali', () => {
    const solo = stageRates(30, 1).gold * monstersPerStage(1);
    const party = stageRates(30, 5).gold * monstersPerStage(5);

    expect(solo).toBeCloseTo(stageGold(1), -1);
    expect(party).toBeCloseTo(stageGold(5), -1);
    // Five monsters pay √5 bars between them; the elite and boss do not widen,
    // so the stage is worth more than solo but never √5 of it.
    expect(party / solo).toBeGreaterThan(1.4);
    expect(party / solo).toBeLessThan(Math.sqrt(5) + 0.01);
  });

  it('tiap monster party lebih tipis dan lebih murah daripada solo', () => {
    const solo = stageRates(30, 1);
    const party = stageRates(30, 5);

    expect(party.hp).toBeLessThan(solo.hp * 0.6);
    expect(party.gold).toBeLessThan(solo.gold * 0.5);
    // Five characters chase five sets, so the drop rate per monster is split
    // by the pack but lifted by the roster before that.
    expect(party.dropRate / solo.dropRate).toBeCloseTo(partyDropMult(5) / 5, 1);
  });

  it('stageRates tanpa party identik dengan solo', () => {
    expect(stageRates(30)).toEqual(stageRates(30, 1));
  });

  it('pack splash dipotong ke porsi yang benar-benar terukur di lapangan', () => {
    // One monster costs one bar; the nominal 0,3 would claim 1,80× on a full
    // pack, the credited 0,18 lands on the 1,44× the field actually delivers.
    expect(packTimeFactor(1, 0.3)).toBe(1);
    expect(packTimeFactor(5, 0)).toBe(1);
    expect(1 / packTimeFactor(5, 0.3)).toBeCloseTo(1.8, 1);
    expect(1 / packTimeFactor(5, 0.18)).toBeCloseTo(1.43, 2);
    expect(1 / packTimeFactor(3, 0.18)).toBeCloseTo(1.2, 2);
  });

  it('signature damage ikut dihitung, heal dan shield tidak', () => {
    expect(signatureDps(1000, { kind: 'damage', multiplier: 1.7, cooldown: 6 } as never)).toBeCloseTo(
      1000 * 1.7 / 6,
      5,
    );
    expect(signatureDps(1000, { kind: 'heal', healPct: 0.16, cooldown: 12 } as never)).toBe(0);
    expect(signatureDps(1000, { kind: 'shield', shieldPct: 0.18, cooldown: 14 } as never)).toBe(0);
    expect(signatureDps(1000, null)).toBe(0);
  });

  it('laporan party menghitung seluruh roster, bukan satu karakter', () => {
    const solo = new BattleSim(makeSave({ level: 40, maxStage: 40, farmStage: 40 }), seeded(5));
    const party = new BattleSim(makeSave({ level: 40, maxStage: 40, farmStage: 40 }), seeded(5));
    for (const [slot, id] of (['ranger', 'cleric', 'mage'] as const).entries()) {
      const next = setPartySlot(party.party, slot + 1, id);
      expect(next, id).not.toBeNull();
      party.party = next!;
    }
    party.setActiveCharacter(0);
    party.refreshParty();
    expect(party.mates).toHaveLength(3);

    const window = 8 * 60 * 60 * 1000;
    const soloReport = solo.estimateOffline(window)!;
    const partyReport = party.estimateOffline(window)!;

    // Four characters bring far more damage than one, and the wave they face
    // is thinner per monster: a solo-shaped estimate gives none of that.
    expect(partyReport.kills).toBeGreaterThan(soloReport.kills * 5);
    expect(partyReport.kills).toBeLessThan(soloReport.kills * 40);
    expect(partyReport.gold / Math.max(1, partyReport.kills)).toBeLessThan(
      soloReport.gold / Math.max(1, soloReport.kills),
    );
    // The party is not simply handed four solo runs' worth of gold either.
    expect(partyReport.gold).toBeGreaterThan(soloReport.gold * 1.5);
    expect(partyReport.gold).toBeLessThan(soloReport.gold * 8);
  });
});

describe('BattleSim offline', () => {
  it('estimasi 8 jam menghasilkan report lengkap', () => {
    const sim = new BattleSim(makeSave({ maxStage: 5 }), seeded(2));
    const report = sim.estimateOffline(8 * 60 * 60 * 1000);

    expect(report).not.toBeNull();
    expect(report?.seconds).toBe(8 * 60 * 60);
    expect(report?.capped).toBe(true);
    expect(report?.kills).toBeGreaterThan(0);
    expect(report?.gold).toBeGreaterThan(0);
    expect(report?.exp).toBeGreaterThan(0);
    expect(report?.levels).toBeGreaterThan(0);
    expect(report?.items.length).toBeLessThanOrEqual(BALANCE.offlineItemCap);
  });

  it('applyOffline menambah gold, EXP, level, dan item', () => {
    const sim = new BattleSim(makeSave({ maxStage: 5, gold: 100 }), seeded(2));
    const report = sim.estimateOffline(4 * 60 * 60 * 1000);
    expect(report).not.toBeNull();

    const goldBefore = sim.gold;
    const levelBefore = sim.level;
    sim.applyOffline(report!);

    expect(sim.gold).toBeGreaterThan(goldBefore);
    expect(sim.level).toBeGreaterThan(levelBefore);
    expect(sim.inventory.length).toBe(report!.items.length);
  });

  it('tidak ada report untuk waktu singkat', () => {
    const sim = new BattleSim(makeSave(), seeded(2));
    expect(sim.estimateOffline(30_000)).toBeNull();
  });

  it('wisp ikut menaikkan hasil offline', () => {
    const save = makeSave({
      level: 40,
      maxStage: 30,
      farmStage: 30,
      pets: { active: 'ember', kinds: { ember: { level: 10, maxLevel: 10, eggs: 0 } } },
      equipped: { weapon: makeWeapon() },
    });
    const withWisp = new BattleSim(save, seeded(3));
    const withoutWisp = new BattleSim(save, seeded(3));
    withoutWisp.setActivePet(null);

    const boosted = withWisp.estimateOffline(4 * 60 * 60 * 1000);
    const plain = withoutWisp.estimateOffline(4 * 60 * 60 * 1000);

    expect(boosted!.kills).toBeGreaterThan(plain!.kills);
  });

  it('boost gold ikut menaikkan hasil offline', () => {
    const base = new BattleSim(makeSave({ maxStage: 5 }), seeded(4));
    const boosted = new BattleSim(
      makeSave({ maxStage: 5, boosts: { fortune: 10 } }),
      seeded(4),
    );

    const baseReport = base.estimateOffline(2 * 60 * 60 * 1000);
    const boostedReport = boosted.estimateOffline(2 * 60 * 60 * 1000);
    expect(boostedReport!.gold).toBeGreaterThan(baseReport!.gold);
  });

  it('inventory penuh tidak overflow saat klaim', () => {
    const sim = new BattleSim(makeSave({ maxStage: 5 }), seeded(2));
    sim.inventory = Array.from({ length: INVENTORY_CAP }, (_, index) => ({
      id: `it_full_${index}`,
      slot: 'ring',
      rarity: 'common',
      name: 'Filler',
      level: 1,
      atk: 1,
      hp: 1,
      def: 1,
      power: 5,
      salvage: 2,
      enhance: 0,
      pity: 0,
      refines: 0,
      enchants: 0,
      substats: [],
      runes: [null, null, null],
    }));

    const report = sim.estimateOffline(2 * 60 * 60 * 1000);
    const goldBefore = sim.gold;
    sim.applyOffline(report!);

    expect(sim.inventory).toHaveLength(INVENTORY_CAP);
    expect(sim.gold).toBeGreaterThan(goldBefore);
  });
});
