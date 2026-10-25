import { describe, expect, it } from 'vitest';
import { BattleSim } from './battle';
import { setPartySlot } from './party';
import type { SaveData } from './types';

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 24,
    level: 10,
    exp: 0,
    gold: 0,
    maxStage: 20,
    kills: 0,
    inventory: [],
    itemSeq: 10,
    ...overrides,
  };
}

/** Runs the simulation in fixed steps, the same cadence the scene uses. */
function run(sim: BattleSim, seconds: number): void {
  const step = 1 / 30;
  for (let i = 0; i < Math.round(seconds / step); i += 1) sim.tick(step);
}

function partySim(...members: ('knight' | 'ranger' | 'cleric')[]): BattleSim {
  const sim = new BattleSim(makeSave());
  for (let slot = 0; slot < members.length; slot += 1) {
    const next = setPartySlot(sim.party, slot, members[slot]);
    expect(next, members[slot]).not.toBeNull();
    sim.party = next!;
  }
  sim.party.activeSlot = 0;
  sim.setActiveCharacter(0);
  sim.refreshParty();
  return sim;
}

describe('party combat', () => {
  it('builds mates for everyone but the active member', () => {
    const sim = partySim('knight', 'ranger', 'cleric');
    expect(sim.mates.map((mate) => mate.id)).toEqual(['ranger', 'cleric']);
    expect(sim.mates[0].maxHp).toBeGreaterThan(0);
    expect(sim.mates[0].down).toBe(false);
  });

  it('lets mates deal damage, so a party kills faster than a solo hero', () => {
    const solo = new BattleSim(makeSave());
    const trio = partySim('knight', 'ranger', 'cleric');

    run(solo, 12);
    run(trio, 12);

    expect(trio.enemy.hp).toBeLessThan(solo.enemy.hp);
  });

  it('re-seats the roster when the active member changes', () => {
    const sim = partySim('knight', 'ranger');
    expect(sim.setActiveCharacter(1)).toBe(true);
    expect(sim.mates.map((mate) => mate.id)).toEqual(['knight']);
  });

  it('spreads damage onto mates and revives them on the next kill', () => {
    const sim = partySim('knight', 'ranger');
    expect(sim.mates).toHaveLength(1);

    // Force the worst case instead of waiting for a lucky roll.
    const mate = sim.mates[0];
    mate.hp = 0;
    mate.down = true;

    // Clearing the target is what brings them back.
    (sim as unknown as { killEnemy: () => void }).killEnemy();

    expect(sim.mates[0].down).toBe(false);
    expect(sim.mates[0].hp).toBe(sim.mates[0].maxHp);
  });

  it('keeps a solo party identical to the old single hero', () => {
    const solo = new BattleSim(makeSave());
    expect(solo.mates).toHaveLength(0);

    run(solo, 10);
    expect(solo.hero.hp).toBeLessThanOrEqual(solo.hero.maxHp);
    expect(solo.enemy.hp).toBeLessThan(solo.enemy.maxHp);
  });

  it('feeds the battle HUD a live roster with roster colours', () => {
    const sim = partySim('knight', 'ranger');
    const snapshot = sim.snapshot();

    expect(snapshot.party.members.map((member) => member.name)).toEqual(['Warden', 'Ranger']);
    expect(snapshot.party.members[1]).toMatchObject({
      color: '#a8720f',
      element: 'lightning',
      active: false,
      down: false,
    });
    // Rounding differs by a rounding mode, never by more than one point.
    expect(Math.abs(snapshot.party.members[0].hp - snapshot.heroHp)).toBeLessThanOrEqual(1);

    run(sim, 6);
    const after = sim.snapshot();
    expect(Math.abs(after.party.members[0].hp - after.heroHp)).toBeLessThanOrEqual(1);
    expect(after.party.members[1].hp).toBe(Math.max(0, Math.round(sim.mates[0].hp)));
  });

  it('keeps a solo party to a single HUD pip', () => {
    const solo = new BattleSim(makeSave());
    expect(solo.snapshot().party.members).toHaveLength(1);
  });

  it('reports the roster for the PARTY screen', () => {
    const sim = partySim('knight', 'ranger');
    const view = sim.partyView();

    expect(view.slots.slice(0, 2)).toEqual(['knight', 'ranger']);
    expect(view.members.map((member) => member.id)).toEqual(['knight', 'ranger']);
    expect(view.members[0]).toMatchObject({ active: true, down: false });
    expect(view.members[1]).toMatchObject({ active: false, down: false });
    expect(view.members[1].hp).toBe(view.members[1].maxHp);
  });
});
