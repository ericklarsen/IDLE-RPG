import { describe, expect, it } from 'vitest';
import {
  LEAGUE_DIVISIONS,
  divisionInfo,
  emptyLeague,
  leagueNextDivision,
  leagueReward,
  leagueRollover,
  leagueSnapshot,
  normalizeLeague,
  seasonCountdown,
  seasonEndsAt,
  seasonKey,
} from './league';
import type { LeagueState } from './types';

// 19 Oct 2026 is a Monday; 25 Oct is the Sunday that closes the week.
const MONDAY = new Date(2026, 9, 19, 9, 0, 0);
const NEXT_MONDAY = new Date(2026, 9, 26, 9, 0, 0);

function league(overrides: Partial<LeagueState> = {}): LeagueState {
  return { ...emptyLeague(seasonKey(MONDAY)), ...overrides };
}

describe('league season', () => {
  it('menunjuk Senin lokal sebagai kunci musim', () => {
    expect(seasonKey(new Date(2026, 9, 19, 0, 0))).toBe('2026-10-19');
    expect(seasonKey(new Date(2026, 9, 21, 23, 59))).toBe('2026-10-19');
    expect(seasonKey(new Date(2026, 9, 25, 23, 59))).toBe('2026-10-19');
    expect(seasonKey(new Date(2026, 9, 26, 0, 0))).toBe('2026-10-26');
  });

  it('berakhir Senin berikutnya, bukan tujuh hari setelah kunjungan', () => {
    expect(seasonEndsAt(MONDAY)).toBe(new Date(2026, 9, 26, 0, 0).getTime());
    expect(seasonEndsAt(new Date(2026, 9, 25, 20, 0))).toBe(
      new Date(2026, 9, 26, 0, 0).getTime(),
    );
  });

  it('menghitung sisa waktu dengan satuan yang masuk akal', () => {
    const endsAt = seasonEndsAt(MONDAY);
    const midnight = new Date(2026, 9, 19, 0, 0).getTime();
    expect(seasonCountdown(endsAt, midnight)).toBe('7d 0h');
    expect(seasonCountdown(endsAt, MONDAY.getTime())).toBe('6d 15h');
    expect(seasonCountdown(endsAt, endsAt - 90 * 60_000)).toBe('1h 30m');
    expect(seasonCountdown(endsAt, endsAt + 5_000)).toBe('0m');
  });
});

describe('league division', () => {
  it('naik hanya saat mencapai ambang promosi', () => {
    expect(leagueNextDivision(0, 199)).toBe(0);
    expect(leagueNextDivision(0, 200)).toBe(1);
    expect(leagueNextDivision(1, 329)).toBe(1);
    expect(leagueNextDivision(1, 330)).toBe(2);
    expect(leagueNextDivision(3, 504)).toBe(3);
  });

  it('tidak pernah turun dari Bronze dan tidak melampaui Prismatic', () => {
    expect(leagueNextDivision(0, 0)).toBe(0);
    expect(leagueNextDivision(2, 219)).toBe(1);
    expect(leagueNextDivision(3, 0)).toBe(2);
    expect(leagueNextDivision(9, 5_000)).toBe(LEAGUE_DIVISIONS.length - 1);
  });

  it('menyediakan ambang dan nama berikutnya untuk UI', () => {
    expect(divisionInfo(1)).toMatchObject({
      name: 'Silver',
      promoteAt: 330,
      keepAt: 100,
      nextName: 'Gold',
    });
    expect(divisionInfo(3)).toMatchObject({ name: 'Prismatic', promoteAt: null, nextName: null });
  });
});

