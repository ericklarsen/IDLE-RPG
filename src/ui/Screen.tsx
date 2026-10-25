import type { ReactNode } from 'react';

interface Props {
  eyebrow: string;
  title: string;
  /** Optional content on the right side of the header (currencies, counters). */
  aside?: ReactNode;
  /** Renders a back button in the header when provided. */
  onBack?: () => void;
  children: ReactNode;
}

/** Full-page comic panel used by every section outside the battle HUD. */
export default function Screen({ eyebrow, title, aside, onBack, children }: Props) {
  return (
    <section className="screen" aria-label={title}>
      <header className="screen-head">
        {onBack && (
          <button type="button" className="screen-back" onClick={onBack} aria-label="Back">
            ‹
          </button>
        )}
        <div className="screen-title">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {aside && <div className="screen-meta">{aside}</div>}
      </header>
      <div className="screen-body">{children}</div>
    </section>
  );
}
