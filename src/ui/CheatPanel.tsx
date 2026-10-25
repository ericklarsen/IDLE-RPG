import { useEffect, useState } from 'react';
import { useGameStore } from '../state/store';

/**
 * A floating test panel. It only exists in dev builds, or in any build opened
 * with `?cheats=1`, so it can never be reached by a normal player.
 *
 * Grants are written straight to the save: the point is to reach a build state
 * (a maxed wing, a dungeon tier) in one tap instead of farming for it.
 */
const ENABLED =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('cheats'));

export default function CheatPanel() {
  const [open, setOpen] = useState(false);
  const mounts = useGameStore((state) => state.mounts);
  const wings = useGameStore((state) => state.wings);
  const cheatGrantMount = useGameStore((state) => state.cheatGrantMount);
  const cheatGrantWing = useGameStore((state) => state.cheatGrantWing);
  const cheatGrantResources = useGameStore((state) => state.cheatGrantResources);
  const cheatAddTickets = useGameStore((state) => state.cheatAddTickets);
  const cheatUnlockStage = useGameStore((state) => state.cheatUnlockStage);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!ENABLED) return null;

  return (
    <div className="cheat">
      {open && (
        <section className="cheat-panel" aria-label="Cheat panel">
          <header className="cheat-head">
            <span>CHEATS · TEST ONLY</span>
            <button
              type="button"
              className="cheat-close"
              onClick={() => setOpen(false)}
              aria-label="Close cheat panel"
            >
              ×
            </button>
          </header>

          <p className="cheat-note">
            Grants skip drops and costs, and are written to this browser's save. Dev builds only
            (or `?cheats=1`).
          </p>

          <div className="cheat-actions">
            <button type="button" onClick={() => cheatGrantResources({ gold: 1_000_000 })}>
              +1M GOLD
            </button>
            <button type="button" onClick={() => cheatGrantResources({ crystals: 100 })}>
              +100 ◈
            </button>
            <button
              type="button"
              onClick={() => cheatGrantResources({ dust: 500, books: 50, cores: 20 })}
            >
              +MATS
            </button>
            <button type="button" onClick={cheatAddTickets}>
              +5 TICKETS
            </button>
            <button type="button" onClick={() => cheatUnlockStage(70)}>
              UNLOCK 70
            </button>
          </div>

          <div className="cheat-group">
            <span className="cheat-sub">STABLE</span>
            {mounts.mounts.map((mount) => (
              <div key={mount.id} className="cheat-row">
                <span className="cheat-name" style={{ color: mount.unlocked ? mount.color : undefined }}>
                  {mount.name}
                </span>
                {mount.unlocked ? (
                  <button
                    type="button"
                    className="cheat-btn"
                    onClick={() => cheatGrantMount(mount.id, mount.level + 1)}
                    disabled={mount.level >= mount.maxLevel}
                  >
                    {mount.level >= mount.maxLevel ? 'MAX' : `LV ${mount.level} +1`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cheat-btn give"
                    onClick={() => cheatGrantMount(mount.id)}
                  >
                    GIVE
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="cheat-group">
            <span className="cheat-sub">WINGS · ◈{mounts.crystals}</span>
            {wings.wings.map((wing) => (
              <div key={wing.id} className="cheat-row">
                <span className="cheat-name" style={{ color: wing.unlocked ? wing.color : undefined }}>
                  {wing.name}
                </span>
                {wing.unlocked ? (
                  <button
                    type="button"
                    className="cheat-btn"
                    onClick={() => cheatGrantWing(wing.id, wing.level + 1)}
                    disabled={wing.level >= wing.maxLevel}
                  >
                    {wing.level >= wing.maxLevel ? 'MAX' : `LV ${wing.level} +1`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cheat-btn give"
                    onClick={() => cheatGrantWing(wing.id)}
                  >
                    GIVE
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        className={`cheat-toggle${open ? ' on' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Cheat panel"
      >
        {open ? 'CLOSE' : 'DEV'}
      </button>
    </div>
  );
}
