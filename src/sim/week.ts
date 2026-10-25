const DAY_MS = 86_400_000;

/**
 * Shared weekly calendar.
 *
 * Several systems turn over on Monday 00:00 local time (league season, trial
 * tower). Keeping the week math in one place means they can never disagree
 * about which week the player is in.
 */
function mondayOf(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function weekKey(date = new Date()): string {
  const monday = mondayOf(date);
  const year = monday.getFullYear();
  const month = `${monday.getMonth() + 1}`.padStart(2, '0');
  const day = `${monday.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function weekEndsAt(now = new Date()): number {
  const start = mondayOf(now);
  start.setDate(start.getDate() + 7);
  return start.getTime();
}

/** Milliseconds → "2d 4h" / "5h 12m" / "8m" for weekly countdowns. */
export function timeLeft(endsAt: number, now = Date.now()): string {
  const left = Math.max(0, endsAt - now);
  const days = Math.floor(left / DAY_MS);
  const hours = Math.floor((left % DAY_MS) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
