import { describe, expect, it } from 'vitest';
import { emptyBoosts } from '../data/boost';
import { elementMultiplier } from '../data/elements';
import { emptyEquipped } from '../data/items';
import { BattleSim } from './battle';
import { boostBonuses, boostSpent, totalBoostRefund } from './boost';
import type { Item, Rune, SaveData } from './types';
import {
  attunement,
  itemRuneBonus,
  nextRuneSlot,
  runeCostFor,
} from './upgrade';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'epic',
    name: 'Test Blade',
    level: 10,
    atk: 20,
    hp: 40,
    def: 4,
    power: 100,
    salvage: 20,
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
    version: 4,
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

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function runFor(sim: BattleSim, seconds: number): void {
  const step = 0.05;
  for (let i = 0; i < Math.round(seconds / step); i += 1) sim.tick(step);
}

const fireRune = (value: number): Rune => ({ element: 'fire', value });

describe('elements', () => {
  it('mengikuti siklus fire > ice > lightning > holy > dark > fire', () => {
    expect(elementMultiplier('fire', 'ice')).toBe(1.25);
    expect(elementMultiplier('ice', 'lightning')).toBe(1.25);
    expect(elementMultiplier('dark', 'fire')).toBe(1.25);
    expect(elementMultiplier('fire', 'dark')).toBe(0.85);
    expect(elementMultiplier('holy', 'holy')).toBe(1);
    expect(elementMultiplier(null, 'fire')).toBe(1);
  });
});

describe('attunement & runes', () => {
  it('elemen dengan rune terbanyak menjadi attunement', () => {
    const equipped = emptyEquipped();
    equipped.weapon = makeItem({
      runes: [fireRune(0.04), fireRune(0.05), null],
    });
    equipped.ring = makeItem({
      id: 'it_2',
      slot: 'ring',
      runes: [fireRune(0.03), { element: 'ice', value: 0.02 }, null],
    });

    const result = attunement(equipped);
    expect(result.element).toBe('fire');
    expect(result.bonus).toBeCloseTo(0.12, 5);
    expect(result.counts.fire).toBe(3);
  });

  it('tiga rune satu elemen memicu resonance ×1.5', () => {
    const item = makeItem({ runes: [fireRune(0.04), fireRune(0.05), fireRune(0.06)] });
    expect(itemRuneBonus(item, 'fire')).toBeCloseTo(0.225, 5);

    const equipped = emptyEquipped();
    equipped.weapon = item;
    expect(attunement(equipped).bonus).toBeCloseTo(0.225, 5);
  });

  it('slot rune kosong diisi dulu, lalu rune terlemah diganti', () => {
    expect(nextRuneSlot(makeItem({ runes: [null, null, null] }))).toBe(0);
    expect(nextRuneSlot(makeItem({ runes: [fireRune(0.05), null, null] }))).toBe(1);
    expect(
      nextRuneSlot(
        makeItem({
          runes: [fireRune(0.05), { element: 'ice', value: 0.02 }, fireRune(0.04)],
        }),
      ),
    ).toBe(1);
  });

  it('biaya enchant naik setiap enchant pada item yang sama', () => {
    expect(runeCostFor(makeItem({ enchants: 1 }))).toBeGreaterThan(
      runeCostFor(makeItem({ enchants: 0 })),
    );
    expect(runeCostFor(makeItem({ rarity: 'mythic' }))).toBeGreaterThan(
      runeCostFor(makeItem({ rarity: 'common' })),
    );
  });

  it('enchant memakai essence dan menghasilkan elemen yang dipilih', () => {
    const sim = new BattleSim(
      makeSave({
        equipped: { weapon: makeItem() },
        essence: 100,
        cores: 6,
      }),
      seeded(3),
    );

    const before = sim.essence;
    const outcome = sim.enchantItem('it_1', 'fire');

    expect(outcome.ok).toBe(true);
    expect(outcome.rune?.element).toBe('fire');
    expect(sim.equipped.weapon?.runes[0]?.element).toBe('fire');
    expect(sim.essence).toBeLessThan(before);
    expect(sim.attuned.element).toBe('fire');
  });

  it('elemen unggul memberi damage lebih besar daripada elemen netral', () => {
    const fire = new BattleSim(
      makeSave({
        equipped: {
          weapon: makeItem({ runes: [fireRune(0.04), fireRune(0.05), fireRune(0.06)] }),
        },
      }),
      seeded(12),
    );
    const holy = new BattleSim(
      makeSave({
        equipped: {
          weapon: makeItem({
            runes: [
              { element: 'holy', value: 0.04 },
              { element: 'holy', value: 0.05 },
              { element: 'holy', value: 0.06 },
            ],
          }),
        },
      }),
      seeded(12),
    );

    expect(fire.enemy.element).toBe('ice');
    expect(fire.attuned.element).toBe('fire');

    const firstHit = (sim: BattleSim): number => {
      let damage = 0;
      sim.on((event) => {
        if (event.type === 'hit' && event.target === 'enemy' && damage === 0) {
          damage = event.damage;
        }
      });
      while (damage === 0 && sim.time < 10) sim.tick(0.05);
      return damage;
    };

    expect(firstHit(fire)).toBeGreaterThan(firstHit(holy));
  });

  it('bonus elemen boost hanya berlaku saat hero punya attunement', () => {
    const firstHit = (sim: BattleSim): number => {
      let damage = 0;
      sim.on((event) => {
        if (event.type === 'hit' && event.target === 'enemy' && damage === 0) {
          damage = event.damage;
        }
      });
      while (damage === 0 && sim.time < 10) sim.tick(0.05);
      return damage;
    };

    const plain = new BattleSim(makeSave({ equipped: { weapon: makeItem() } }), seeded(8));
    const boosted = new BattleSim(
      makeSave({ equipped: { weapon: makeItem() }, boosts: { element: 10 } }),
      seeded(8),
    );
    expect(firstHit(boosted)).toBe(firstHit(plain));

    const firePlain = new BattleSim(
      makeSave({
        equipped: { weapon: makeItem({ runes: [fireRune(0.04), fireRune(0.04), null] }) },
      }),
      seeded(8),
    );
    const fireBoosted = new BattleSim(
      makeSave({
        equipped: { weapon: makeItem({ runes: [fireRune(0.04), fireRune(0.04), null] }) },
        boosts: { element: 10 },
      }),
      seeded(8),
    );
    expect(firstHit(fireBoosted)).toBeGreaterThan(firstHit(firePlain));
  });

  it('enchant gagal tanpa essence dan tidak mengubah rune', () => {
    const sim = new BattleSim(
      makeSave({ equipped: { weapon: makeItem() }, essence: 0 }),
      seeded(3),
    );
    const outcome = sim.enchantItem('it_1', 'ice');
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('essence');
    expect(sim.equipped.weapon?.runes[0]).toBeNull();
  });
});

