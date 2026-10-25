let armed = false;

// Chrome only allows vibration after a gesture and logs an error for blocked calls.
export function armHaptics(): void {
  armed = true;
}

export function buzz(pattern: number | number[]): void {
  if (!armed || typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;

  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation;
  if (activation && !activation.hasBeenActive) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration is optional and unsupported on most desktop browsers.
  }
}
