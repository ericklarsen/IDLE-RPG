import { SETS, setTierText } from '../data/sets';
import { EVENT_UNLOCK_STAGE, eventCountdown, nextEventStart } from '../sim/event';
import { useGameStore } from '../state/store';

export default function EventPanel() {
  const event = useGameStore((state) => state.event);
  const codex = useGameStore((state) => state.codex);
  const claimEvent = useGameStore((state) => state.claimEvent);
  const set = SETS.emberforged;
  const owned = new Set(codex.items);
  const found = set.pieces.filter((piece) => owned.has(piece)).length;

  const now = Date.now();
  const status = !event.unlocked
    ? `LOCKED · STAGE ${EVENT_UNLOCK_STAGE}`
    : event.active
      ? `ENDS IN ${eventCountdown(event.endsAt - now)}`
      : `STARTS IN ${eventCountdown(nextEventStart(new Date(now)) - now)}`;

  const ready = event.active && event.unlocked && !event.claimed && event.bosses >= event.goal;
  const percent = Math.min(100, (event.bosses / Math.max(1, event.goal)) * 100);

  return (
    <div className="event-panel">
      <div className="section-head">
        <span>WEEKLY EVENT</span>
        <span>{status}</span>
      </div>

      <div className="event-card" style={{ borderColor: set.color }}>
        <span className="event-name" style={{ color: set.color }}>
          EMBERFALL
        </span>
        <p className="detail-note">
          Friday to Sunday. Bosses drop Emberforged gear instead of ordinary loot, and five boss
          kills unlock the weekly cache.
        </p>

        <div className="event-track">
          <span style={{ width: `${percent}%`, background: set.color }} />
        </div>
        <div className="event-line">
          <span>
            {event.bosses}/{event.goal} BOSSES
          </span>
          <span>{event.claimed ? 'CACHE CLAIMED' : ready ? 'CACHE READY' : 'KEEP FIGHTING'}</span>
        </div>

        <button
          type="button"
          className="event-claim"
          style={ready ? { background: set.color } : undefined}
          disabled={!ready}
          onClick={claimEvent}
        >
          {!event.unlocked
            ? `REACH STAGE ${EVENT_UNLOCK_STAGE}`
            : !event.active
              ? 'EVENT NOT RUNNING'
              : event.claimed
                ? 'CLAIMED THIS WEEK'
                : `CLAIM CACHE · ${event.bosses}/${event.goal}`}
        </button>
      </div>

      <div className="section-head bag-head">
        <span>
          {set.label.toUpperCase()} {found}/{set.pieces.length}
        </span>
        <span>SET PIECES</span>
      </div>

      <ul className="event-pieces">
        {set.pieces.map((piece) => (
          <li key={piece} className={owned.has(piece) ? 'event-piece found' : 'event-piece'}>
            {owned.has(piece) ? piece : '???'}
          </li>
        ))}
      </ul>

      <div className="event-bonuses">
        {set.bonuses.map((tier) => (
          <span key={tier.pieces} className="event-bonus">
            {tier.pieces} PCS · {setTierText(tier.stats)}
          </span>
        ))}
      </div>
    </div>
  );
}
