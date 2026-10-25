import { describe, expect, it } from 'vitest';
import { NAV_ROOT, navDepth, sameNav } from './nav';

describe('navDepth', () => {
  it('treats the battle HUD as the base entry', () => {
    expect(navDepth(NAV_ROOT)).toBe(0);
  });

  it('puts dock pages one step in and MENU pages two', () => {
    expect(navDepth({ screen: 'gear', page: null, overlay: null })).toBe(1);
    expect(navDepth({ screen: 'menu', page: null, overlay: null })).toBe(1);
    expect(navDepth({ screen: 'menu', page: 'rift', overlay: null })).toBe(2);
  });

  it('counts an overlay as one more step', () => {
    expect(navDepth({ screen: 'battle', page: null, overlay: { kind: 'forecast' } })).toBe(1);
    expect(
      navDepth({ screen: 'gear', page: null, overlay: { kind: 'item', id: 'it_1' } }),
    ).toBe(2);
    expect(navDepth({ screen: 'menu', page: 'rift', overlay: { kind: 'rift' } })).toBe(3);
  });
});

describe('sameNav', () => {
  it('compares the screen, the open MENU page, and the overlay', () => {
    expect(sameNav(NAV_ROOT, { screen: 'battle', page: null, overlay: null })).toBe(true);
    expect(
      sameNav({ screen: 'menu', page: null, overlay: null }, {
        screen: 'menu',
        page: 'rift',
        overlay: null,
      }),
    ).toBe(false);
    expect(
      sameNav({ screen: 'gear', page: null, overlay: null }, {
        screen: 'forge',
        page: null,
        overlay: null,
      }),
    ).toBe(false);
  });

  it('tells item overlays apart by id', () => {
    expect(
      sameNav(
        { screen: 'gear', page: null, overlay: { kind: 'item', id: 'it_1' } },
        { screen: 'gear', page: null, overlay: { kind: 'item', id: 'it_2' } },
      ),
    ).toBe(false);
    expect(
      sameNav(
        { screen: 'gear', page: null, overlay: { kind: 'item', id: 'it_1' } },
        { screen: 'gear', page: null, overlay: { kind: 'item', id: 'it_1' } },
      ),
    ).toBe(true);
  });

  it('treats an open overlay as a different view', () => {
    expect(
      sameNav(NAV_ROOT, { screen: 'battle', page: null, overlay: { kind: 'forecast' } }),
    ).toBe(false);
  });
});
