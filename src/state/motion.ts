import { loadSettings, saveSettings } from './settings';

// One source of truth for "less movement": CSS reads the root class, Phaser asks
// isMotionReduced() before shaking or zooming the camera.
let reduced = loadSettings().reducedMotion;

export function isMotionReduced(): boolean {
  return reduced;
}

export function setMotionReduced(value: boolean): void {
  reduced = value;
  saveSettings({ reducedMotion: value });
  applyMotionClass();
}

/** Paints the current preference onto <html>; call once before the first render. */
export function applyMotionClass(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('reduce-motion', reduced);
}
