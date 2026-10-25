import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { damageRoll, enemyStats, heroStats, levelUpCost } from './formulas';

describe('formulas', () => {
  it('hero naik stat linear per level tanpa bonus global', () => {
    const base = heroStats(1);
    const next = heroStats(2);
    expect(next.atk).toBeCloseTo(base.atk + BALANCE.heroAtkPerLevel, 5);
    expect(next.maxHp).toBe(base.maxHp + BALANCE.heroHpPerLevel);
  });

  it('biaya level naik eksponensial', () => {
    expect(levelUpCost(2)).toBeGreaterThan(levelUpCost(1));
    expect(levelUpCost(10)).toBeGreaterThan(levelUpCost(9));
  });

  it('boss punya HP jauh di atas normal pada wave yang sama', () => {
    const normal = enemyStats(1, 9);
    const boss = enemyStats(1, BALANCE.bossWave);
    expect(boss.kind).toBe('boss');
    expect(boss.hp).toBeGreaterThan(normal.hp * 4);
    expect(boss.atkSpeed).toBeLessThan(normal.atkSpeed);
  });

  it('crit mengalikan damage sesuai critDmg', () => {
    const normal = damageRoll(100, 0, 0, 1.5, () => 0.99);
    const crit = damageRoll(100, 0, 1, 1.5, () => 0);
    expect(normal.crit).toBe(false);
    expect(crit.crit).toBe(true);
    expect(crit.damage).toBe(Math.round(normal.damage * 1.5));
  });

  it('damage minimal 1 walau DEF besar', () => {
    const roll = damageRoll(1, 999, 0, 1, () => 0.5);
    expect(roll.damage).toBe(1);
  });

  it('elemen unggul dan bonus elemen menaikkan damage', () => {
    const neutral = damageRoll(100, 0, 0, 1.5, () => 0.99);
    const strong = damageRoll(100, 0, 0, 1.5, () => 0.99, {
      elemMult: 1.25,
      elemBonus: 0.1,
    });
    const weak = damageRoll(100, 0, 0, 1.5, () => 0.99, { elemMult: 0.85 });

    expect(neutral.damage).toBe(100);
    expect(strong.damage).toBe(138);
    expect(weak.damage).toBe(85);
  });
});
