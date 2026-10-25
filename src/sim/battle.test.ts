import { describe, expect, it } from 'vitest';
import { BattleSim } from './battle';
import { dayKey } from './rift';
import { weekKey } from './week';
import { COSTUMES, COSTUME_COMPLETE_DUST, COSTUME_COMPLETE_ESSENCE, COSTUME_TIERS } from '../data/costumes';
import type { ArenaRival, Item, SaveData, SimEvent } from './types';
import { TIER_ORDER, substatTier } from './upgrade';

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
    rarity: 'rare',
    name: 'Test Blade',
    level: 5,
    atk: 10,
    hp: 20,
    def: 2,
    power: 50,
    salvage: 12,
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
    version: 3,
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

function runFor(sim: BattleSim, seconds: number, onTick?: () => void): void {
  const step = 0.05;
  const ticks = Math.round(seconds / step);
  for (let i = 0; i < ticks; i += 1) {
    sim.tick(step);
    onTick?.();
  }
}

/** Runs until the condition flips, so tests stop before the next fight starts. */
function runUntil(sim: BattleSim, done: () => boolean, seconds = 30): void {
  const step = 0.05;
  const ticks = Math.round(seconds / step);
  for (let i = 0; i < ticks && !done(); i += 1) sim.tick(step);
}

