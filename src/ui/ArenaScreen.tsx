import { lazy, Suspense } from 'react';
import Screen from './Screen';

const ArenaPanel = lazy(() => import('./ArenaPanel'));

interface Props {
  /** Called after a duel starts so the page can return to the battle view. */
  onEnter: () => void;
}

export default function ArenaScreen({ onEnter }: Props) {
  return (
    <Screen eyebrow="RANKED DUELS" title="Arena">
      <Suspense fallback={<p className="panel-loading">Opening…</p>}>
        <ArenaPanel onEnter={onEnter} />
      </Suspense>
    </Screen>
  );
}
