import { lazy, Suspense } from 'react';
import { useGameStore } from '../state/store';
import type { MenuPage } from './nav';
import OptionsPanel from './OptionsPanel';
import SavePanel from './SavePanel';
import Screen from './Screen';

const RiftHub = lazy(() => import('./RiftHub'));
const EventPanel = lazy(() => import('./EventPanel'));
const SkillsPanel = lazy(() => import('./SkillsPanel'));
const BoostPanel = lazy(() => import('./BoostPanel'));
const AscendPanel = lazy(() => import('./AscendPanel'));
const CodexPanel = lazy(() => import('./CodexPanel'));
const MountPanel = lazy(() => import('./MountPanel'));
const WingPanel = lazy(() => import('./WingPanel'));
const DungeonPanel = lazy(() => import('./DungeonPanel'));
const ShopPanel = lazy(() => import('./ShopPanel'));

interface Props {
  /** Open MENU sub-page, kept in the app nav state so back works. */
  page: MenuPage | null;
  onPage: (page: MenuPage | null) => void;
  /** Rift entry drops back to the battle HUD, like a duel does. */
  onEnterBattle: () => void;
}

/**
 * The rest of the game gets its own index instead of a tab strip inside the
 * bag: each card below opens a dedicated page with a back button.
 */
export default function MenuScreen({ page, onPage, onEnterBattle }: Props) {
  const { books, cores, shards, rift, trial, event, codex, mounts, wings, dungeon, shop } =
    useGameStore();

  const loading = <p className="panel-loading">Opening…</p>;

  if (page) {
    const back = () => onPage(null);

    if (page === 'rift') {
      return (
        <Screen eyebrow="DAILY" title="Rift" onBack={back}>
          <Suspense fallback={loading}>
            <RiftHub onEnter={onEnterBattle} />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'event') {
      return (
        <Screen eyebrow="WEEKLY" title="Event" onBack={back}>
          <Suspense fallback={loading}>
            <EventPanel />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'mounts') {
      return (
        <Screen
          eyebrow="STABLE"
          title="Mounts"
          aside={<span className="screen-count">◈ {mounts.crystals}</span>}
          onBack={back}
        >
          <Suspense fallback={loading}>
            <MountPanel />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'wings') {
      return (
        <Screen
          eyebrow="VAULT"
          title="Wings"
          aside={<span className="screen-count">◈ {mounts.crystals}</span>}
          onBack={back}
        >
          <Suspense fallback={loading}>
            <WingPanel />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'dungeon') {
      return (
        <Screen
          eyebrow="MOUNT RUNS"
          title="Dungeon"
          aside={<span className="screen-count">{dungeon.tickets} TICKETS</span>}
          onBack={back}
        >
          <Suspense fallback={loading}>
            <DungeonPanel onEnter={onEnterBattle} />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'shop') {
      return (
        <Screen eyebrow="GOLD ONLY" title="Shop" onBack={back}>
          <Suspense fallback={loading}>
            <ShopPanel />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'skills') {
      return (
        <Screen
          eyebrow="LOADOUT"
          title="Skills"
          aside={<span className="screen-count">▤ {books}</span>}
          onBack={back}
        >
          <Suspense fallback={loading}>
            <SkillsPanel />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'boosts') {
      return (
        <Screen
          eyebrow="PERMANENT"
          title="Boosts"
          aside={<span className="screen-count">✦ {cores}</span>}
          onBack={back}
        >
          <Suspense fallback={loading}>
            <BoostPanel />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'ascend') {
      return (
        <Screen
          eyebrow="STAR SHARDS"
          title="Ascend"
          aside={<span className="screen-count">✦ {shards}</span>}
          onBack={back}
        >
          <Suspense fallback={loading}>
            <AscendPanel />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'codex') {
      return (
        <Screen eyebrow="RECORDS" title="Codex" onBack={back}>
          <Suspense fallback={loading}>
            <CodexPanel />
          </Suspense>
        </Screen>
      );
    }

    if (page === 'options') {
      return (
        <Screen eyebrow="SYSTEM" title="Options" onBack={back}>
          <OptionsPanel />
        </Screen>
      );
    }

    return (
      <Screen eyebrow="SYSTEM" title="Save Data" onBack={back}>
        <SavePanel />
      </Screen>
    );
  }

  const cards: {
    id: MenuPage;
    stamp: string;
    name: string;
    desc: string;
    meta: string;
  }[] = [
    {
      id: 'rift',
      stamp: 'RF',
      name: 'RIFT',
      desc: 'Daily rift, weekly tower',
      meta: rift.active
        ? `${rift.remaining}s LEFT`
        : trial.active
          ? `FLOOR ${trial.floor}`
          : rift.todayDone && trial.done
            ? 'CLEARED'
            : 'READY',
    },
    {
      id: 'event',
      stamp: 'EV',
      name: 'EVENT',
      desc: 'Weekly Emberfall cache',
      meta: event.active ? `${event.bosses}/${event.goal} BOSSES` : event.unlocked ? 'SOON' : 'LOCKED',
    },
    {
      id: 'mounts',
      stamp: 'MT',
      name: 'MOUNTS',
      desc: 'Stable, skills, training',
      meta:
        mounts.mounts.filter((mount) => mount.unlocked).length > 0
          ? `${mounts.mounts.filter((mount) => mount.unlocked).length}/${mounts.mounts.length} STABLED · ◈${mounts.crystals}`
          : 'EMPTY STABLE',
    },
    {
      id: 'wings',
      stamp: 'WG',
      name: 'WINGS',
      desc: 'Rare drops, big skills',
      meta:
        wings.wings.filter((wing) => wing.unlocked).length > 0
          ? `${wings.wings.filter((wing) => wing.unlocked).length}/${wings.wings.length} WINGS`
          : 'NONE YET',
    },
    {
      id: 'dungeon',
      stamp: 'DG',
      name: 'DUNGEON',
      desc: 'Mount runs, 3 tiers',
      meta: dungeon.active
        ? `WAVE ${dungeon.wave}/${dungeon.waves}`
        : dungeon.unlocked
          ? `${dungeon.tickets} TICKETS`
          : 'LOCKED',
    },
    {
      id: 'shop',
      stamp: 'SH',
      name: 'SHOP',
      desc: 'Tickets and crystals',
      meta: shop.unlocked ? 'GOLD ONLY' : 'LOCKED',
    },
    {
      id: 'skills',
      stamp: 'SK',
      name: 'SKILLS',
      desc: 'Slots, passives, upgrades',
      meta: `▤ ${books} BOOKS`,
    },
    {
      id: 'boosts',
      stamp: 'BO',
      name: 'BOOSTS',
      desc: 'Permanent stat ranks',
      meta: `✦ ${cores} CORES`,
    },
    {
      id: 'ascend',
      stamp: 'AS',
      name: 'ASCEND',
      desc: 'Trade a run for shards',
      meta: `✦ ${shards} SHARDS`,
    },
    {
      id: 'codex',
      stamp: 'CO',
      name: 'CODEX',
      desc: 'Bestiary and arsenal',
      meta: `${codex.enemies.length + codex.items.length + codex.modifiers.length} LOGGED`,
    },
    {
      id: 'options',
      stamp: 'OP',
      name: 'OPTIONS',
      desc: 'Audio and motion',
      meta: 'SYSTEM',
    },
    {
      id: 'save',
      stamp: 'SV',
      name: 'SAVE DATA',
      desc: 'Export, import, reset',
      meta: 'LOCAL',
    },
  ];

  return (
    <Screen
      eyebrow="EVERYTHING ELSE"
      title="Menu"
      aside={<span className="screen-count">{cards.length} PAGES</span>}
    >
      <p className="detail-note">
        Each system opens its own page. The run keeps fighting while you browse.
      </p>

      <div className="menu-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`menu-card menu-${card.id}`}
            onClick={() => onPage(card.id)}
          >
            <span className="menu-stamp" aria-hidden="true">
              {card.stamp}
            </span>
            <span className="menu-name">{card.name}</span>
            <span className="menu-desc">{card.desc}</span>
            <span className="menu-meta">{card.meta}</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}