describe('BattleSim', () => {
  it('membunuh musuh pertama dan mendapat gold dalam 15 detik', () => {
    const sim = new BattleSim(null, seeded(1));
    runFor(sim, 15);
    expect(sim.kills).toBeGreaterThan(0);
    expect(sim.gold).toBeGreaterThan(0);
  });

  it('naik stage dalam 10 menit dengan enhance otomatis', () => {
    const sim = new BattleSim(
      makeSave({ equipped: { weapon: makeWeapon() }, gold: 100 }),
      seeded(42),
    );
    runFor(sim, 600, () => {
      const weapon = sim.weapon;
      if (!weapon) return;
      const cost = sim.snapshot().enhanceCost;
      if (sim.gold >= cost) sim.enhanceItem(weapon.id, 1);
    });
    expect(sim.maxStage).toBeGreaterThanOrEqual(2);
    expect(sim.kills).toBeGreaterThan(20);
    expect(sim.equipped.weapon?.enhance ?? 0).toBeGreaterThan(0);
  });

  it('enhance gagal kalau gold kurang', () => {
    const sim = new BattleSim(makeSave({ equipped: { weapon: makeWeapon() } }), seeded(7));
    const outcome = sim.enhanceItem('it_1', 1);
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('gold');
    expect(sim.equipped.weapon?.enhance).toBe(0);
  });

  it('enhance memotong gold dan menaikkan ATK item', () => {
    const sim = new BattleSim(
      makeSave({ equipped: { weapon: makeWeapon() }, gold: 1000 }),
      () => 0,
    );
    const before = sim.hero.atk;
    const outcome = sim.enhanceItem('it_1', 1);

    expect(outcome.ok).toBe(true);
    expect(outcome.successes).toBe(1);
    expect(sim.hero.atk).toBeGreaterThan(before);
    expect(sim.gold).toBeLessThan(1000);
    expect(sim.equipped.weapon?.enhance).toBe(1);
  });

  it('kegagalan enhance menaikkan pity dan peluang berikutnya', () => {
    const sim = new BattleSim(
      makeSave({ equipped: { weapon: makeWeapon({ enhance: 10 }) }, gold: 1_000_000 }),
      () => 0.999,
    );
    const before = sim.snapshot().enhanceChance;
    const outcome = sim.enhanceItem('it_1', 1);

    expect(outcome.successes).toBe(0);
    expect(sim.equipped.weapon?.pity).toBe(1);
    expect(sim.snapshot().enhanceChance).toBeGreaterThan(before);
  });

  it('enhance berhenti di level maksimal', () => {
    const sim = new BattleSim(
      makeSave({
        equipped: { weapon: makeWeapon({ enhance: 15 }) },
        gold: 1_000_000,
      }),
      () => 0,
    );
    const outcome = sim.enhanceItem('it_1', 5);
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('max');
    expect(sim.gold).toBe(1_000_000);
  });

  it('menyimpan dan memulihkan progres item', () => {
    const sim = new BattleSim(
      makeSave({ equipped: { weapon: makeWeapon() }, gold: 500 }),
      () => 0,
    );
    sim.enhanceItem('it_1', 2);
    sim.refineItem('it_1');
    sim.level = 4;
    const saved = sim.saveData();
    const restored = new BattleSim(saved);

    expect(restored.level).toBe(4);
    expect(restored.equipped.weapon?.enhance).toBe(2);
    expect(restored.equipped.weapon?.substats.length).toBeGreaterThan(0);
    expect(restored.gold).toBe(sim.gold);
    expect(restored.equipped.weapon?.substats).toEqual(sim.equipped.weapon?.substats);
  });

  it('mundur ke farm stage setelah dua kematian saat push', () => {
    const sim = new BattleSim(makeSave({ maxStage: 10, farmStage: 9 }), seeded(3));
    expect(sim.stage).toBe(10);
    expect(sim.pushing).toBe(true);

    runFor(sim, 120);

    expect(sim.stage).toBe(9);
    expect(sim.farmStage).toBe(9);
    expect(sim.pushing).toBe(false);
    expect(sim.canPush).toBe(true);
    expect(sim.deathsHere).toBe(0);
  });

  it('push mengembalikan knight ke stage setelah mundur', () => {
    const sim = new BattleSim(makeSave({ maxStage: 10, farmStage: 9 }), seeded(3));
    runFor(sim, 120);
    runFor(sim, 4);

    const result = sim.push();
    expect(result.ok).toBe(true);
    expect(result.stage).toBe(10);
    expect(sim.stage).toBe(10);
    expect(sim.pushing).toBe(true);
    expect(sim.deathsHere).toBe(0);
  });

  it('push tidak tersedia sebelum stage pertama di-clear', () => {
    const sim = new BattleSim(null, seeded(1));
    const result = sim.push();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('locked');
  });

  it('offline memakai farm stage, bukan stage yang sedang di-push', () => {
    const pushing = new BattleSim(makeSave({ maxStage: 10, farmStage: 8 }), seeded(1));
    const farming = new BattleSim(makeSave({ maxStage: 8, farmStage: 8 }), seeded(1));

    const a = pushing.estimateOffline(8 * 60 * 60 * 1000);
    const b = farming.estimateOffline(8 * 60 * 60 * 1000);
    expect(a?.kills).toBe(b?.kills);
    expect(a?.gold).toBe(b?.gold);
  });

  it('menyimpan farm stage dan melanjutkan mode farming setelah reload', () => {
    const sim = new BattleSim(makeSave({ maxStage: 6, farmStage: 5, stage: 5 }), seeded(1));
    const restored = new BattleSim(sim.saveData(), seeded(1));
    expect(restored.stage).toBe(5);
    expect(restored.farmStage).toBe(5);
    expect(restored.maxStage).toBe(6);
    expect(restored.canPush).toBe(true);
  });

  it('melanjutkan push yang belum selesai setelah reload', () => {
    const sim = new BattleSim(makeSave({ maxStage: 6, farmStage: 5, stage: 6 }), seeded(1));
    const restored = new BattleSim(sim.saveData(), seeded(1));
    expect(restored.stage).toBe(6);
    expect(restored.pushing).toBe(true);
    expect(restored.canPush).toBe(false);
  });

  it('auto-enhance menaikkan semua slot yang dipakai ke +5', () => {
    const sim = new BattleSim(
      makeSave({
        gold: 100_000,
        equipped: {
          weapon: makeWeapon(),
          helm: makeWeapon({ id: 'it_2', slot: 'helm' }),
        },
      }),
      seeded(1),
    );

    const result = sim.enhanceAllTo(5);
    expect(result.items).toBe(2);
    expect(result.levels).toBe(10);
    expect(sim.equipped.weapon?.enhance).toBe(5);
    expect(sim.equipped.helm?.enhance).toBe(5);
    expect(sim.gold).toBeLessThan(100_000);
  });

  it('auto-enhance berhenti saat gold habis', () => {
    const sim = new BattleSim(
      makeSave({ gold: 40, equipped: { weapon: makeWeapon() } }),
      seeded(1),
    );

    const result = sim.enhanceAllTo(5);
    expect(result.reason).toBe('gold');
    expect(result.levels).toBeLessThan(5);
    expect(sim.equipped.weapon?.enhance).toBe(result.levels);
  });

  it('auto-refine berhenti setelah substat mencapai tier A', () => {
    const item = makeWeapon({
      rarity: 'common',
      substats: [{ key: 'atkPct', value: 0.021, locked: false }],
    });
    const sim = new BattleSim(
      makeSave({
        gold: 10_000,
        equipped: { weapon: item },
        refine: { weapon: { level: 10, progress: 0, pity: 0 } },
      }),
      () => 0.95,
    );

    const outcome = sim.refineToTier('it_1', 'A');
    expect(outcome.ok).toBe(true);
    expect(outcome.reached).toBe(true);
    expect(outcome.rolls).toBe(1);

    const weapon = sim.equipped.weapon!;
    expect(TIER_ORDER[substatTier(weapon.substats[0], weapon)]).toBeGreaterThanOrEqual(
      TIER_ORDER.A,
    );
  });

  it('auto-refine tidak menyentuh substat yang terkunci', () => {
    const item = makeWeapon({
      substats: [{ key: 'atkPct', value: 0.03, locked: true }],
    });
    const sim = new BattleSim(
      makeSave({ gold: 10_000, equipped: { weapon: item } }),
      seeded(1),
    );

    const outcome = sim.refineToTier('it_1', 'A');
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('locked');
    expect(sim.gold).toBe(10_000);
  });

  it('auto-refine berhenti saat gold tidak cukup', () => {
    const item = makeWeapon({
      rarity: 'common',
      substats: [{ key: 'atkPct', value: 0.021, locked: false }],
    });
    const sim = new BattleSim(
      makeSave({
        gold: 0,
        equipped: { weapon: item },
        refine: { weapon: { level: 10, progress: 0, pity: 0 } },
      }),
      seeded(1),
    );

    const outcome = sim.refineToTier('it_1', 'A');
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('gold');
    expect(sim.equipped.weapon?.refines).toBe(0);
  });

  it('rift terkunci sebelum stage 10 di-clear', () => {
    const sim = new BattleSim(makeSave({ farmStage: 9, maxStage: 12 }), seeded(1));
    const result = sim.startRift('2026-10-23', []);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('locked');
    expect(sim.riftActive).toBe(false);
  });

  it('rift berjalan 60 detik, lalu stage utama dipulihkan dan chest masuk', () => {
    const sim = new BattleSim(
      makeSave({
        farmStage: 12,
        maxStage: 13,
        stage: 13,
        level: 20,
        equipped: { weapon: makeWeapon({ atk: 4000 }) },
      }),
      seeded(1),
    );
    const goldBefore = sim.gold;

    expect(sim.startRift('2026-10-23', []).ok).toBe(true);
    expect(sim.riftActive).toBe(true);
    expect(sim.stage).toBe(12);

    runFor(sim, 59);
    expect(sim.riftActive).toBe(true);

    runFor(sim, 2);
    expect(sim.riftActive).toBe(false);
    expect(sim.stage).toBe(13);
    expect(sim.rift?.day).toBe('2026-10-23');
    expect(sim.rift?.kills ?? 0).toBeGreaterThan(0);
    expect(sim.gold).toBeGreaterThan(goldBefore);
  });

  it('modifier rift menaikkan HP musuh', () => {
    const save = makeSave({ farmStage: 12, maxStage: 12 });
    const plain = new BattleSim(save, seeded(1));
    const buffed = new BattleSim(save, seeded(1));

    plain.startRift('2026-10-23', []);
    buffed.startRift('2026-10-23', [
      { id: 'bulwark', label: 'Bulwark', desc: 'Enemy HP +30%', enemyHp: 1.3 },
    ]);

    expect(buffed.enemy.maxHp).toBeGreaterThan(plain.enemy.maxHp);
  });

  it('rift yang sudah selesai tidak bisa dibuka lagi di hari yang sama', () => {
    const sim = new BattleSim(
      makeSave({ farmStage: 12, maxStage: 12, level: 20 }),
      seeded(1),
    );
    sim.startRift('2026-10-23', []);
    runFor(sim, 61);

    const again = sim.startRift('2026-10-23', []);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('done');
  });

  it('cancelRift memulihkan stage push tanpa chest harian', () => {
    const sim = new BattleSim(
      makeSave({ farmStage: 12, maxStage: 13, stage: 13 }),
      seeded(1),
    );
    sim.startRift('2026-10-23', []);
    runFor(sim, 5);
    sim.cancelRift();

    expect(sim.riftActive).toBe(false);
    expect(sim.stage).toBe(13);
    expect(sim.rift).toBeNull();
  });

  it('mengirim event kill dan hit ke listener', () => {
    const sim = new BattleSim(null, seeded(11));
    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    runFor(sim, 15);
    expect(events.some((event) => event.type === 'hit')).toBe(true);
    expect(events.some((event) => event.type === 'kill')).toBe(true);
  });
});

