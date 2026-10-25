import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { BattleSim } from './battle';
import { enemyStats, partyDropMult, rewardFor } from './formulas';
import { setPartySlot } from './party';
import type { CharacterId, Enemy, SaveData } from './types';

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 24,
    level: 10,
    exp: 0,
    gold: 0,
    maxStage: 50,
    kills: 0,
    inventory: [],
    itemSeq: 10,
    ...overrides,
  } as SaveData;
}

const MEMBERS: CharacterId[] = ['knight', 'ranger', 'cleric', 'mage', 'rogue'];

/** Seats `count` characters, then respawns the wave so it sees the party. */
function packSim(count: number, save: Partial<SaveData> = {}): BattleSim {
  const sim = new BattleSim(makeSave(save));
  for (let slot = 0; slot < count; slot += 1) {
    const next = setPartySlot(sim.party, slot, MEMBERS[slot]);
    expect(next, MEMBERS[slot]).not.toBeNull();
    sim.party = next!;
  }
  sim.party.activeSlot = 0;
  sim.setActiveCharacter(0);
  sim.refreshParty();
  sim.debugUnlockStage(1);
  return sim;
}

type Poked = { killEnemy: () => void; wave: number; spawnPack: () => void };
type Splasher = { splashPack: (damage: number) => void };
function killFront(sim: BattleSim): void {
  (sim as unknown as Poked).killEnemy();
}

/** Jumps the run to a specific wave of the current stage and respawns. */
function waveAt(sim: BattleSim, wave: number): void {
  const inner = sim as unknown as Poked;
  inner.wave = wave;
  inner.spawnPack();
}

