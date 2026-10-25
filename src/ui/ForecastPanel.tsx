import { useRef } from 'react';
import type { ForecastCurrency, ForecastOption, ForecastReport } from '../sim/forecast';
import { fmt } from './format';
import { useDialog } from './useDialog';

interface Props {
  report: ForecastReport;
  onClose: () => void;
}

const CURRENCY_GLYPH: Record<ForecastCurrency, string> = {
  gold: '◆',
  cores: '✦',
  books: '▤',
};

function clock(seconds: number | null): string {
  if (seconds === null) return '—';
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = `${whole % 60}`.padStart(2, '0');
  return `${minutes}:${rest}`;
}

function costLabel(option: ForecastOption): string {
  if (option.cost === 0) return 'free';
  return `${CURRENCY_GLYPH[option.currency]}${fmt(option.cost)}`;
}

function outcome(option: ForecastOption): string {
  if (option.killed) return `boss dies in ${clock(option.seconds)}`;
  return `boss survives · ${option.remainingPct}% HP left`;
}

export default function ForecastPanel({ report, onClose }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  useDialog(cardRef, onClose);

  const fastest = report.options.find((option) => option.killed) ?? null;
  const cheapest =
    report.options
      .filter((option) => option.killed)
      .sort((a, b) => a.cost - b.cost)[0] ?? null;

  return (
    <div className="report-backdrop">
      <section
        ref={cardRef}
        tabIndex={-1}
        className="report-card forecast-card"
        role="dialog"
        aria-modal="true"
        aria-label="Forge forecast"
      >
        <span className="eyebrow">FORGE FORECAST · STAGE {report.stage}</span>
        <h2>{report.bossName}</h2>
        <p className="report-duration">
          Boss has <b>{fmt(report.bossHp)} HP</b> · simulated with your current run
        </p>

        <div className="forecast-baseline">
          <span>Current build</span>
          <b>{outcome(report.baseline)}</b>
        </div>

        {report.options.length === 0 ? (
          <p className="report-note">Nothing left to buy right now.</p>
        ) : (
          <ul className="forecast-list">
            {report.options.map((option) => (
              <li
                key={option.id}
                className={`forecast-row${option.killed ? ' win' : ''}${
                  option.affordable ? '' : ' short'
                }`}
              >
                <div className="forecast-main">
                  <span className="forecast-name">{option.label}</span>
                  <span className="forecast-cost">
                    {costLabel(option)}
                    {option.chance !== undefined
                      ? ` · ${Math.round(option.chance * 100)}%`
                      : ''}
                  </span>
                </div>
                <div className="forecast-result">
                  <span>{outcome(option)}</span>
                  {fastest?.id === option.id && (
                    <span className="forecast-tag">FASTEST</span>
                  )}
                  {cheapest?.id === option.id && fastest?.id !== option.id && (
                    <span className="forecast-tag cheap">CHEAPEST</span>
                  )}
                  {!option.affordable && <span className="forecast-tag short">SAVE UP</span>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="report-note">
          Real combat rules on a copy of this run, full HP, two lives. Enhance is simulated as
          if the roll lands.
        </p>

        <button type="button" className="report-claim" onClick={onClose}>
          CLOSE
        </button>
      </section>
    </div>
  );
}