describe('arena duel', () => {
  const day = dayKey();

  const rival = (overrides: Partial<ArenaRival> = {}): ArenaRival => ({
    id: `${day}-0`,
    name: 'Test Rival',
    element: 'fire',
    hp: 1,
    atk: 1,
    def: 0,
    atkSpeed: 0.5,
    power: 100,
    label: 'EVEN',
    build: 'Ashforged · Heavy Strike',
    ...overrides,
  });

  const trio = (): ArenaRival[] => [
    rival(),
    rival({ id: `${day}-1`, name: 'Rival Two' }),
    rival({ id: `${day}-2`, name: 'Rival Three' }),
  ];

  const duelSim = (rivals: ArenaRival[], seed = 5): BattleSim =>
    new BattleSim(
      makeSave({
        farmStage: 40,
        maxStage: 40,
        stage: 40,
        level: 40,
        arena: { day, tickets: 3, points: 0, wins: 0, losses: 0, rivals, fought: [] },
      }),
      seeded(seed),
    );

  it('terkunci sebelum stage 30 dan tidak menyiapkan lawan', () => {
    const sim = new BattleSim(makeSave({ farmStage: 10, maxStage: 10 }), seeded(1));
    expect(sim.arenaView().unlocked).toBe(false);
    expect(sim.arenaView().rivals).toHaveLength(0);
    expect(sim.startDuel('anything')).toMatchObject({ ok: false, reason: 'locked' });
  });

  it('menolak duel saat knight masih tumbang', () => {
    const sim = duelSim(trio());
    runUntil(sim, () => sim.snapshot().dead, 20);
    expect(sim.snapshot().dead).toBe(true);
    expect(sim.startDuel(sim.arenaView().rivals[0].id)).toMatchObject({
      ok: false,
      reason: 'down',
    });
  });

  it('membuka duel, memakai satu tiket, dan menampilkan rival sebagai musuh', () => {
    const sim = duelSim(trio());
    const view = sim.arenaView();
    expect(view.unlocked).toBe(true);
    expect(view.rivals).toHaveLength(3);

    expect(sim.startDuel(view.rivals[0].id)).toEqual({ ok: true });
    expect(sim.duelActive).toBe(true);
    expect(sim.arenaView().tickets).toBe(2);
    expect(sim.enemy.rival).toBe(true);
    expect(sim.enemy.sprite).toBe('rival');
    expect(sim.snapshot().enemyName).toBe('Test Rival');
    expect(sim.startDuel(view.rivals[1].id)).toMatchObject({ ok: false, reason: 'active' });
  });

  it('menang menaikkan poin, membayar hadiah, dan memulihkan run', () => {
    const sim = duelSim(trio());
    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    sim.startDuel(sim.arenaView().rivals[0].id);
    const goldBefore = sim.gold;

    runUntil(sim, () => !sim.duelActive, 10);

    const end = events.find((event) => event.type === 'duelend');
    expect(end?.type).toBe('duelend');
    if (end?.type !== 'duelend') return;
    expect(end.result).toMatchObject({ win: true, points: 24, pointsAfter: 24, tickets: 2 });
    expect(sim.gold).toBeGreaterThan(goldBefore);
    expect(sim.duelActive).toBe(false);
    expect(sim.stage).toBe(40);
    expect(sim.maxStage).toBe(40);
    expect(sim.hero.hp).toBe(sim.hero.maxHp);
    expect(sim.arenaView()).toMatchObject({ points: 24, wins: 1, losses: 0, tickets: 2 });
    expect(sim.arenaView().rivals[0].fought).toBe(true);
    expect(sim.startDuel(sim.arenaView().rivals[0].id)).toMatchObject({
      ok: false,
      reason: 'fought',
    });
  });

  it('kalah tidak memberi poin, tidak mematikan run, dan mengembalikan HP penuh', () => {
    const sim = duelSim(
      [
        rival({ hp: 1_000_000_000, atk: 1_000_000, atkSpeed: 5 }),
        ...trio().slice(1),
      ],
      7,
    );
    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    sim.startDuel(sim.arenaView().rivals[0].id);

    runUntil(sim, () => !sim.duelActive, 5);

    const end = events.find((event) => event.type === 'duelend');
    expect(end?.type).toBe('duelend');
    if (end?.type !== 'duelend') return;
    expect(end.result.win).toBe(false);
    expect(end.result.points).toBe(-8);
    expect(sim.arenaView()).toMatchObject({ points: 0, wins: 0, losses: 1 });
    expect(sim.snapshot().dead).toBe(false);
    expect(sim.hero.hp).toBe(sim.hero.maxHp);
    expect(sim.stage).toBe(40);
  });

  it('rival melancarkan serangan elemen berkala', () => {
    const sim = duelSim(
      [rival({ hp: 1_000_000_000, atk: 1, atkSpeed: 0.2 }), ...trio().slice(1)],
      9,
    );
    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    sim.startDuel(sim.arenaView().rivals[0].id);

    runUntil(sim, () => events.some((event) => event.type === 'rivalSkill'), 10);
    const strike = events.find((event) => event.type === 'rivalSkill');
    expect(strike?.type).toBe('rivalSkill');
    if (strike?.type !== 'rivalSkill') return;
    expect(strike.element).toBe('fire');
    expect(strike.damage).toBeGreaterThan(0);
  });

  it('cancelDuel memulihkan run tanpa mengubah ladder', () => {
    const sim = duelSim(trio());
    sim.startDuel(sim.arenaView().rivals[0].id);
    expect(sim.cancelDuel()).toBe(true);
    expect(sim.duelActive).toBe(false);
    expect(sim.stage).toBe(40);
    expect(sim.arenaView()).toMatchObject({ points: 0, tickets: 2 });
  });

  it('menyimpan arena dan memulihkannya setelah reload', () => {
    const sim = duelSim(trio());
    sim.startDuel(sim.arenaView().rivals[0].id);
    runUntil(sim, () => !sim.duelActive, 10);

    const save = sim.saveData();
    expect(save.version).toBe(23);
    expect(save.arena?.points).toBe(24);
    expect(save.arena?.tickets).toBe(2);
    expect(save.league?.points).toBe(24);

    const restored = new BattleSim(save, seeded(3));
    expect(restored.arenaView()).toMatchObject({ points: 24, tickets: 2, wins: 1 });
    expect(restored.arenaView().rivals[0].fought).toBe(true);
  });

  it('poin musim bergerak bersama ladder dan tidak turun di bawah nol', () => {
    const sim = duelSim(
      [rival({ hp: 1_000_000_000, atk: 1_000_000, atkSpeed: 5 }), ...trio().slice(1)],
      11,
    );
    sim.startDuel(sim.arenaView().rivals[0].id);
    runUntil(sim, () => !sim.duelActive, 5);

    const view = sim.arenaView();
    expect(view.league.points).toBe(0);
    expect(view.league.division).toBe(0);
    expect(view.league.nextName).toBe('Silver');
  });

  it('menyelesaikan musim saat dibuka di minggu baru', () => {
    const sim = new BattleSim(
      makeSave({
        farmStage: 40,
        maxStage: 40,
        league: {
          key: '2000-01-03',
          points: 340,
          division: 1,
          rewardDivision: null,
          rewardClaimed: true,
        },
      }),
      seeded(6),
    );

    const view = sim.arenaView();
    expect(view.league.points).toBe(0);
    expect(view.league.division).toBe(2);
    expect(view.league.divisionName).toBe('Gold');
    expect(view.league.reward).toMatchObject({ name: 'Gold', claimed: false, setPiece: true });
  });

  it('klaim crate musim sekali saja dan memberi set piece di Gold', () => {
    const sim = new BattleSim(
      makeSave({
        farmStage: 40,
        maxStage: 40,
        league: {
          key: '2000-01-03',
          points: 400,
          division: 1,
          rewardDivision: null,
          rewardClaimed: true,
        },
      }),
      seeded(7),
    );
    const goldBefore = sim.gold;
    const essenceBefore = sim.essence;

    const claimed = sim.claimLeague();
    expect(claimed.ok).toBe(true);
    expect(claimed.item?.slot).toBeDefined();
    expect(claimed.reward?.setPiece).toBe(true);
    expect(sim.gold).toBeGreaterThan(goldBefore);
    expect(sim.essence).toBeGreaterThan(essenceBefore);
    expect(sim.arenaView().league.reward?.claimed).toBe(true);
    expect(sim.claimLeague()).toMatchObject({ ok: false, reason: 'claimed' });
  });

  it('menolak klaim crate saat belum ada musim yang selesai', () => {
    const sim = duelSim(trio());
    expect(sim.claimLeague()).toMatchObject({ ok: false, reason: 'none' });
  });

  it('menggulir papan rival dan tiket saat hari berganti', () => {
    const old = trio().map((entry) => ({ ...entry, id: `2000-01-01-${entry.id.slice(-1)}` }));
    const sim = new BattleSim(
      makeSave({
        farmStage: 40,
        maxStage: 40,
        arena: {
          day: '2000-01-01',
          tickets: 0,
          points: 88,
          wins: 5,
          losses: 2,
          rivals: old,
          fought: [old[0].id],
        },
      }),
      seeded(4),
    );

    const view = sim.arenaView();
    expect(view.day).toBe(day);
    expect(view.tickets).toBe(3);
    expect(view.points).toBe(88);
    expect(view.wins).toBe(5);
    expect(view.rivals[0].id).toContain(day);
    expect(view.rivals[0].fought).toBe(false);
  });
});

