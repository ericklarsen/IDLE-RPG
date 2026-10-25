import { describe, expect, it } from 'vitest';
import { bossTarget } from './readiness';
import { normalizeSkills } from './skills';
import type { Element } from './types';

const base = {
  atk: 40,
  atkSpeed: 1.2,
  crit: 0.08,
  critDmg: 1.5,
  def: 5,
  maxHp: 300,
  skills: normalizeSkills(),
  element: null as Element | null,
  elemBonus: 0,
};

describe('bossTarget', () => {
  it('melaporkan kekurangan DPS saat hero belum sanggup', () => {
    const target = bossTarget(base, 10);
    expect(target.stage).toBe(10);
    expect(target.ready).toBe(false);
    expect(target.gapPct).toBeGreaterThan(0);
    expect(target.requiredDps).toBeGreaterThan(target.dps);
  });

  it('menandai boss siap dan gap nol saat ATK jauh di atas ambang', () => {
    const target = bossTarget({ ...base, atk: 500_000 }, 10);
    expect(target.ready).toBe(true);
    expect(target.gapPct).toBe(0);
  });

  it('gap mengecil saat ATK naik', () => {
    const low = bossTarget(base, 12).gapPct;
    const high = bossTarget({ ...base, atk: base.atk * 2 }, 12).gapPct;
    expect(high).toBeLessThan(low);
  });

  it('elemen yang unggul menurunkan kebutuhan DPS', () => {
    // Stage 1 boss is dark, so holy is strong and fire is weak.
    const holy = bossTarget({ ...base, element: 'holy' }, 1);
    const none = bossTarget(base, 1);
    const fire = bossTarget({ ...base, element: 'fire' }, 1);
    expect(holy.dps).toBeGreaterThan(none.dps);
    expect(fire.dps).toBeLessThan(none.dps);
  });

  it('DPS companion ikut dihitung supaya tracker tidak terlalu pesimis', () => {
    const plain = bossTarget(base, 12);
    const withWisp = bossTarget({ ...base, petDps: 60 }, 12);

    expect(withWisp.dps).toBeGreaterThan(plain.dps);
    expect(withWisp.gapPct).toBeLessThan(plain.gapPct);
  });

  it('memakai nama boss dari data musuh', () => {
    expect(bossTarget(base, 1).name).toBe('The Hollow King');
    expect(bossTarget(base, 2).name).toBe('Ember Warden');
  });
});
