import { RIFT_DURATION_SECONDS, RIFT_ITEM_KILLS, RIFT_UNLOCK_STAGE } from '../sim/rift';
import { useGameStore } from '../state/store';

interface Props {
  /** Called after a successful entry so the sheet can close and show the battle. */
  onEnter: () => void;
}

export default function RiftPanel({ onEnter }: Props) {
  const rift = useGameStore((state) => state.rift);
  const farmStage = useGameStore((state) => state.farmStage);
  const startRift = useGameStore((state) => state.startRift);

  return (
    <div className="rift-panel">
      <div className="section-head">
        <span>DAILY RIFT</span>
        <span>{RIFT_DURATION_SECONDS}s GAUNTLET</span>
      </div>

      <p className="detail-note">
        One run per day on your farm stage. Two modifiers change daily; kill as much as you
        can before the timer runs out.
      </p>

      <div className="rift-mods">
        {rift.modifiers.map((modifier) => (
          <div key={modifier.id} className="rift-mod">
            <span className="rift-mod-label">{modifier.label}</span>
            <span className="rift-mod-desc">{modifier.desc}</span>
          </div>
        ))}
      </div>

      <div className="rift-rewards">
        <div>
          <label>CHEST</label>
          <b>Gold + essence per kill</b>
        </div>
        <div>
          <label>ITEM</label>
          <b>Epic+ at {RIFT_ITEM_KILLS}+ kills</b>
        </div>
      </div>

      {!rift.unlocked ? (
        <p className="rift-locked">
          Clear stage {RIFT_UNLOCK_STAGE} to unlock · {Math.min(farmStage, RIFT_UNLOCK_STAGE)}/
          {RIFT_UNLOCK_STAGE}
        </p>
      ) : rift.active ? (
        <p className="rift-status">
          Rift running · {rift.remaining}s · {rift.kills} kills
        </p>
      ) : rift.todayDone ? (
        <p className="rift-status done">
          Today cleared · {rift.lastKills} kills · come back tomorrow
        </p>
      ) : (
        <button
          type="button"
          className="rift-enter"
          onClick={() => {
            startRift();
            onEnter();
          }}
        >
          ENTER RIFT
        </button>
      )}
    </div>
  );
}
