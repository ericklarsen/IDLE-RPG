import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { COSTUME_TIERS, costumeById } from '../data/costumes';
import { ELEMENT_COLOR, ELEMENT_SHORT } from '../data/elements';
import { armHaptics } from '../game/haptics';
import type { ForecastReport } from '../sim/forecast';
import { gameController } from '../state/controller';
import { hasSave } from '../state/save';
import { isOnboarded, markOnboarded } from '../state/settings';
import { useGameStore } from '../state/store';
import CheatPanel from './CheatPanel';
import Dock, { type ScreenId } from './Dock';
import ExpeditionReport from './ExpeditionReport';
import { fmt } from './format';
import ForecastPanel from './ForecastPanel';
import { NAV_ROOT, useNav, type Overlay } from './nav';
import Onboarding from './Onboarding';
import RiftResultModal from './RiftResult';

// Pages other than the HUD stay out of the entry chunk.
const PhaserGame = lazy(() => import('../game/PhaserGame'));
const ArenaResultModal = lazy(() => import('./ArenaResult'));
const TrialResultModal = lazy(() => import('./TrialResult'));
const DungeonResultModal = lazy(() => import('./DungeonResult'));
const GearScreen = lazy(() => import('./GearScreen'));
const ForgeScreen = lazy(() => import('./ForgeScreen'));
const ArenaScreen = lazy(() => import('./ArenaScreen'));
const MenuScreen = lazy(() => import('./MenuScreen'));