describe('trial tower', () => {
  const week = weekKey();

  const trialSim = (overrides: Partial<SaveData> = {}, seed = 5): BattleSim =>
    new BattleSim(
      makeSave({
        farmStage: 36,
        maxStage: 36,
        stage: 36,
        level: 40,
        trial: { key: week, cleared: 0, attempts: 3 },
        ...overrides,
      }),
      seeded(seed),
    );

  const killer = { equipped: { weapon: makeWeapon({ atk: 20_000_000, hp: 1_000_000 }) } };

  it('terkunci sebelum stage 35', () => {
    const sim = new BattleSim(makeSave({ farmStage: 34, maxStage: 34 }), seeded(1));
    expect(sim.trialView().unlocked).toBe(false);
    expect(sim.startTrial()).toMatchObject({ ok: false, reason: 'locked' });
  });

  it('membuka lantai berikutnya sebagai boss tanpa memakai retry', () => {
    const sim = trialSim();
    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));

    const view = sim.trialView();
    expect(view.next?.floor).toBe(1);
    expect(sim.startTrial()).toEqual({ ok: true });
    expect(sim.trialActive).toBe(true);
    expect(sim.enemy.kind).toBe('boss');
    expect(sim.enemy.name).toBe(view.next?.name);
    expect(sim.enemy.maxHp).toBe(view.next?.hp);
    expect(sim.stage).toBe(36);
    expect(sim.trialView().attempts).toBe(3);
    expect(events.some((event) => event.type === 'trialstart')).toBe(true);
  });

  it('menang membayar material, membuka lantai, dan tidak menyentuh farm stage', () => {
    const sim = trialSim(killer);
    const dustBefore = sim.dust;
    const essenceBefore = sim.essence;
    sim.startTrial();

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    runUntil(sim, () => !sim.trialActive, 20);

    const end = events.find((event) => event.type === 'trialend');
    expect(end?.type).toBe('trialend');
    if (end?.type !== 'trialend') return;

    expect(end.result).toMatchObject({ win: true, floor: 1, cleared: 1, attempts: 3, gold: 0 });
    expect(end.result.dust).toBeGreaterThan(0);
    expect(sim.dust).toBe(dustBefore + end.result.dust);
    expect(sim.essence).toBe(essenceBefore + end.result.essence);
    expect(sim.trialView()).toMatchObject({ cleared: 1, floor: 2, attempts: 3 });
    expect(sim.farmStage).toBe(36);
    expect(sim.maxStage).toBe(36);
    expect(sim.stage).toBe(36);
    expect(sim.hero.hp).toBe(sim.hero.maxHp);
  });

  it('kalah memakai satu retry tanpa hadiah dan tanpa mengubah lantai', () => {
    const sim = trialSim({ level: 1, equipped: {} }, 9);
    const goldBefore = sim.gold;
    sim.startTrial();

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    runUntil(sim, () => !sim.trialActive, 30);

    const end = events.find((event) => event.type === 'trialend');
    expect(end?.type).toBe('trialend');
    if (end?.type !== 'trialend') return;

    expect(end.result).toMatchObject({ win: false, floor: 1, cleared: 0, attempts: 2 });
    expect(end.result.dust).toBe(0);
    expect(sim.gold).toBe(goldBefore);
    expect(sim.trialView()).toMatchObject({ cleared: 0, attempts: 2 });
    expect(sim.stage).toBe(36);
    expect(sim.snapshot().dead).toBe(false);
    expect(sim.hero.hp).toBe(sim.hero.maxHp);
  });

  it('membatalkan lantai tidak memakai retry', () => {
    const sim = trialSim();
    sim.startTrial();
    expect(sim.cancelTrial()).toBe(true);
    expect(sim.trialActive).toBe(false);
    expect(sim.trialView()).toMatchObject({ cleared: 0, attempts: 3, floor: 1 });
    expect(sim.stage).toBe(36);
    expect(sim.cancelTrial()).toBe(false);
  });

  it('menolak masuk saat retry habis atau semua lantai clear', () => {
    const empty = trialSim({ trial: { key: week, cleared: 4, attempts: 0 } });
    expect(empty.startTrial()).toMatchObject({ ok: false, reason: 'attempts' });

    const done = trialSim({ trial: { key: week, cleared: 10, attempts: 3 } });
    expect(done.startTrial()).toMatchObject({ ok: false, reason: 'done' });
    expect(done.trialView().next).toBeNull();
  });

  it('lantai 10 memberi cache, item Epic, dan menutup tower', () => {
    const sim = trialSim({ ...killer, trial: { key: week, cleared: 9, attempts: 3 } }, 11);
    const goldBefore = sim.gold;
    const inventoryBefore = sim.inventory.length;
    sim.startTrial();

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    runUntil(sim, () => !sim.trialActive, 25);

    const end = events.find((event) => event.type === 'trialend');
    expect(end?.type).toBe('trialend');
    if (end?.type !== 'trialend') return;

    expect(end.result).toMatchObject({ win: true, floor: 10, cache: true });
    expect(end.result.item?.rarity).toBe('epic');
    expect(sim.inventory.length).toBe(inventoryBefore + 1);
    expect(sim.gold).toBeGreaterThan(goldBefore);
    expect(sim.trialView().done).toBe(true);
  });

  it('minggu baru mengembalikan lantai dan retry', () => {
    const sim = trialSim({
      trial: { key: '2000-01-03', cleared: 4, attempts: 1 },
    });
    expect(sim.trialView()).toMatchObject({ cleared: 0, attempts: 3, floor: 1, done: false });
  });

  it('menyimpan lantai dan retry ke save v22', () => {
    const sim = trialSim(killer);
    sim.startTrial();
    runUntil(sim, () => !sim.trialActive, 20);

    const save = sim.saveData();
    expect(save.version).toBe(23);
    expect(save.trial).toMatchObject({ cleared: 1, attempts: 3 });

    const restored = new BattleSim(save, seeded(3));
    expect(restored.trialView()).toMatchObject({ cleared: 1, floor: 2, attempts: 3 });
  });
});

