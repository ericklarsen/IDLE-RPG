import { describe, expect, it } from 'vitest';
import { skillById, skillEffectText, skillScale, skillUpgradeCost } from '../data/skills';
import { BattleSim } from './battle';
import { normalizeSkills, passiveBonuses } from './skills';
import type { SaveData, SkillLoadout } from './types';

function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 5,
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

function loadout(active: (string | null)[], passive: string | null = null): Partial<SkillLoadout> {
  return { active, passive, levels: {} };
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function enemyDamageInFirstTick(sim: BattleSim): number {
  let total = 0;
  sim.on((event) => {
    if (event.type === 'hit' && event.target === 'enemy') total += event.damage;
  });
  sim.tick(0.05);
  return total;
}

describe('skills data & loadout', () => {
  it('default loadout punya dua skill aktif di enam slot', () => {
    const skills = normalizeSkills(undefined);
    expect(skills.active).toEqual(['heavy-strike', 'holy-mend', null, null, null, null]);
    expect(skills.passive).toBeNull();
  });

  it('menolak skill yang salah tipe dan membatasi level', () => {
    const skills = normalizeSkills({
      active: ['keen-edge', 'ember-burst', null],
      passive: 'heavy-strike',
      levels: { 'ember-burst': 99, 'holy-mend': -4 },
    });

    expect(skills.active).toEqual([null, 'ember-burst', null, null, null, null]);
    expect(skills.passive).toBeNull();
    expect(skills.levels['ember-burst']).toBe(10);
    expect(skills.levels['holy-mend']).toBe(1);
  });

  it('scaling 8% per level dan biaya upgrade mengikuti level', () => {
    expect(skillScale(1)).toBe(1);
    expect(skillScale(10)).toBeCloseTo(1.72, 5);
    expect(skillUpgradeCost(3)).toBe(3);
    expect(skillEffectText(skillById('heavy-strike')!, 1)).toContain('200%');
  });

  it('Umbral Rend aktif, ber-elemen dark, dan punya lifesteal', () => {
    const info = skillById('umbral-rend')!;
    expect(info.type).toBe('active');
    expect(info.kind).toBe('drain');
    expect(info.element).toBe('dark');
    expect(skillEffectText(info, 1)).toContain('dark');
    expect(skillEffectText(info, 1)).toContain('heal 30%');
  });

  it('passive memberi bonus sesuai stat', () => {
    const skills = normalizeSkills(loadout([null, null, null], 'vitality'));
    const bonus = passiveBonuses(skills);
    expect(bonus.hpPct).toBeCloseTo(0.1, 5);
    expect(bonus.atkPct).toBe(0);
  });
});


describe('skill casting', () => {
  it('skill damage menambah damage pada tick yang sama', () => {
    const plain = new BattleSim(
      makeSave({ skills: loadout([null, null, null]) }),
      seeded(3),
    );
    const skilled = new BattleSim(
      makeSave({ skills: loadout(['heavy-strike', null, null]) }),
      seeded(3),
    );

    expect(enemyDamageInFirstTick(skilled)).toBeGreaterThan(enemyDamageInFirstTick(plain));
  });

  it('heal mengembalikan HP saat cast', () => {
    const sim = new BattleSim(
      makeSave({ skills: loadout(['holy-mend', null, null]) }),
      seeded(3),
    );
    sim.hero.hp = 10;
    sim.tick(0.05);
    expect(sim.hero.hp).toBeGreaterThan(10);
  });

  it('shield aktif dan menyerap damage musuh', () => {
    const sim = new BattleSim(
      makeSave({ skills: loadout(['aegis', null, null]) }),
      seeded(3),
    );
    sim.tick(0.05);
    expect(sim.shield).toBeGreaterThan(0);

    const hpBefore = sim.hero.hp;
    const shieldBefore = sim.shield;
    let blocked = 0;
    sim.on((event) => {
      if (event.type === 'hit' && event.target === 'hero' && event.damage === 0) blocked += 1;
    });

    for (let i = 0; i < 40; i += 1) sim.tick(0.05);
    expect(blocked).toBeGreaterThan(0);
    expect(sim.hero.hp).toBe(hpBefore);
    expect(sim.shield).toBeLessThan(shieldBefore);
    expect(sim.deadTimer).toBe(0);
  });

  it('buff ATK menaikkan attack power sementara', () => {
    const sim = new BattleSim(
      makeSave({ skills: loadout(['frenzy', null, null]) }),
      seeded(3),
    );
    const base = sim.hero.atk;
    sim.tick(0.05);
    expect(sim.attackPower).toBeGreaterThan(base);
  });

  it('Umbral Rend mencuri HP dari damage yang dihasilkan', () => {
    const sim = new BattleSim(
      makeSave({ skills: loadout(['umbral-rend', null, null]) }),
      seeded(3),
    );
    sim.hero.hp = 30;

    let drained = 0;
    sim.on((event) => {
      if (event.type === 'skill' && event.kind === 'drain') drained = event.amount;
    });

    sim.tick(0.05);
    expect(drained).toBeGreaterThan(0);
    expect(sim.hero.hp).toBeGreaterThan(30);
  });

  it('slot 1 menang prioritas dari slot 2', () => {
    const sim = new BattleSim(
      makeSave({ skills: loadout(['heavy-strike', 'holy-mend', null, null, null, null]) }),
      seeded(3),
    );
    const names: string[] = [];
    sim.on((event) => {
      if (event.type === 'skill') names.push(event.name);
    });

    sim.tick(0.05);
    expect(names).toEqual(['Heavy Strike']);

    // The global cast gate holds the heal until ~2s have passed.
    for (let i = 0; i < 30 && !names.includes('Holy Mend'); i += 1) sim.tick(0.1);
    expect(names).toContain('Holy Mend');
  });

  it('slot keenam ikut dipakai oleh auto-cast', () => {
    const sim = new BattleSim(
      makeSave({ skills: loadout([null, null, null, null, null, 'heavy-strike']) }),
      seeded(3),
    );
    const names: string[] = [];
    sim.on((event) => {
      if (event.type === 'skill') names.push(event.name);
    });

    sim.tick(0.05);
    expect(names).toEqual(['Heavy Strike']);
  });

  it('jeda global menahan cast kedua walau cooldown skill sudah siap', () => {
    const sim = new BattleSim(
      makeSave({
        skills: loadout(['heavy-strike', 'ember-burst', null, null, null, null]),
      }),
      seeded(3),
    );
    const names: string[] = [];
    sim.on((event) => {
      if (event.type === 'skill') names.push(event.name);
    });

    sim.tick(0.05);
    expect(names).toHaveLength(1);

    for (let i = 0; i < 10; i += 1) sim.tick(0.1);
    expect(names).toHaveLength(1);

    for (let i = 0; i < 15 && names.length < 2; i += 1) sim.tick(0.1);
    expect(names.length).toBe(2);
  });

  it('skill tetap disimpan setelah save dan reload', () => {
    const sim = new BattleSim(
      makeSave({ books: 2, skills: loadout(['ember-burst', null, null], 'keen-edge') }),
      seeded(3),
    );
    sim.upgradeSkill('ember-burst');

    const restored = new BattleSim(sim.saveData());
    expect(restored.skills.active[0]).toBe('ember-burst');
    expect(restored.skills.passive).toBe('keen-edge');
    expect(restored.skills.levels['ember-burst']).toBe(2);
    expect(restored.books).toBe(1);
  });
});

describe('skill upgrades', () => {
  it('upgrade memakai skill book dan berhenti di level 10', () => {
    const sim = new BattleSim(makeSave({ books: 5 }), seeded(3));
    expect(sim.skills.levels['heavy-strike']).toBe(1);

    const outcome = sim.upgradeSkill('heavy-strike');
    expect(outcome.ok).toBe(true);
    expect(outcome.level).toBe(2);
    expect(sim.books).toBe(4);

    sim.skills.levels['heavy-strike'] = 10;
    expect(sim.upgradeSkill('heavy-strike').reason).toBe('max');
  });

  it('upgrade gagal tanpa skill book', () => {
    const sim = new BattleSim(makeSave({ books: 0 }), seeded(3));
    const outcome = sim.upgradeSkill('holy-mend');
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('books');
  });

  it('passive mengubah stats dan bisa dilepas', () => {
    const sim = new BattleSim(makeSave(), seeded(3));
    const baseAtk = sim.hero.atk;

    expect(sim.setPassive('keen-edge')).toBe(true);
    expect(sim.hero.atk).toBeGreaterThan(baseAtk);

    expect(sim.setPassive(null)).toBe(true);
    expect(sim.hero.atk).toBeCloseTo(baseAtk, 5);
  });
});