function pct(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

export default function App() {
  const {
    stage,
    wave,
    kind,
    enemyName,
    enemyHp,
    enemyMaxHp,
    heroHp,
    heroMaxHp,
    enemyElement,
    level,
    exp,
    expToNext,
    gold,
    costume,
    dead,
    party,
    pushing,
    canPush,
    deathsHere,
    deathsToRetreat,
    target,
    rift,
    trial,
    event,
    arena,
    dungeon,
    shield,
    push,
    offlineReport,
    claimOffline,
    riftResult,
    closeRiftResult,
    duelResult,
    closeDuelResult,
    trialResult,
    closeTrialResult,
    dungeonResult,
    closeDungeonResult,
    forecastBoss,
  } = useGameStore();
  const { nav, go } = useNav();
  const { screen, page, overlay } = nav;
  // Bumped when a dock tab is tapped again so the page resets to its root view.
  const [screenNonce, setScreenNonce] = useState(0);
  const [forecast, setForecast] = useState<ForecastReport | null>(null);
  const [onboarding, setOnboarding] = useState(() => !isOnboarded() && !hasSave());
  const lowHp = heroMaxHp > 0 && heroHp / heroMaxHp <= 0.3 && !dead;
  // The strip only appears once a second character is actually in the party:
  // a solo run keeps exactly the HUD it had before.
  const roster = party.members.length > 1 ? party.members : null;
  const leader = party.members[0];
  const outfit = costumeById(costume.equipped);
  const outfitTier = outfit ? COSTUME_TIERS[outfit.tier] : null;
  const runningTier = dungeon.tiers.find((tier) => tier.id === dungeon.tier) ?? null;

  // Music layers follow the fight; the heartbeat follows the hero's health.
  useEffect(() => {
    sound.setMood(
      arena.duelActive
        ? 'boss'
        : rift.active || dungeon.active
          ? 'rift'
          : kind === 'boss'
            ? 'boss'
            : 'calm',
    );
  }, [arena.duelActive, rift.active, dungeon.active, kind]);

  useEffect(() => {
    sound.setHeartbeat(lowHp);
    return () => sound.setHeartbeat(false);
  }, [lowHp]);

  useEffect(() => {
    const onHidden = () => {
      sound.setHidden(true);
      gameController.handleHidden();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sound.setHidden(true);
        gameController.handleHidden();
      } else {
        sound.setHidden(false);
        gameController.handleVisible();
      }
    };
    window.addEventListener('pagehide', onHidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHidden);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Audio and haptics stay locked until the first gesture, as mobile browsers require.
  useEffect(() => {
    const unlock = () => {
      armHaptics();
      sound.unlock();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('button')) return;
      armHaptics();
      sound.play('ui');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const finishOnboarding = () => {
    markOnboarded();
    sound.unlock();
    setOnboarding(false);
  };

  const boss = kind === 'boss';

  // Daily/weekly content hides behind MENU, so the tab carries a dot while
  // there is a rift to run or a cache to claim.
  const riftReady = rift.unlocked && !rift.active && !rift.todayDone;
  const eventReady =
    event.unlocked && event.active && !event.claimed && event.bosses >= event.goal;
  const alerts: ScreenId[] = riftReady || eventReady ? ['menu'] : [];

  // Modals (and the first-run tour) freeze the page behind them for pointers,
  // focus, and screen readers. Item detail is part of the page, not a modal.
  const modalLayer = onboarding || (overlay !== null && overlay.kind !== 'item');

  const openBattle = () => go(NAV_ROOT);

  const changeScreen = (next: ScreenId) => {
    if (next === 'gear' || next === 'menu' || next === screen) {
      setScreenNonce((value) => value + 1);
    }
    go({ screen: next, page: null, overlay: null });
  };

  const openOverlay = (next: Overlay) => go({ ...nav, overlay: next });
  const closeOverlay = () => go({ ...nav, overlay: null });

  // Overlays are history layers: back closes them. When one is popped, whatever
  // data it was showing has to be dismissed too, or it would pop right back up.
  // The item view is a page, so it listens for Escape itself.
  useEffect(() => {
    if (overlay?.kind !== 'item') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOverlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, nav]);

  const prevOverlayRef = useRef<Overlay | null>(overlay);
  useEffect(() => {
    const prev = prevOverlayRef.current;
    prevOverlayRef.current = overlay;

    const dismiss = (kind: Overlay['kind']) => {
      if (kind === 'forecast') setForecast(null);
      else if (kind === 'offline') claimOffline();
      else if (kind === 'rift') closeRiftResult();
      else if (kind === 'duel') closeDuelResult();
      else if (kind === 'trial') closeTrialResult();
      else if (kind === 'dungeon') closeDungeonResult();
    };

    if (prev && !overlay) {
      dismiss(prev.kind);
      // The closed source is stale in this render; surface any other one.
      if (prev.kind !== 'rift' && riftResult) openOverlay({ kind: 'rift' });
      else if (prev.kind !== 'duel' && duelResult) openOverlay({ kind: 'duel' });
      else if (prev.kind !== 'trial' && trialResult) openOverlay({ kind: 'trial' });
      else if (prev.kind !== 'dungeon' && dungeonResult) openOverlay({ kind: 'dungeon' });
      else if (prev.kind !== 'offline' && offlineReport) openOverlay({ kind: 'offline' });
      return;
    }
    if (overlay) return;

    // Nothing on top: surface a result or report that arrived while browsing.
    if (riftResult) openOverlay({ kind: 'rift' });
    else if (duelResult) openOverlay({ kind: 'duel' });
    else if (trialResult) openOverlay({ kind: 'trial' });
    else if (dungeonResult) openOverlay({ kind: 'dungeon' });
    else if (offlineReport) openOverlay({ kind: 'offline' });
  }, [overlay, riftResult, duelResult, trialResult, dungeonResult, offlineReport, nav]);

  return (
    <div className="app">
      <div className="canvas-layer">
        <Suspense fallback={<div className="canvas-pending" aria-hidden="true" />}>
          <PhaserGame />
        </Suspense>
      </div>

      <div className={`danger-veil${lowHp ? ' on' : ''}`} aria-hidden="true" />

      <div className="hud" inert={modalLayer}>
        <header className="topbar">
          <div className="stage-block">
            <span className="eyebrow">STAGE</span>
            <span className="stage-value">
              {stage}
              <small>
                WAVE {wave}/{10}
              </small>
            </span>
          </div>

          <div className="top-right">
            <span
              className={`auto-pill ${
                arena.duelActive
                  ? 'duel'
                  : trial.active || rift.active
                    ? 'rift'
                    : pushing || !canPush
                      ? ''
                      : 'farming'
              }`}
            >
              <i />
              {arena.duelActive
                ? 'DUEL'
                : trial.active
                  ? 'TRIAL'
                  : dungeon.active
                    ? 'DUNGEON'
                    : rift.active
                      ? 'RIFT'
                      : pushing || !canPush
                        ? 'AUTO'
                        : 'FARM'}
            </span>
            {outfit && outfitTier && (
              <span
                className="outfit-chip"
                style={{ borderColor: outfitTier.color, color: outfitTier.color }}
                title={outfit.name}
                aria-label={`Costume: ${outfit.name}`}
              >
                {outfitTier.label.toUpperCase()}
              </span>
            )}
            <span className="gold-chip">
              <span className="diamond">◆</span>
              {fmt(gold)}
            </span>
          </div>
        </header>

        <div className="levelbar">
          <span className="level-tag">LV {level}</span>
          <div className="track exp">
            <span style={{ width: `${pct(exp, expToNext)}%` }} />
          </div>
          <span className="exp-text">
            {fmt(exp)}/{fmt(expToNext)}
          </span>
        </div>

        <div className="battle-center">
          {boss && !dead && <div className="boss-pill">BOSS · {enemyName}</div>}
          {dead && (
            <div className="dead-veil">
              <strong>DEFEATED</strong>
              <span>Recovering…</span>
            </div>
          )}
        </div>

        <footer className="panel">
          <div className="combat-line">
            <span className={`badge ${arena.duelActive ? 'rival' : kind}`}>
              {arena.duelActive ? 'RIVAL' : kind}
            </span>
            <span className="combat-name">{enemyName}</span>
            <span className="elem-tag" style={{ color: ELEMENT_COLOR[enemyElement] }}>
              {ELEMENT_SHORT[enemyElement]}
            </span>
            <span className="combat-numbers">
              {fmt(enemyHp)} / {fmt(enemyMaxHp)}
            </span>
          </div>
          <div className={`track hp enemy ${boss ? 'boss' : ''}`}>
            <span style={{ width: `${pct(enemyHp, enemyMaxHp)}%` }} />
          </div>

          <div className="combat-line hero">
            <span className="badge hero-badge">YOU</span>
            <span className="combat-name" style={{ color: leader.color }}>
              {leader.name}
            </span>
            {shield > 0 && <span className="shield-chip">+{fmt(shield)}</span>}
            <span className="combat-numbers">
              {fmt(heroHp)} / {fmt(heroMaxHp)}
            </span>
          </div>
          <div className="track hp hero">
            <span style={{ width: `${pct(heroHp, heroMaxHp)}%` }} />
          </div>

          {roster && (
            <div className="party-strip" aria-label="Party health">
              {roster.map((member) => (
                <div
                  key={member.id}
                  className={`party-pip${member.active ? ' active' : ''}${
                    member.down ? ' down' : ''
                  }`}
                  title={`${member.name} · ${member.element}`}
                >
                  <span className="party-pip-name" style={{ color: member.color }}>
                    {member.name}
                  </span>
                  <span className="track hp pip">
                    <span
                      style={{
                        width: `${pct(member.hp, member.maxHp)}%`,
                        background: member.down ? undefined : member.color,
                      }}
                    />
                  </span>
                  <span className="party-pip-hp">
                    {member.down ? 'DOWN' : `${fmt(member.hp)}/${fmt(member.maxHp)}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {arena.duelActive ? (
            <div className="duel-row">
              <div className="rift-copy">
                <span className="duel-label">ARENA · {arena.tier.toUpperCase()}</span>
                <span className="rift-score">
                  {arena.points} PTS · {arena.tickets}/{arena.maxTickets} TICKETS
                </span>
              </div>
              <span className="duel-clock">LIVE</span>
            </div>
          ) : trial.active && trial.next ? (
            <div className="rift-row trial-row">
              <div className="rift-copy">
                <span className="rift-label trial-label">
                  TRIAL · FLOOR {trial.floor}/{trial.maxFloor}
                </span>
                <span className="rift-score">
                  {trial.next.name} · {trial.next.rules.map((rule) => rule.label).join(' + ')}
                </span>
              </div>
              <span className="duel-clock">LIVE</span>
            </div>
          ) : dungeon.active ? (
            <div className="rift-row dungeon-row">
              <div className="rift-copy">
                <span className="rift-label">
                  DUNGEON · {runningTier?.name?.toUpperCase() ?? 'RUN'}
                </span>
                <span className="rift-score">
                  WAVE {dungeon.wave}/{dungeon.waves} ·{' '}
                  {dungeon.wave >= dungeon.waves ? 'BOSS' : 'HUNT'}
                </span>
              </div>
              <span className="duel-clock">LIVE</span>
            </div>
          ) : rift.active ? (
            <div className="rift-row">
              <div className="rift-copy">
                <span className="rift-label">
                  RIFT · {rift.modifiers.map((modifier) => modifier.label).join(' + ')}
                </span>
                <span className="rift-score">{rift.kills} KILLS</span>
              </div>
              <span className="rift-clock">{rift.remaining}s</span>
            </div>
          ) : (
            <div className="push-row">
              <div className="push-copy">
                <span className="push-label">
                  {pushing                        ? `PUSH · STAGE ${stage}`
                    : canPush
                      ? `FARM · STAGE ${stage}`
                      : `STAGE ${stage} · NEXT BOSS`}
                </span>
                <span className={`push-target ${target.ready ? 'ready' : ''}`}>
                  {target.ready
                    ? `${target.name} in reach`
                    : `${target.name} · +${target.gapPct}% DPS`}
                </span>
              </div>
              <button
                type="button"
                className="plan-btn"
                onClick={() => {
                  setForecast(forecastBoss());
                  openOverlay({ kind: 'forecast' });
                }}
                disabled={dead}
                aria-label="Forecast next boss"
              >
                PLAN
              </button>
              {pushing ? (
                <span className="push-falls">
                  {deathsHere}/{deathsToRetreat} FALLS
                </span>
              ) : canPush ? (
                <button type="button" className="push-btn" onClick={push} disabled={dead}>
                  PUSH
                </button>
              ) : null}
            </div>
          )}
        </footer>

        <Dock active={screen} onChange={changeScreen} alerts={alerts} />
      </div>

      {screen !== 'battle' && (
        <div className="screen-layer" inert={modalLayer}>
          <Suspense fallback={<div className="screen screen-loading">Opening…</div>}>
            {screen === 'gear' && (
              <GearScreen
                key={`gear-${screenNonce}`}
                selectedId={overlay?.kind === 'item' ? overlay.id : null}
                onSelect={(id) => go({ ...nav, overlay: id ? { kind: 'item', id } : null })}
              />
            )}
            {screen === 'forge' && <ForgeScreen />}
            {screen === 'arena' && <ArenaScreen onEnter={openBattle} />}
            {screen === 'menu' && (
              <MenuScreen
                key={`menu-${screenNonce}`}
                page={page}
                onPage={(next) => go({ screen: 'menu', page: next, overlay: null })}
                onEnterBattle={openBattle}
              />
            )}
          </Suspense>
        </div>
      )}

      {overlay?.kind === 'forecast' && forecast && (
        <ForecastPanel
          report={forecast}
          onClose={() => {
            setForecast(null);
            closeOverlay();
          }}
        />
      )}
      {overlay?.kind === 'offline' && offlineReport && (
        <ExpeditionReport
          report={offlineReport}
          onClaim={() => {
            claimOffline();
            closeOverlay();
          }}
        />
      )}
      {overlay?.kind === 'rift' && riftResult && (
        <RiftResultModal
          result={riftResult}
          onClose={() => {
            closeRiftResult();
            closeOverlay();
          }}
        />
      )}
      {overlay?.kind === 'trial' && trialResult && (
        <Suspense fallback={null}>
          <TrialResultModal
            result={trialResult}
            onClose={() => {
              closeTrialResult();
              closeOverlay();
            }}
          />
        </Suspense>
      )}
      {overlay?.kind === 'dungeon' && dungeonResult && (
        <Suspense fallback={null}>
          <DungeonResultModal
            result={dungeonResult}
            onClose={() => {
              closeDungeonResult();
              closeOverlay();
            }}
          />
        </Suspense>
      )}
      {overlay?.kind === 'duel' && duelResult && (
        <Suspense fallback={null}>
          <ArenaResultModal
            result={duelResult}
            onClose={() => {
              closeDuelResult();
              closeOverlay();
            }}
          />
        </Suspense>
      )}
      {onboarding && <Onboarding onDone={finishOnboarding} />}
      <CheatPanel />
    </div>
  );
}