describe('costume wardrobe', () => {
  const dressed = (overrides: Partial<SaveData> = {}) =>
    makeSave({
      level: 40,
      costume: { owned: ['ash-ronin'], equipped: 'ash-ronin' },
      ...overrides,
    });

  const killer = { equipped: { weapon: makeWeapon({ atk: 20_000_000, hp: 1_000_000 }) } };

  it('menambah ATK dan HP sesuai tier yang dipakai', () => {
    const plain = new BattleSim(makeSave({ level: 40 }), seeded(9));
    const robe = new BattleSim(dressed(), seeded(9));

    expect(robe.snapshot().atk).toBeGreaterThan(plain.snapshot().atk);
    expect(robe.snapshot().heroMaxHp).toBeGreaterThan(plain.snapshot().heroMaxHp);
    expect(robe.snapshot().costume.equipped).toBe('ash-ronin');
    expect(plain.snapshot().costume).toEqual({
      owned: [],
      equipped: null,
      pity: 0,
      mastered: false,
    });
  });

  it('melepas outfit mengembalikan stat ke semula', () => {
    const sim = new BattleSim(dressed(), seeded(9));
    const boosted = sim.snapshot().atk;

    expect(sim.equipCostume('void-regent')).toBe(false);
    expect(sim.equipCostume(null)).toBe(true);
    expect(sim.snapshot().atk).toBeLessThan(boosted);
    expect(sim.snapshot().costume.equipped).toBeNull();
  });

  it('menembakkan skill outfit di samping loadout normal', () => {
    const events: SimEvent[] = [];
    const sim = new BattleSim(dressed(killer), seeded(12));
    sim.on((event) => events.push(event));

    runFor(sim, 20);
    const casts = events.filter(
      (event) => event.type === 'skill' && event.name === 'Ronin Cut',
    );
    expect(casts.length).toBeGreaterThan(0);
  });

  it('boss menjatuhkan costume, duplikat berikutnya jadi dust', () => {
    const events: SimEvent[] = [];
    const sim = new BattleSim(
      makeSave({
        farmStage: 20,
        maxStage: 20,
        stage: 20,
        level: 40,
        equipped: { weapon: makeWeapon({ atk: 2_000_000, hp: 500_000 }) },
      }),
      seeded(3),
      () => 0,
    );
    sim.on((event) => events.push(event));

    runUntil(sim, () => sim.costume.owned.length > 0, 60);
    expect(sim.costume.owned).toHaveLength(1);
    expect(sim.costume.equipped).toBe('ash-ronin');
    expect(events.some((event) => event.type === 'costume' && !event.duplicate)).toBe(true);

    runUntil(sim, () => sim.dust > 0, 90);
    expect(sim.dust).toBeGreaterThan(0);
    expect(sim.costume.owned).toHaveLength(1);
    expect(events.some((event) => event.type === 'costume' && event.duplicate)).toBe(true);
  });

  it('menyimpan dan memulihkan outfit pada save v22', () => {
    const sim = new BattleSim(dressed(), seeded(9));
    const data = sim.saveData();

    expect(data.version).toBe(23);
    expect(data.costume).toEqual({
      owned: ['ash-ronin'],
      equipped: 'ash-ronin',
      pity: 0,
      mastered: false,
    });

    const restored = new BattleSim({ ...data, version: 17 }, seeded(9));
    expect(restored.snapshot().costume.equipped).toBe('ash-ronin');
  });
});

