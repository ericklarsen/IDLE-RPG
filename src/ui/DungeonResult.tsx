import { useRef } from 'react';
import type { DungeonResult } from '../sim/types';
import { fmt } from './format';
import { useDialog } from './useDialog';

interface Props {
  result: DungeonResult;
  onClose: () => void;
}

export default function DungeonResultModal({ result, onClose }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  useDialog(cardRef, onClose);

  return (
    <div className="report-backdrop">
      <section
        ref={cardRef}
        tabIndex={-1}
        className="report-card dungeon-result"
        role="dialog"
        aria-modal="true"
        aria-label="Dungeon result"
      >
        <span className="eyebrow">MOUNT DUNGEON</span>
        <h2 className={result.win ? 'win' : 'loss'}>{result.win ? 'Cleared' : 'Repelled'}</h2>
        <p className="report-duration">{result.tierName}</p>

        <div className="report-grid">
          <div>
            <label>CRYSTALS</label>
            <b className={result.crystals > 0 ? 'gold-text' : 'loss-text'}>
              ◈{fmt(result.crystals)}
            </b>
          </div>
          <div>
            <label>GOLD</label>
            <b className="gold-text">◆{fmt(result.gold)}</b>
          </div>
          <div>
            <label>EXP</label>
            <b>{fmt(result.exp)}</b>
          </div>
        </div>

        {result.mount && (
          <p className="dungeon-drop">MOUNT FOUND · {result.mountName}</p>
        )}
        {result.wing && (
          <p className="dungeon-drop wing-drop">WING FOUND · {result.wingName}</p>
        )}

        <p className="report-note">
          {result.win
            ? result.wing
              ? 'A pair of wings joins the vault — open WINGS to wear them.'
              : result.mount
                ? 'A new mount joins the stable — open MOUNTS to ride it.'
                : 'Crystals banked. Mounts roll 1–5% per tier; wings only 0.2–0.7%.'
            : 'The ticket is spent and no reward is paid. Check the stable before retrying.'}
        </p>

        <button type="button" className="report-claim" onClick={onClose}>
          BACK TO THE RUN
        </button>
      </section>
    </div>
  );
}
