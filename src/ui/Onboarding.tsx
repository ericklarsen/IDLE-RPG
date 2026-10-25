import { useRef, useState } from 'react';
import { useDialog } from './useDialog';

interface Props {
  onDone: () => void;
}

const STEPS = [
  {
    glyph: '⚔',
    eyebrow: 'AUTO BATTLE',
    title: 'It fights itself',
    body: 'Your knight attacks, casts skills, and clears waves on its own. Elite enemies guard wave 5 and a boss waits on wave 10. Leave the tab and the expedition report pays you back.',
  },
  {
    glyph: '◆',
    eyebrow: 'FORGE & GEAR',
    title: 'Spend the gold',
    body: 'GEAR holds your loadout and bag: equip drops, salvage junk, and watch set bonuses stack. FORGE turns gold into permanent power, and MENU opens skills, boosts, the rift, and the codex.',
  },
  {
    glyph: '✦',
    eyebrow: 'GO PERMANENT',
    title: 'Ascend at stage 50',
    body: 'Clear stage 50 to trade the run for Star Shards and permanent nodes: more attack, more gold, a higher starting stage, and a longer offline cap. Your next run starts stronger.',
  },
];

export default function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  // No close handler: the tour is a gate, so Escape does nothing here.
  useDialog(cardRef);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="onboard-backdrop">
      <section
        ref={cardRef}
        tabIndex={-1}
        className="onboard-card"
        role="dialog"
        aria-modal="true"
        aria-label="How to play"
      >
        <span className="eyebrow">
          STEP {step + 1} / {STEPS.length} · {current.eyebrow}
        </span>
        <div className="onboard-glyph" aria-hidden="true">
          {current.glyph}
        </div>
        <h2>{current.title}</h2>
        <p>{current.body}</p>

        <div className="onboard-dots" aria-hidden="true">
          {STEPS.map((entry, index) => (
            <i key={entry.title} className={index === step ? 'on' : ''} />
          ))}
        </div>

        <button
          type="button"
          className="onboard-next"
          onClick={() => (last ? onDone() : setStep(step + 1))}
        >
          {last ? 'START FIGHTING' : 'NEXT'}
        </button>
        <button type="button" className="onboard-skip" onClick={onDone}>
          SKIP TOUR
        </button>
      </section>
    </div>
  );
}
