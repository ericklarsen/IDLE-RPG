import { DUNGEON_UNLOCK_STAGE } from '../data/dungeon';
import { useGameStore } from '../state/store';
import { fmt } from './format';

interface Props {
  /** Entering drops back to the battle HUD where the run is visible. */
  onEnter: () => void;
}

/**
 * The mount dungeon: three tiers, each three trash waves then a boss. The
 * ticket count and the drop table sit on the card, so the cost of a run is
 * visible before it is spent.
 */
export default function DungeonPanel({ onEnter }: Props) {
  const dungeon = useGameStore((state) => state.dungeon);
  const farmStage = useGameStore((state) => state.farmStage);
  const dead = useGameStore((state) => state.dead);
  const startDungeon = useGameStore((state) => state.startDungeon);

  const running = dungeon.active;

  return (
    <div className="dungeon-panel">
      <div className="section-head">
        <span>DUNGEON · {dungeon.tickets} TICKETS</span>
        <span>{running ? `WAVE ${dungeon.wave}/${dungeon.waves}` : '5 FREE A DAY'}</span>
      </div>

      <p className="detail-note">
        Three waves of beasts, then the tier boss. Mount crystals are guaranteed; the
        mount itself is a roll. Extra tickets and crystals are sold in the shop for gold.
      </p>

      {running && (
        <p className="rift-status">
          Run in progress · wave {dungeon.wave}/{dungeon.waves}. Finish it in the battle HUD.
        </p>
      )}

      <div className="dungeon-list">
        {dungeon.tiers.map((tier) => {
          const disabled = running || !tier.unlocked || dungeon.tickets <= 0 || dead;
          return (
            <article
              key={tier.id}
              className={`dungeon-card${tier.unlocked ? '' : ' locked'}`}
              style={{ borderLeftColor: tier.color }}
            >
              <div className="dungeon-head">
                <span className="dungeon-name" style={{ color: tier.color }}>
                  {tier.name}
                </span>
                <span className="dungeon-stage">
                  {tier.unlocked ? `STAGE ${tier.stage}` : `CLEAR STAGE ${tier.stage}`}
                </span>
              </div>

              <p className="dungeon-desc">{tier.desc}</p>

              <div className="dungeon-meta">
                <span>
                  ◈ {tier.crystals.min}–{tier.crystals.max} crystals
                </span>
                <span className="dungeon-odds">{(tier.mountChance * 100).toFixed(0)}% MOUNT</span>
                <span className="wing-odds">
                  {Number((tier.wingChance * 100).toFixed(1))}% WING
                </span>
              </div>

              <div className="dungeon-mounts">
                {tier.mounts.map((mount) => (
                  <span key={mount.id} className={`mount-chip${mount.owned ? ' owned' : ''}`}>
                    {mount.owned ? mount.name : '???'}
                  </span>
                ))}
                {tier.wings.map((wing) => (
                  <span
                    key={wing.id}
                    className={`mount-chip wing-chip${wing.owned ? ' owned' : ''}`}
                  >
                    {wing.owned ? wing.name : '??? WING'}
                  </span>
                ))}
              </div>

              <div className="dungeon-actions">
                <span className="dungeon-waves">3 WAVES + BOSS</span>
                <button
                  type="button"
                  className="rival-fight"
                  disabled={disabled}
                  onClick={() => {
                    startDungeon(tier.id);
                    onEnter();
                  }}
                >
                  {!tier.unlocked
                    ? 'LOCKED'
                    : running
                      ? 'RUNNING'
                      : dungeon.tickets <= 0
                        ? 'NO TICKETS'
                        : dead
                          ? 'RECOVERING'
                          : 'ENTER · 1 TICKET'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!dungeon.unlocked && (
        <p className="rift-locked">
          Clear stage {DUNGEON_UNLOCK_STAGE} to open the mount dungeon ·{' '}
          {Math.min(farmStage, DUNGEON_UNLOCK_STAGE)}/{DUNGEON_UNLOCK_STAGE}
        </p>
      )}

      <p className="dungeon-note">
        Tickets refill to five at local midnight. A run left early spends its ticket and pays
        nothing; daily {fmt(dungeon.tickets)} of {dungeon.maxTickets} are available now.
      </p>
    </div>
  );
}
