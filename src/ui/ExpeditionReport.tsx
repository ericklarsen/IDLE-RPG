import { useRef } from 'react';
import type { OfflineReport } from '../sim/offline';
import { useGameStore } from '../state/store';
import { fmt, hoursLabel } from './format';
import { offlineHints } from './offlineHint';
import { useDialog } from './useDialog';

interface Props {
  report: OfflineReport;
  onClaim: () => void;
}

function duration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function ExpeditionReport({ report, onClaim }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  useDialog(cardRef, onClaim);
  const snapshot = useGameStore();
  const hints = offlineHints(snapshot, report);
  // The estimate covers the whole roster, so the report must not credit one
  // knight for a party's night of farming.
  const partySize = snapshot.party.members.length;

  return (
    <div className="report-backdrop">
      <section
        ref={cardRef}
        tabIndex={-1}
        className="report-card"
        role="dialog"
        aria-modal="true"
        aria-label="Expedition report"
      >
        <span className="eyebrow">EXPEDITION REPORT</span>
        <h2>Welcome back</h2>
        <p className="report-duration">
          Your {partySize > 1 ? 'party' : 'knight'} farmed for{' '}
          <b>{duration(report.seconds)}</b>
          {report.capped && (
            <span className="report-cap">CAP {hoursLabel(report.capSeconds).toUpperCase()}</span>
          )}
        </p>

        <div className="report-grid">
          <div>
            <label>KILLS</label>
            <b>{fmt(report.kills)}</b>
          </div>
          <div>
            <label>GOLD</label>
            <b className="gold-text">◆{fmt(report.gold + report.salvageGold)}</b>
          </div>
          <div>
            <label>EXP</label>
            <b>{fmt(report.exp)}</b>
          </div>
          <div>
            <label>LEVELS</label>
            <b>+{fmt(report.levels)}</b>
          </div>
          <div>
            <label>DROPS</label>
            <b>{fmt(report.drops)}</b>
          </div>
          <div>
            <label>BAG</label>
            <b>{report.items.length}</b>
          </div>
          <div>
            <label>SALVAGED</label>
            <b>{fmt(report.salvaged)}</b>
          </div>
          <div>
            <label>ESSENCE</label>
            <b>✦{fmt(report.essence)}</b>
          </div>
          <div>
            <label>CORES</label>
            <b>◇{fmt(report.cores)}</b>
          </div>
          <div>
            <label>BOOKS</label>
            <b>▤{fmt(report.books)}</b>
          </div>
        </div>

        <p className="report-note">
          {Math.round(report.efficiency * 100)}% efficiency · up to{' '}
          {hoursLabel(report.capSeconds)} counted · items kept {report.items.length} of{' '}
          {fmt(report.drops)}
        </p>

        <div className="report-hints">
          <span className="report-hints-label">AFTER CLAIM</span>
          {hints.map((hint) => (
            <span key={hint} className="report-hint">
              {hint}
            </span>
          ))}
        </div>

        <button type="button" className="report-claim" onClick={onClaim}>
          CLAIM REWARDS
        </button>
      </section>
    </div>
  );
}
