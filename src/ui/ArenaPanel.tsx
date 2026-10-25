import { ELEMENT_COLOR, ELEMENT_SHORT } from '../data/elements';
import { ARENA_UNLOCK_STAGE } from '../sim/arena';
import { seasonCountdown } from '../sim/league';
import { useGameStore } from '../state/store';
import { fmt } from './format';

interface Props {
  /** Called after a duel starts so the sheet can close and show the arena. */
  onEnter: () => void;
}

export default function ArenaPanel({ onEnter }: Props) {
  const arena = useGameStore((state) => state.arena);
  const farmStage = useGameStore((state) => state.farmStage);
  const dead = useGameStore((state) => state.dead);
  const startDuel = useGameStore((state) => state.startDuel);
  const claimLeague = useGameStore((state) => state.claimLeague);

  const league = arena.league;
  const progress =
    arena.nextTier && arena.span > 0
      ? Math.max(0, Math.min(100, (arena.into / arena.span) * 100))
      : 100;
  const leagueProgress =
    league.promoteAt && league.promoteAt > 0
      ? Math.max(0, Math.min(100, (league.points / league.promoteAt) * 100))
      : 100;

  return (
    <div className="arena-panel">
      <div className="section-head">
        <span>RANKED ARENA</span>
        <span>
          {arena.tickets}/{arena.maxTickets} TICKETS
        </span>
      </div>

      {arena.unlocked && (
        <div className="league-card">
          <div className="league-head">
            <span>LEAGUE · {league.divisionName.toUpperCase()}</span>
            <span>ENDS IN {seasonCountdown(league.endsAt)}</span>
          </div>
          <div className="league-body">
            <b className="league-points">{fmt(league.points)} PTS</b>
            <span className="league-goal">
              {league.promoteAt === null
                ? 'TOP DIVISION'
                : `NEXT ${league.nextName?.toUpperCase()} AT ${fmt(league.promoteAt)}`}
            </span>
          </div>
          <div className="track league">
            <span style={{ width: `${leagueProgress}%` }} />
          </div>
          <p className="league-note">
            {league.keepAt > 0
              ? `Finish under ${fmt(league.keepAt)} pts and you drop a division on Monday.`
              : 'Bronze cannot drop. Win duels to climb every Monday.'}
          </p>
        </div>
      )}

      {arena.unlocked && league.reward && (
        <div className={`league-reward${league.reward.claimed ? ' claimed' : ''}`}>
          <div className="league-head">
            <span>SEASON CRATE · {league.reward.name.toUpperCase()}</span>
            <span>{league.reward.claimed ? 'CLAIMED' : 'READY'}</span>
          </div>
          <p className="league-payload">
            {fmt(league.reward.gold)}g · {league.reward.essence} essence ·{' '}
            {league.reward.cores} cores
            {league.reward.setPiece ? ' · 1 Epic set piece' : ''}
            {league.reward.egg ? ' · 1 wisp egg' : ''}
          </p>
          {!league.reward.claimed && (
            <button type="button" className="league-claim" onClick={claimLeague}>
              CLAIM CRATE
            </button>
          )}
        </div>
      )}

      <div className="rank-card">
        <span className="rank-emblem" aria-hidden="true">
          {arena.tierIndex + 1}
        </span>
        <div className="rank-copy">
          <span className="rank-name">{arena.tier}</span>
          <span className="rank-meta">
            LADDER {fmt(arena.points)} PTS · W {arena.wins} / L {arena.losses}
          </span>
        </div>
        <span className="rank-next">
          {arena.nextTier ? `NEXT ${arena.nextTier}` : 'MAX TIER'}
        </span>
      </div>

      <div className="track rank">
        <span style={{ width: `${progress}%` }} />
      </div>

      <p className="detail-note">
        Three rival builds wait each day. Fight them once each; wins climb the ladder and pay
        gold and essence. Tickets refresh at midnight.
      </p>

      {!arena.unlocked ? (
        <p className="rift-locked">
          Clear stage {ARENA_UNLOCK_STAGE} to unlock the arena ·{' '}
          {Math.min(farmStage, ARENA_UNLOCK_STAGE)}/{ARENA_UNLOCK_STAGE}
        </p>
      ) : arena.duelActive ? (
        <p className="rift-status">Duel running · win or fall to return to the run</p>
      ) : (
        <div className="rival-list">
          {arena.rivals.map((rival) => {
            const disabled = rival.fought || arena.tickets <= 0 || dead;
            return (
              <article key={rival.id} className={`rival-card${rival.fought ? ' fought' : ''}`}>
                <div className="rival-head">
                  <span className="rival-name">{rival.name}</span>
                  <span className={`rival-label ${rival.label.toLowerCase()}`}>
                    {rival.label}
                  </span>
                </div>
                <div className="rival-meta">
                  <span
                    className="elem-tag"
                    style={{ color: ELEMENT_COLOR[rival.element] }}
                  >
                    {ELEMENT_SHORT[rival.element]}
                  </span>
                  <span className="rival-build">{rival.build}</span>
                  <span className="rival-power">{fmt(rival.power)} PWR</span>
                </div>
                <button
                  type="button"
                  className="rival-fight"
                  disabled={disabled}
                  onClick={() => {
                    if (startDuel(rival.id)) onEnter();
                  }}
                >
                  {rival.fought
                    ? 'FOUGHT'
                    : arena.tickets <= 0
                      ? 'NO TICKETS'
                      : dead
                        ? 'RECOVERING'
                        : 'FIGHT'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {arena.tickets <= 0 && arena.unlocked && !arena.duelActive && (
        <p className="arena-note">No tickets left today — the ladder reopens at midnight.</p>
      )}
    </div>
  );
}
