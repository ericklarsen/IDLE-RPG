const SETTINGS_KEY = 'idle-forge-settings-v1';
const ONBOARDED_KEY = 'idle-forge-onboarded-v1';

export interface Settings {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  musicVolume: 0.7,
  sfxVolume: 1,
  reducedMotion: prefersReducedMotion(),
};

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or quota exceeded: preferences just do not persist.
  }
}

function volumeOr(value: unknown, fallback: number): number {
  return typeof value === 'number' ? clampVolume(value) : fallback;
}

export function loadSettings(): Settings {
  const raw = read(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      muted: parsed.muted === true,
      musicVolume: volumeOr(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
      sfxVolume: volumeOr(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
      reducedMotion:
        typeof parsed.reducedMotion === 'boolean'
          ? parsed.reducedMotion
          : DEFAULT_SETTINGS.reducedMotion,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  write(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function isOnboarded(): boolean {
  return read(ONBOARDED_KEY) === '1';
}

export function markOnboarded(): void {
  write(ONBOARDED_KEY, '1');
}
