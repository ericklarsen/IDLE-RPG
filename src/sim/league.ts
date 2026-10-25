import { rewardFor } from './formulas';
import { weekEndsAt, weekKey } from './week';
import type { LeagueReward, LeagueSnapshot, LeagueState } from './types';

/**
 * Weekly league season.
 *
 * The arena ladder (career points) never resets; the league does. Each Monday
 * the week's season points settle into a division, and that division decides
 * the crate waiting to be claimed. Seasons are local-time and computed from the
 * saved key, so a player who skips a week still gets exactly one settlement
 * when they come back.
 */

/**
 * Divisions climb from Bronze to Prismatic.
 *
 * Thresholds are tuned to the three tickets a day: a perfect week of 21 duels
 * is 504 season points, so Prismatic takes almost every win while Silver is a
 * normal active week.
 */
export const LEAGUE_DIVISIONS = [
  { name: 'Bronze', promoteAt: 200, keepAt: 0 },
  { name: 'Silver', promoteAt: 330, keepAt: 100 },
  { name: 'Gold', promoteAt: 450, keepAt: 220 },
  { name: 'Prismatic', promoteAt: null, keepAt: 340 },
] as const;

/** Local Monday of the week, so the season turns over at the player's midnight. */
const seasonKey = weekKey;
const seasonEndsAt = weekEndsAt;

export { seasonKey, seasonEndsAt };
export { timeLeft as seasonCountdown } from './week';

export function clampDivision(division: number): number {
  if (!Number.isFinite(division)) return 0;
  return Math.max(0, Math.min(LEAGUE_DIVISIONS.length - 1, Math.floor(division)));
}

export function divisionInfo(division: number): {
  index: number;
  name: string;
  promoteAt: number | null;
  keepAt: number;
  nextName: string | null;
} {
  const index = clampDivision(division);
  const tier = LEAGUE_DIVISIONS[index];
  const next = LEAGUE_DIVISIONS[index + 1] ?? null;
  return {
    index,
    name: tier.name,
    promoteAt: tier.promoteAt,
    keepAt: tier.keepAt,
    nextName: next?.name ?? null,
  };
}

export function emptyLeague(key: string): LeagueState {
  return { key, points: 0, division: 0, rewardDivision: null, rewardClaimed: true };
}

/** Where a week's points leave you: up past the target, down under the floor. */
export function leagueNextDivision(division: number, points: number): number {
  const info = divisionInfo(division);
  if (info.promoteAt !== null && points >= info.promoteAt) return info.index + 1;
  if (points < info.keepAt) return Math.max(0, info.index - 1);
  return info.index;
}

/**
 * Applies a season change once. A player who was away for three weeks settles
 * a single time, so there is no pile of unclaimed crates to mop up.
 */
export function leagueRollover(
  state: LeagueState,
  now = new Date(),
): { league: LeagueState; settled: boolean } {
  const key = seasonKey(now);
  if (state.key === key) return { league: state, settled: false };

  const division = leagueNextDivision(state.division, state.points);
  return {
    settled: true,
    league: {
      key,
      points: 0,
      division,
      // A week with no duels earns nothing, so the crate cannot be farmed by
      // simply opening the game on Monday.
      rewardDivision: state.points > 0 ? division : null,
      rewardClaimed: state.points <= 0,
    },
  };
}

export function leagueReward(division: number, farmStage: number): LeagueReward {
  const info = divisionInfo(division);
  return {
    division: info.index,
    name: info.name,
    // Roughly forty farm kills: a week-ending payout, not a second arena win.
    gold: Math.max(200, Math.round(rewardFor(farmStage, 1, 'normal').gold * 40)),
    essence: 5 + info.index * 4,
    cores: info.index === 0 ? 0 : info.index * 2,
    // Gold and Prismatic add a guaranteed set piece and a wisp egg.
    setPiece: info.index >= 2,
    egg: info.index >= 2,
    claimed: false,
  };
}

export function leagueSnapshot(
  state: LeagueState,
  farmStage: number,
  now = new Date(),
): LeagueSnapshot {
  const info = divisionInfo(state.division);
  const reward =
    state.rewardDivision === null
      ? null
      : {
          ...leagueReward(state.rewardDivision, farmStage),
          claimed: state.rewardClaimed,
        };

  return {
    key: state.key,
    division: info.index,
    divisionName: info.name,
    points: state.points,
    promoteAt: info.promoteAt,
    keepAt: info.keepAt,
    nextName: info.nextName,
    endsAt: seasonEndsAt(now),
    reward,
  };
}

/** Keeps a hand-edited save from inventing a division or a negative season. */
export function normalizeLeague(
  raw?: Partial<LeagueState> | null,
  now = new Date(),
): LeagueState {
  const current = seasonKey(now);
  const fallback = emptyLeague(current);
  if (!raw || typeof raw !== 'object') return fallback;

  const key = typeof raw.key === 'string' && raw.key.length > 0 ? raw.key.slice(0, 10) : current;
  const points = Number(raw.points);
  const reward = Number(raw.rewardDivision);

  return {
    key,
    points: Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0,
    division: clampDivision(Number(raw.division) || 0),
    rewardDivision:
      raw.rewardDivision === null || raw.rewardDivision === undefined
        ? null
        : Number.isFinite(reward)
          ? clampDivision(reward)
          : null,
    rewardClaimed:
      raw.rewardDivision === null || raw.rewardDivision === undefined
        ? true
        : raw.rewardClaimed === true,
  };
}
