import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

vi.stubGlobal('localStorage', new MemoryStorage());

const { gameController } = await import('./controller');
const { clearSave } = await import('./save');

function twoHoursLater(): void {
  vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
}

describe('offline handoff', () => {
  beforeEach(() => {
    clearSave();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hidden lalu visible menawarkan laporan dan klaim menambah gold', () => {
    const goldBefore = gameController.sim.gold;

    gameController.handleHidden();
    twoHoursLater();
    gameController.handleVisible();

    const report = gameController.getOfflineReport();
    expect(report).not.toBeNull();
    expect(report?.seconds).toBe(2 * 60 * 60);
    expect(report?.kills).toBeGreaterThan(0);

    gameController.claimOffline();
    expect(gameController.getOfflineReport()).toBeNull();
    expect(gameController.sim.gold).toBeGreaterThan(goldBefore);
  });

  it('gap singkat tidak memunculkan laporan', () => {
    gameController.handleHidden();
    vi.setSystemTime(Date.now() + 20_000);
    gameController.handleVisible();
    expect(gameController.getOfflineReport()).toBeNull();
  });

  it('klaim tanpa laporan tidak mengubah apa pun', () => {
    const gold = gameController.sim.gold;
    gameController.claimOffline();
    expect(gameController.sim.gold).toBe(gold);
  });
});
