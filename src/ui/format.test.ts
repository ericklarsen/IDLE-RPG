import { describe, expect, it } from 'vitest';
import { fmt, hoursLabel } from './format';

describe('fmt', () => {
  it('meringkas angka kecil dan ribuan', () => {
    expect(fmt(999)).toBe('999');
    expect(fmt(1234)).toBe('1.2k');
    expect(fmt(12000)).toBe('12k');
  });

  it('memakai B dan T untuk angka besar', () => {
    expect(fmt(1_500_000)).toBe('1.5M');
    expect(fmt(2_400_000_000)).toBe('2.4B');
    expect(fmt(3_600_000_000_000)).toBe('3.6T');
  });

  it('tetap pendek pada stage sangat tinggi', () => {
    const text = fmt(1.4994164800167729e29);
    expect(text).toBe('1.50e29');
    expect(text.length).toBeLessThan(10);
  });
});

describe('hoursLabel', () => {
  it('menampilkan cap offline sesuai rank Long Haul', () => {
    expect(hoursLabel(8 * 3600)).toBe('8h');
    expect(hoursLabel(14 * 3600)).toBe('14h');
    expect(hoursLabel(5400)).toBe('1.5h');
  });
});