describe('league rollover', () => {
  it('menyelesaikan satu musim sekali saja', () => {
    const start = league({ points: 340, division: 1 });
    const { league: settled, settled: changed } = leagueRollover(start, NEXT_MONDAY);

    expect(changed).toBe(true);
    expect(settled).toMatchObject({
      key: '2026-10-26',
      points: 0,
      division: 2,
      rewardDivision: 2,
      rewardClaimed: false,
    });

    const again = leagueRollover(settled, NEXT_MONDAY);
    expect(again.settled).toBe(false);
    expect(again.league).toBe(settled);
  });

  it('tidak memberi crate untuk minggu tanpa duel', () => {
    const idle = league({ points: 0, division: 1 });
    const { league: settled } = leagueRollover(idle, NEXT_MONDAY);
    // No duels also means slipping back to Bronze; the crate must not appear.
    expect(settled.division).toBe(0);
    expect(settled.rewardDivision).toBeNull();
    expect(settled.rewardClaimed).toBe(true);
  });

  it('menurunkan divisi setelah minggu yang sepi', () => {
    const weak = league({ points: 40, division: 2 });
    const { league: settled } = leagueRollover(weak, NEXT_MONDAY);
    expect(settled.division).toBe(1);
    expect(settled.rewardDivision).toBe(1);
  });

  it('menyelesaikan sekali walau pemain absen beberapa minggu', () => {
    const old = league({ key: '2026-09-28', points: 200, division: 0 });
    const { league: settled } = leagueRollover(old, NEXT_MONDAY);
    expect(settled.key).toBe('2026-10-26');
    expect(settled.points).toBe(0);
    expect(settled.rewardDivision).not.toBeNull();
  });
});

describe('league reward', () => {
  it('menaikkan hadiah per divisi dan menambah set piece serta telur di Gold+', () => {
    const bronze = leagueReward(0, 30);
    const silver = leagueReward(1, 30);
    const gold = leagueReward(2, 30);
    const prismatic = leagueReward(3, 30);

    expect(bronze).toMatchObject({ name: 'Bronze', cores: 0, setPiece: false, egg: false });
    expect(silver.cores).toBeGreaterThan(bronze.cores);
    expect(silver.essence).toBeGreaterThan(bronze.essence);
    expect(silver.egg).toBe(false);
    expect(gold.setPiece).toBe(true);
    expect(gold.egg).toBe(true);
    expect(prismatic.egg).toBe(true);
    expect(prismatic.gold).toBeGreaterThanOrEqual(gold.gold);
    expect(prismatic.cores).toBeGreaterThan(gold.cores);
  });

  it('hadiah emas ikut stage farm, bukan angka tetap', () => {
    expect(leagueReward(1, 50).gold).toBeGreaterThan(leagueReward(1, 10).gold);
  });
});

describe('league snapshot', () => {
  it('menampilkan divisi, poin musim, dan crate yang menunggu', () => {
    const state = league({ points: 120, division: 1, rewardDivision: 1, rewardClaimed: false });
    const snapshot = leagueSnapshot(state, 40, MONDAY);

    expect(snapshot).toMatchObject({
      division: 1,
      divisionName: 'Silver',
      points: 120,
      promoteAt: 330,
      keepAt: 100,
      nextName: 'Gold',
      endsAt: new Date(2026, 9, 26, 0, 0).getTime(),
    });
    expect(snapshot.reward).toMatchObject({ name: 'Silver', claimed: false, setPiece: false });
  });

  it('tidak menampilkan crate kalau belum ada musim yang selesai', () => {
    expect(leagueSnapshot(league(), 30, MONDAY).reward).toBeNull();
  });
});

describe('league normalization', () => {
  it('save lama masuk Bronze tanpa crate', () => {
    expect(normalizeLeague(null, MONDAY)).toEqual({
      key: '2026-10-19',
      points: 0,
      division: 0,
      rewardDivision: null,
      rewardClaimed: true,
    });
    expect(normalizeLeague({}, MONDAY)).toMatchObject({ key: '2026-10-19', division: 0 });
  });

  it('membersihkan poin negatif, divisi liar, dan crate palsu', () => {
    const cleaned = normalizeLeague(
      {
        key: '2026-10-12',
        points: -40.7,
        division: 42,
        rewardDivision: 99,
        rewardClaimed: false,
      },
      MONDAY,
    );
    expect(cleaned).toMatchObject({
      key: '2026-10-12',
      points: 0,
      division: LEAGUE_DIVISIONS.length - 1,
      rewardDivision: LEAGUE_DIVISIONS.length - 1,
      rewardClaimed: false,
    });
  });

  it('crate tanpa tanda klaim dianggap belum diambil supaya tidak hilang', () => {
    const cleaned = normalizeLeague(
      { key: '2026-10-12', points: 10, division: 1, rewardDivision: 1 },
      MONDAY,
    );
    expect(cleaned.rewardClaimed).toBe(false);
  });
});