describe('costume tower cache', () => {
  it('lantai 5 memberi costume dari cache lantai', () => {
    const sim = new BattleSim(
      makeSave({
        farmStage: 36,
        maxStage: 36,
        stage: 36,
        level: 40,
        equipped: { weapon: makeWeapon({ atk: 20_000_000, hp: 1_000_000 }) },
        trial: { key: weekKey(), cleared: 4, attempts: 3 },
      }),
      seeded(8),
      () => 0,
    );

    const events: SimEvent[] = [];
    sim.on((event) => events.push(event));
    expect(sim.startTrial()).toEqual({ ok: true });
    runUntil(sim, () => !sim.trialActive, 30);

    const end = events.find((event) => event.type === 'trialend');
    expect(end?.type).toBe('trialend');
    if (end?.type !== 'trialend') return;

    expect(end.result).toMatchObject({ win: true, floor: 5, costume: 'ash-ronin' });
    expect(end.result.costumeDust).toBe(0);
    expect(sim.costume.owned).toContain('ash-ronin');
  });

  it('lantai 10 tetap memberi costume dengan cap emerald', () => {
    const sim = new BattleSim(
      makeSave({
        farmStage: 120,
        maxStage: 120,
        stage: 120,
        level: 60,
        equipped: { weapon: makeWeapon({ atk: 900_000_000, hp: 5_000_000 }) },
        trial: { key: weekKey(), cleared: 9, attempts: 3 },
      }),
      seeded(8),
      () => 0,
    );

    sim.startTrial();
    runUntil(sim, () => !sim.trialActive, 30);
    expect(sim.costume.owned).toEqual(['ash-ronin']);
  });
});

