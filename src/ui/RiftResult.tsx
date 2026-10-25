import { useRef } from 'react';
import { RARITY, SLOT_LABEL } from '../data/items';
import { RIFT_DURATION_SECONDS, RIFT_ITEM_KILLS } from '../sim/rift';
import type { RiftResult } from '../sim/types';
import { fmt } from './format';
import { useDialog } from './useDialog';

interface Props {
  result: RiftResult;
  onClose: () => void;
}

export default function RiftResultModal({ result, onClose }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  useDialog(cardRef, onClose);

  return (
    <div className="report-backdrop">
      <section
        ref={cardRef}
        tabIndex={-1}
        className="report-card rift-result"
        role="dialog"
        aria-modal="true"
        aria-label="Rift result"
      >
        <span className="eyebrow">DAILY RIFT</span>
        <h2>Rift cleared</h2>
        <p className="report-duration">
          <b>{result.kills}</b> kills in {RIFT_DURATION_SECONDS} seconds
        </p>

        <div className="report-grid">
          <div>
            <label>CHEST GOLD</label>
            <b className="gold-text">◆{fmt(result.chest.gold)}</b>
          </div>
          <div>
            <label>ESSENCE</label>
            <b>✦{fmt(result.chest.essence)}</b>
          </div>
        </div>

        {result.item ? (
          <p className="rift-drop" style={{ color: RARITY[result.item.rarity].color }}>
            {RARITY[result.item.rarity].label} {SLOT_LABEL[result.item.slot]} ·{' '}
            {result.item.name}
          </p>
        ) : (
          <p className="report-note">
            No item this time — {RIFT_ITEM_KILLS}+ kills guarantees Epic or better.
          </p>
        )}

        <p className="report-note">
          Modifiers: {result.modifiers.map((modifier) => modifier.label).join(' · ')}
        </p>

        <button type="button" className="report-claim" onClick={onClose}>
          CLOSE
        </button>
      </section>
    </div>
  );
}
