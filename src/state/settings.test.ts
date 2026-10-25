import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  isOnboarded,
  loadSettings,
  markOnboarded,
  saveSettings,
} from './settings';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('settings', () => {
  it('defaults to sound on with separated music and SFX levels', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.muted).toBe(false);
    expect(DEFAULT_SETTINGS.musicVolume).toBe(0.7);
    expect(DEFAULT_SETTINGS.sfxVolume).toBe(1);
    expect(DEFAULT_SETTINGS.reducedMotion).toBe(false);
  });

  it('persists the motion preference and ignores non-boolean values', () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);

    saveSettings({ reducedMotion: true });
    expect(loadSettings().reducedMotion).toBe(true);

    vi.stubGlobal(
      'localStorage',
      fakeStorage({ 'idle-forge-settings-v1': '{"reducedMotion":"yes"}' }),
    );
    expect(loadSettings().reducedMotion).toBe(DEFAULT_SETTINGS.reducedMotion);
  });

  it('persists mute and merges with stored values', () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);

    const saved = saveSettings({ muted: true });
    expect(saved.muted).toBe(true);
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, muted: true });
    expect(JSON.parse(storage.getItem('idle-forge-settings-v1') ?? '{}')).toEqual({
      ...DEFAULT_SETTINGS,
      muted: true,
    });
  });

  it('persists music and SFX volumes independently', () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);

    saveSettings({ musicVolume: 0.25 });
    saveSettings({ sfxVolume: 0.5 });
    expect(loadSettings().musicVolume).toBe(0.25);
    expect(loadSettings().sfxVolume).toBe(0.5);
  });

  it('clamps stored volumes to 0–1 and falls back on junk', () => {
    vi.stubGlobal(
      'localStorage',
      fakeStorage({
        'idle-forge-settings-v1': '{"musicVolume":4,"sfxVolume":-2}',
      }),
    );
    expect(loadSettings().musicVolume).toBe(1);
    expect(loadSettings().sfxVolume).toBe(0);

    vi.stubGlobal(
      'localStorage',
      fakeStorage({ 'idle-forge-settings-v1': '{"musicVolume":"loud","sfxVolume":null}' }),
    );
    expect(loadSettings().musicVolume).toBe(DEFAULT_SETTINGS.musicVolume);
    expect(loadSettings().sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
  });

  it('ignores corrupted or non-boolean values', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'idle-forge-settings-v1': 'not json' }));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);

    vi.stubGlobal(
      'localStorage',
      fakeStorage({ 'idle-forge-settings-v1': '{"muted":"yes"}' }),
    );
    expect(loadSettings().muted).toBe(false);
  });

  it('survives storage that throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings({ muted: true })).not.toThrow();
    expect(isOnboarded()).toBe(false);
    expect(() => markOnboarded()).not.toThrow();
  });

  it('tracks the onboarding flag', () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);

    expect(isOnboarded()).toBe(false);
    markOnboarded();
    expect(isOnboarded()).toBe(true);
    expect(storage.getItem('idle-forge-onboarded-v1')).toBe('1');
  });
});