describe('packed waves', () => {
  it('leaves a solo party exactly one monster with the old numbers', () => {
    const sim = packSim(1);
    const base = enemyStats(1, 1);

    expect(sim.enemyCount).toBe(1);
    expect(sim.enemies).toHaveLength(1);
    expect(sim.enemy.maxHp).toBe(base.hp);
    expect(sim.enemy.atk).toBe(base.atk);
    expect(sim.enemy).toBe(sim.enemies[0]);
  });

  it('fields one monster per party member and keeps every one distinct', () => {
    const sim = packSim(5);

    expect(sim.enemyCount).toBe(5);
    const ids = sim.enemies.map((enemy) => enemy.id);
    expect(new Set(ids).size).toBe(5);
    expect(sim.enemy).toBe(sim.enemies[0]);
  });

  it('splits HP and ATK by √count, so the wave grows but does not multiply', () => {
    const solo = packSim(1);
    const full = packSim(5);
    const base = enemyStats(1, 1);
    const share = 1 / Math.sqrt(5);

    expect(full.enemy.maxHp).toBe(Math.max(1, Math.round(base.hp * share)));
    expect(full.enemy.atk).toBe(Math.max(1, Math.round(base.atk * share)));

    // Total wave HP is √count of a lone monster, not count times as much.
    const totalHp = full.enemies.reduce((sum, enemy) => sum + enemy.maxHp, 0);
    expect(totalHp).toBeLessThan(solo.enemy.maxHp * 2.5);
    expect(totalHp).toBeGreaterThan(solo.enemy.maxHp);
  });

  it('leaves elites and bosses as a single fight even for a full party', () => {
    const sim = packSim(5);

    waveAt(sim, BALANCE.eliteWave);
    expect(sim.enemyCount).toBe(1);
    expect(sim.enemy.kind).toBe('elite');

    waveAt(sim, BALANCE.bossWave);
    expect(sim.enemyCount).toBe(1);
    expect(sim.enemy.kind).toBe('boss');
  });

  it('keeps a solo run on one monster at any stage', () => {
    // The whole calibrated curve was measured solo, so the pack must follow
    // the party and never the stage.
    const sim = new BattleSim(makeSave());
    sim.debugUnlockStage(45);

    expect(sim.stage).toBe(45);
    expect(sim.enemyCount).toBe(1);
  });

  it('keeps the wave alive when one of several monsters dies', () => {
    const sim = packSim(3);
    const wave = sim.wave;
    const first = sim.enemy.id;

    killFront(sim);

    expect(sim.wave).toBe(wave);
    expect(sim.enemyCount).toBe(2);
    expect(sim.enemy.id).not.toBe(first);
  });

  it('advances the wave only when the last monster falls', () => {
    const sim = packSim(3);
    const wave = sim.wave;

    killFront(sim);
    killFront(sim);
    expect(sim.wave).toBe(wave);

    killFront(sim);
    expect(sim.wave).toBe(wave + 1);
    expect(sim.enemyCount).toBe(3);
  });

  it('pays each monster a share instead of the whole single-monster reward', () => {
    const sim = packSim(5);
    const reward = rewardFor(sim.stage, sim.wave, 'normal');
    const share = 1 / Math.sqrt(5);
    const before = sim.gold;

    killFront(sim);

    expect(sim.gold - before).toBe(Math.ceil(reward.gold * share));
    // Five kills at the shared rate stay within a small multiple of one fight.
    expect(sim.gold - before).toBeLessThan(reward.gold);
  });

  it('raises item drops with the roster and leaves a solo run untouched', () => {
    expect(partyDropMult(1)).toBe(1);
    expect(partyDropMult(3)).toBeCloseTo(1.75);
    expect(partyDropMult(5)).toBeCloseTo(2.5);
    // A roster bigger than the wave caps where the wave does.
    expect(partyDropMult(9)).toBe(partyDropMult(5));

    type Dropper = {
      rng: () => number;
      maybeDropLoot: (kind: 'normal' | 'elite' | 'boss', split?: number) => void;
    };
    // Same roll and same kind: only the party clears the drop bar, so five
    // sets can be chased in the hours a solo set used to take.
    const drops = (sim: BattleSim): number => {
      const inner = sim as unknown as Dropper;
      inner.rng = () => 0.3;
      const before = sim.inventory.length;
      inner.maybeDropLoot('normal', 1);
      return sim.inventory.length - before;
    };

    expect(drops(packSim(1))).toBe(0);
    expect(drops(packSim(5))).toBe(1);
  });

  it('splashes a share of each hit onto the monsters behind the front one', () => {
    const sim = packSim(5);
    const back = sim.enemies.slice(1);
    const before = back.map((enemy) => enemy.hp);

    (sim as unknown as Splasher).splashPack(10);

    const share = Math.max(1, Math.round(10 * BALANCE.packSplash));
    expect(back.map((enemy) => enemy.hp)).toEqual(before.map((hp) => hp - share));
  });

  it('never lets splash land the kill, so the wave still clears front to back', () => {
    const sim = packSim(5);

    (sim as unknown as Splasher).splashPack(10_000);

    expect(sim.enemies).toHaveLength(5);
    expect(sim.enemy).toBe(sim.enemies[0]);
    expect(sim.enemies.slice(1).every((enemy) => enemy.hp === 1)).toBe(true);
  });

  it('leaves a solo run untouched: one monster has nothing behind it', () => {
    const sim = packSim(1);
    const hp = sim.enemy.hp;

    (sim as unknown as Splasher).splashPack(500);

    expect(sim.enemy.hp).toBe(hp);
  });

  it('wears the pack down while the front monster is still standing', () => {
    const sim = packSim(5);
    // A front monster that cannot die, so this measures the wiring of splash
    // through the real attacks instead of how fast the party clears a wave.
    sim.enemy.maxHp = 1_000_000;
    sim.enemy.hp = 1_000_000;

    for (let i = 0; i < 30 * 4; i += 1) sim.tick(1 / 30);

    const back = sim.enemies.slice(1);
    expect(back).toHaveLength(4);
    expect(back.every((enemy) => enemy.hp < enemy.maxHp)).toBe(true);
  });

  it('lets every monster in the wave swing, so the pack hits √count harder', () => {
    const sim = packSim(5);
    const base = enemyStats(1, 1);
    const total = sim.enemies.reduce((sum, enemy: Enemy) => sum + enemy.atk, 0);

    expect(total).toBeGreaterThan(base.atk);
    expect(total).toBeLessThan(base.atk * 3);
  });

  it('reports the live count to the HUD', () => {
    const sim = packSim(4);
    expect(sim.snapshot().enemyCount).toBe(4);

    killFront(sim);
    expect(sim.snapshot().enemyCount).toBe(3);
  });

  it('spawns every monster at full health', () => {
    const sim = packSim(5);
    expect(sim.enemies.every((enemy) => enemy.hp > 0 && enemy.hp === enemy.maxHp)).toBe(true);
  });

  it('holds the wave together through a long party run', () => {
    // Kills, spawns and deaths all rewrite the pack; a three-minute run makes
    // sure it never ends up empty or carrying a corpse as the target.
    const sim = packSim(5);
    const step = 1 / 30;
    for (let i = 0; i < 30 * 180; i += 1) sim.tick(step);

    expect(sim.enemyCount).toBeGreaterThan(0);
    expect(sim.enemy).toBe(sim.enemies[0]);
    expect(sim.enemies.every((enemy) => enemy.hp > 0 && enemy.hp <= enemy.maxHp)).toBe(true);
    expect(sim.snapshot().enemyCount).toBe(sim.enemyCount);
  });
});
