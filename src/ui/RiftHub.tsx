import { useRef, useState } from 'react';
import RiftPanel from './RiftPanel';
import TrialPanel from './TrialPanel';

type Tab = 'rift' | 'trial';

const TABS: { id: Tab; label: string }[] = [
  { id: 'rift', label: 'RIFT' },
  { id: 'trial', label: 'TRIAL' },
];

interface Props {
  /** Entering either mode drops back to the battle HUD. */
  onEnter: () => void;
}

/** Daily gauntlet and weekly tower share one page, split by a two-way switch. */
export default function RiftHub({ onEnter }: Props) {
  const [tab, setTab] = useState<Tab>('rift');
  const tabsRef = useRef<HTMLDivElement>(null);

  const select = (next: Tab) => {
    setTab(next);
    // Switching tabs starts at the top of the new one, not mid-scroll.
    tabsRef.current?.closest('.screen-body')?.scrollTo({ top: 0 });
  };

  return (
    <div className="rift-hub">
      <div className="rift-tabs" ref={tabsRef} role="tablist" aria-label="Rift and trial">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={`rift-tab${tab === entry.id ? ' on' : ''}`}
            onClick={() => select(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'rift' ? <RiftPanel onEnter={onEnter} /> : <TrialPanel onEnter={onEnter} />}
    </div>
  );
}
