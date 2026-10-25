import { useRef } from 'react';
import { ELEMENT_LABEL } from '../data/elements';
import { petById } from '../data/pets';
import type { ArenaResult } from '../sim/types';
import { fmt } from './format';
import { useDialog } from './useDialog';

interface Props {
  result: ArenaResult;
  onClose: () => void;
}

export default function ArenaResultModal({ result, onClose }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  useDialog(cardRef, onClose);

  return (
    <div className="report-backdrop">
      <section
        ref={cardRef}
        tabIndex={-1}
        className="report-card arena-result"
        role="dialog"
        aria-modal="true"
        aria-label="Arena result"
      >
        <span className="eyebrow">RANKED ARENA</span>
        <h2 className={result.win ? 'win' : 'loss'}>{result.win ? 'Victory' : 'Defeat'}</h2>
        <p className="report-duration">
          <b>{result.rival}</b> · {ELEMENT_LABEL[result.element]}
        </p>

        <div className="report-grid">
          <div>
            <label>LADDER</label>
            <b className={result.points > 0 ? 'gold-text' : 'loss-text'}>
              {result.points > 0 ? `+${result.points}` : `${result.points}`} PTS
            </b>
          </div>
          <div>
            <label>RANK</label>
            <b>{result.rank}</b>
          </div>
          <div>
            <label>GOLD</label>
            <b className="gold-text">◆{fmt(result.gold)}</b>
          </div>
          <div>
            <label>ESSENCE</label>
            <b>✦{fmt(result.essence)}</b>
          </div>
        </div>

        {result.rankUp && <p className="arena-rankup">RANK UP · {result.rank}</p>}

        {result.egg && (
          <p className="arena-rankup">
            WISP EGG · {petById(result.egg.id)?.name ?? 'Wisp'} · {result.egg.eggs} to synthesise
          </p>
        )}

        <p className="report-note">
          {result.win
            ? result.cores > 0
              ? `Cores claimed: ${result.cores}.`
              : 'The ladder remembers every win.'
            : 'No reward this time. The rival keeps their points.'}{' '}
          Tickets left today: {result.tickets}.
        </p>

        <button type="button" className="report-claim" onClick={onClose}>
          BACK TO THE RUN
        </button>
      </section>
    </div>
  );
}
