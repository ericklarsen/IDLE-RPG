import { useRef } from 'react';
import { COSTUME_TIERS, costumeById } from '../data/costumes';
import { RARITY, SLOT_LABEL } from '../data/items';
import { TRIAL_FLOORS } from '../sim/trial';
import type { TrialResult } from '../sim/types';
import { fmt } from './format';
import { useDialog } from './useDialog';

interface Props {
  result: TrialResult;
  onClose: () => void;
}

export default function TrialResultModal({ result, onClose }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  useDialog(cardRef, onClose);

  const done = result.cleared >= TRIAL_FLOORS;
  const next = Math.min(TRIAL_FLOORS, result.cleared + 1);
  const costume = costumeById(result.costume);

  return (
    <div className="report-backdrop">
      <section
        ref={cardRef}
        tabIndex={-1}
        className="report-card trial-result"
        role="dialog"
        aria-modal="true"
        aria-label="Trial result"
      >
        <span className="eyebrow">TRIAL TOWER</span>
        <h2>{result.win ? 'Floor cleared' : 'Repelled'}</h2>
        <p className="report-duration">
          Floor {result.floor} · {result.name}
        </p>

        {result.win ? (
          <div className="report-grid">
            <div>
              <label>DUST</label>
              <b>✧{fmt(result.dust)}</b>
            </div>
            <div>
              <label>ESSENCE</label>
              <b>✦{fmt(result.essence)}</b>
            </div>
            {result.cores > 0 && (
              <div>
                <label>CORES</label>
                <b>◈{fmt(result.cores)}</b>
              </div>
            )}
            {result.gold > 0 && (
              <div>
                <label>CACHE GOLD</label>
                <b className="gold-text">◆{fmt(result.gold)}</b>
              </div>
            )}
          </div>
        ) : (
          <p className="report-note">
            No reward for a loss — but the retry was the only thing spent. The run is back where
            you left it.
          </p>
        )}

        {result.item && (
          <p className="rift-drop" style={{ color: RARITY[result.item.rarity].color }}>
            {RARITY[result.item.rarity].label} {SLOT_LABEL[result.item.slot]} · {result.item.name}
          </p>
        )}

        {costume && (
          <p className="rift-drop" style={{ color: COSTUME_TIERS[costume.tier].color }}>
            {COSTUME_TIERS[costume.tier].label.toUpperCase()} COSTUME · {costume.name}
          </p>
        )}

        {result.costumeDust > 0 && (
          <p className="report-note">Duplicate costume · +{result.costumeDust} dust</p>
        )}

        <p className="report-note">
          Rules: {result.rules.map((rule) => rule.label).join(' · ')}
        </p>

        <p className="report-note">
          {result.win
            ? done
              ? `Tower cleared · ${result.attempts} retries unused`
              : `Next: floor ${next} · ${result.attempts} retries left`
            : `${result.attempts} ${result.attempts === 1 ? 'retry' : 'retries'} left this week`}
        </p>

        <button type="button" className="report-claim" onClick={onClose}>
          BACK TO THE RUN
        </button>
      </section>
    </div>
  );
}
