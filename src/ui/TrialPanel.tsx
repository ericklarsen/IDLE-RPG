import { ELEMENT_COLOR, ELEMENT_SHORT } from '../data/elements';
import { TRIAL_UNLOCK_STAGE, trialReward } from '../sim/trial';
import { timeLeft } from '../sim/week';
import { useGameStore } from '../state/store';
import { fmt } from './format';

interface Props {
  /** Called after a floor opens so the page can return to the battle view. */
  onEnter: () => void;
}

export default function TrialPanel({ onEnter }: Props) {
  const trial = useGameStore((state) => state.trial);
  const farmStage = useGameStore((state) => state.farmStage);
  const startTrial = useGameStore((state) => state.startTrial);

  const next = trial.next;
  const rules = next?.rules ?? [];
  const reward = next ? trialReward(next.floor, farmStage) : null;
  const locked = !trial.unlocked;
  const outOfRetries = !trial.active && !trial.done && trial.attempts <= 0;

  return (
    <div className="trial-panel">
      <div className="section-head">
        <span>
          TRIAL TOWER · {trial.cleared}/{trial.maxFloor}
        </span>
        <span>
          {trial.attempts}/{trial.maxAttempts} RETRIES
        </span>
      </div>

      <div className="trial-ladder" aria-label={`Floors cleared: ${trial.cleared} of 10`}>
        {Array.from({ length: trial.maxFloor }, (_, index) => index + 1).map((floor) => {
          const cleared = floor <= trial.cleared;
          const current = !trial.done && floor === trial.floor;
          return (
            <span
              key={floor}
              className={`trial-rung${cleared ? ' cleared' : ''}${current ? ' current' : ''}`}
              aria-hidden="true"
            >
              {floor}
            </span>
          );
        })}
      </div>

      <p className="detail-note">
        Ten bosses, one climb per week. A cleared floor stays cleared until Monday; a win costs
        nothing, but each loss spends one of your three retries.
      </p>

      {next ? (
        <div className="trial-boss">
          <div className="trial-boss-head">
            <span className="trial-boss-name">
              FLOOR {next.floor} · {next.name.toUpperCase()}
            </span>
            <span className="elem-tag" style={{ color: ELEMENT_COLOR[next.element] }}>
              {ELEMENT_SHORT[next.element]}
            </span>
          </div>

          <div className="trial-stats">
            <div>
              <label>HP</label>
              <b>{fmt(next.hp)}</b>
            </div>
            <div>
              <label>ATK</label>
              <b>{fmt(next.atk)}</b>
            </div>
            <div>
              <label>DEF</label>
              <b>{fmt(next.def)}</b>
            </div>
          </div>

          <div className="rift-mods">
            {rules.map((rule) => (
              <div key={rule.id} className="rift-mod">
                <span className="rift-mod-label">{rule.label}</span>
                <span className="rift-mod-desc">{rule.desc}</span>
              </div>
            ))}
          </div>

          {reward && (
            <div className="rift-rewards">
              <div>
                <label>FLOOR {next.floor}</label>
                <b>
                  {reward.dust} dust · {reward.essence} essence
                  {reward.cores > 0 ? ` · ${reward.cores} core` : ''}
                </b>
              </div>
              <div>
                <label>FLOOR 10</label>
                <b>Cache · Epic set piece</b>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="rift-status done">Tower cleared · resets Monday</p>
      )}

      <p className="trial-clock">ENDS IN {timeLeft(trial.endsAt)}</p>

      {locked ? (
        <p className="rift-locked">
          Clear stage {TRIAL_UNLOCK_STAGE} to unlock the tower ·{' '}
          {Math.min(farmStage, TRIAL_UNLOCK_STAGE)}/{TRIAL_UNLOCK_STAGE}
        </p>
      ) : trial.active ? (
        <p className="rift-status">
          Floor {trial.floor} running · win or fall to return to the run
        </p>
      ) : trial.done ? (
        <p className="rift-status done">Every floor cleared this week</p>
      ) : outOfRetries ? (
        <p className="rift-locked">No retries left — the tower reopens Monday</p>
      ) : (
        <button
          type="button"
          className="rift-enter trial-enter"
          onClick={() => {
            if (startTrial()) onEnter();
          }}
        >
          CLIMB FLOOR {trial.floor}
        </button>
      )}
    </div>
  );
}
