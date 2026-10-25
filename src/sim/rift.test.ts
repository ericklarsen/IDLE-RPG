import { describe, expect, it } from 'vitest';
import { stageRates } from './offline';
import {
  RIFT_ITEM_KILLS,
  dayKey,
  riftChest,
  riftChestGoldMult,
  riftModifiers,
} from './rift';

describe('daily rift', () => {
  it('dayKey memakai tanggal lokal', () => {
    expect(dayKey(new Date(2026, 9, 23))).toBe('2026-10-23');
    expect(dayKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('modifier harian deterministik, dua buah, dan berganti tiap hari', () => {
    const a = riftModifiers('2026-10-23');
    const b = riftModifiers('2026-10-23');
    expect(a.map((modifier) => modifier.id)).toEqual(b.map((modifier) => modifier.id));
    expect(a).toHaveLength(2);
    expect(new Set(a.map((modifier) => modifier.id)).size).toBe(2);

    const days = new Set<string>();
    for (let day = 1; day <= 7; day += 1) {
      days.add(
        riftModifiers(`2026-10-0${day}`)
          .map((modifier) => modifier.id)
          .join(','),
      );
    }
    expect(days.size).toBeGreaterThan(1);
  });

  it('chest memberi item mulai ambang kill dan gold mengikuti kill', () => {
    const low = riftChest(RIFT_ITEM_KILLS - 1, 10);
    const high = riftChest(RIFT_ITEM_KILLS, 10);

    expect(low.item).toBe(false);
    expect(high.item).toBe(true);
    expect(high.gold).toBeGreaterThan(low.gold);
    expect(riftChest(20, 10).essence).toBeGreaterThan(riftChest(10, 10).essence);
    expect(riftChest(0, 10).gold).toBe(0);
  });

  it('chest setara sekitar satu kill farm per kill rift di semua stage', () => {
    for (const stage of [10, 20, 30, 40, 50]) {
      const perKill = riftChest(10, stage).gold / 10;
      const farm = stageRates(stage).gold;
      expect(perKill / farm).toBeGreaterThan(0.85);
      expect(perKill / farm).toBeLessThan(1.15);
    }
  });

  it('Greed menaikkan gold chest', () => {
    expect(riftChest(10, 10, 1.5).gold).toBeGreaterThan(riftChest(10, 10).gold);
    expect(riftChestGoldMult([])).toBe(1);
    expect(
      riftChestGoldMult([{ id: 'greed', label: 'Greed', desc: '', chestGold: 1.5 }]),
    ).toBe(1.5);
  });
});