describe('costume pity, forging, and codex', () => {
  const strong = { equipped: { weapon: makeWeapon({ atk: 4_000_000, hp: 800_000 }) } };

  it('menjamin drop setelah pity penuh walau peluang gagal terus', () => {
    const events: SimEvent[] = [];
    const sim = new BattleSim(
      makeSave({ farmStage: 20, maxStage: 20, stage: 20, level: 40, ...strong }),
      seeded(6),
      () => 0.999,
    );
    sim.on((event) => events.push(event));

    runUntil(sim, () => sim.costume.owned.length > 0, 200);
    expect(sim.costume.owned).toHaveLength(1);
    expect(events.some((event) => event.type === 'costume')).toBe(true);
    expect(sim.costume.pity).toBe(0);
  });

  it('forge memotong dust dan essence lalu mencatat codex', () => {
    const sim = new BattleSim(makeSave({ dust: 2000, essence: 100 }), seeded(2));

    expect(sim.forgeCostume('void-regent')).toEqual({ ok: true });
    expect(sim.dust).toBe(200);
    expect(sim.essence).toBe(40);
    expect(sim.costume.owned).toEqual(['void-regent']);
    expect(sim.costume.equipped).toBe('void-regent');
    expect(sim.codex.costumes).toEqual(['void-regent']);

    expect(sim.forgeCostume('void-regent')).toMatchObject({ ok: false, reason: 'owned' });
    expect(sim.forgeCostume('frostveil-shroud')).toMatchObject({ ok: false, reason: 'dust' });
    expect(sim.forgeCostume('bogus')).toMatchObject({ ok: false, reason: 'missing' });
  });

  it('koleksi lengkap membayar bonus sekali saja', () => {
    const owned = COSTUMES.slice(0, 5).map((costume) => costume.id);
    const sim = new BattleSim(
      makeSave({
        dust: 5000,
        essence: 300,
        costume: { owned, equipped: owned[0], pity: 0, mastered: false },
      }),
      seeded(2),
    );

    expect(sim.forgeCostume(COSTUMES[5].id)).toEqual({ ok: true });
    expect(sim.costume.mastered).toBe(true);
    expect(sim.dust).toBe(5000 - COSTUME_TIERS[COSTUMES[5].tier].forge.dust + COSTUME_COMPLETE_DUST);
    expect(sim.essence).toBe(
      300 - COSTUME_TIERS[COSTUMES[5].tier].forge.essence + COSTUME_COMPLETE_ESSENCE,
    );
    expect(sim.codex.costumes).toHaveLength(6);
  });
});
