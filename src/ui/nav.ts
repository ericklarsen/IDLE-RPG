import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScreenId } from './Dock';

/** Pages hosted inside MENU; each one gets its own history entry. */
export type MenuPage =
  | 'rift'
  | 'party'
  | 'event'
  | 'mounts'
  | 'wings'
  | 'dungeon'
  | 'shop'
  | 'skills'
  | 'boosts'
  | 'ascend'
  | 'codex'
  | 'options'
  | 'save';

/** Layers drawn on top of a page. Back closes them before leaving the page. */
export type Overlay =
  | { kind: 'item'; id: string }
  | { kind: 'forecast' }
  | { kind: 'offline' }
  | { kind: 'rift' }
  | { kind: 'duel' }
  | { kind: 'trial' }
  | { kind: 'dungeon' };

export interface NavState {
  screen: ScreenId;
  page: MenuPage | null;
  overlay: Overlay | null;
}

export const NAV_ROOT: NavState = { screen: 'battle', page: null, overlay: null };

const SCREENS: ScreenId[] = ['battle', 'gear', 'forge', 'arena', 'menu'];
const OVERLAY_KINDS = ['forecast', 'offline', 'rift', 'duel', 'trial', 'dungeon'] as const;

/**
 * How deep a view sits: the battle HUD is the base entry, a dock page is one
 * step in, a MENU page is two, and an overlay adds one more on top. Depth
 * decides whether a navigation pushes, replaces, or steps back.
 */
export function navDepth(nav: NavState): number {
  const base = nav.screen === 'battle' ? 0 : nav.page ? 2 : 1;
  return base + (nav.overlay ? 1 : 0);
}

function sameOverlay(a: Overlay | null, b: Overlay | null): boolean {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  return a.kind !== 'item' || b.kind !== 'item' || a.id === b.id;
}

export function sameNav(a: NavState, b: NavState): boolean {
  return a.screen === b.screen && a.page === b.page && sameOverlay(a.overlay, b.overlay);
}

function restoreOverlay(raw: unknown): Overlay | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = (raw as { kind?: unknown }).kind;
  if (kind === 'item') {
    const id = (raw as { id?: unknown }).id;
    return typeof id === 'string' ? { kind: 'item', id } : null;
  }
  if (!OVERLAY_KINDS.includes(kind as (typeof OVERLAY_KINDS)[number])) return null;
  return { kind: kind as (typeof OVERLAY_KINDS)[number] };
}

function restore(state: unknown): NavState | null {
  if (!state || typeof state !== 'object') return null;
  const candidate = state as Partial<NavState>;
  if (!SCREENS.includes(candidate.screen as ScreenId)) return null;
  return {
    screen: candidate.screen as ScreenId,
    page: candidate.page ?? null,
    overlay: restoreOverlay(candidate.overlay),
  };
}

/**
 * Keeps the dock pages and overlays in sync with the browser history so the
 * system back gesture closes what is on screen instead of leaving the game.
 */
export function useNav() {
  const [nav, setNav] = useState<NavState>(NAV_ROOT);
  const navRef = useRef(nav);
  // Set while a history.go() is in flight, so its popstate knows the target.
  const pendingRef = useRef<NavState | null>(null);
  // Navigation requested during that window, replayed once the pop lands.
  const queuedRef = useRef<NavState | null>(null);

  const apply = useCallback((next: NavState) => {
    const prev = navRef.current;
    if (sameNav(prev, next)) return;

    const steps = navDepth(next) - navDepth(prev);
    if (steps > 0) {
      history.pushState(next, '');
    } else if (steps === 0) {
      // Switching between pages at the same level must not stack entries.
      history.replaceState(next, '');
    } else {
      pendingRef.current = next;
      history.go(steps);
    }

    navRef.current = next;
    setNav(next);
  }, []);

  const go = useCallback(
    (next: NavState) => {
      if (pendingRef.current) {
        queuedRef.current = next;
        return;
      }
      apply(next);
    },
    [apply],
  );

  useEffect(() => {
    history.replaceState(NAV_ROOT, '');
    const settle = (event: PopStateEvent) => {
      const target = pendingRef.current ?? restore(event.state) ?? NAV_ROOT;
      pendingRef.current = null;
      navRef.current = target;
      setNav(target);

      const queued = queuedRef.current;
      queuedRef.current = null;
      if (queued) apply(queued);
    };
    window.addEventListener('popstate', settle);
    return () => window.removeEventListener('popstate', settle);
  }, [apply]);

  return { nav, go };
}