describe('boost', () => {
  it('boost offense menaikkan ATK dan respec mengembalikan core', () => {
    const base = new BattleSim(makeSave(), seeded(1));
    const sim = new BattleSim(makeSave({ cores: 10 }), seeded(1));
    const baseAtk = base.hero.atk;

    expect(sim.upgradeBoost('offense').ok).toBe(true);
    expect(sim.hero.atk).toBeGreaterThan(baseAtk);
    expect(sim.cores).toBe(9);

    const refund = sim.respecBoosts();
    expect(refund).toBe(1);
    expect(sim.cores).toBe(10);
    expect(sim.boosts.offense).toBe(0);
    expect(sim.hero.atk).toBeCloseTo(baseAtk, 5);
  });

  it('boost gagal tanpa core dan berhenti di rank maksimal', () => {
    const sim = new BattleSim(makeSave({ cores: 0 }), seeded(1));
    expect(sim.upgradeBoost('defense').reason).toBe('cores');

    const maxed = new BattleSim(makeSave({ cores: 1000 }), seeded(1));
    for (let i = 0; i < 10; i += 1) maxed.upgradeBoost('speed');
    expect(maxed.boosts.speed).toBe(10);
    expect(maxed.upgradeBoost('speed').reason).toBe('max');
  });

  it('boost gold menambah gold dari kill', () => {
    const base = new BattleSim(makeSave(), seeded(5));
    const boosted = new BattleSim(makeSave({ boosts: { fortune: 10 } }), seeded(5));
    runFor(base, 60);
    runFor(boosted, 60);

    expect(base.kills).toBeGreaterThan(0);
    expect(boosted.kills).toBe(base.kills);
    expect(boosted.gold).toBeGreaterThan(base.gold);
  });

  it('bonus dan refund boost dihitung sesuai rank', () => {
    const boosts = { ...emptyBoosts(), offense: 2, element: 4 };
    const bonus = boostBonuses(boosts);
    expect(bonus.atkPct).toBeCloseTo(0.12, 5);
    expect(bonus.elemBonus).toBeCloseTo(0.2, 5);
    expect(boostSpent(4)).toBe(10);
    expect(totalBoostRefund(boosts)).toBe(3 + 10);
  });
});
