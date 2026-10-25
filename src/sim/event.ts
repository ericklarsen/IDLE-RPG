import type { EventState } from './types';

export const EVENT_UNLOCK_STAGE = 10;
export const EVENT_GOAL = 5;
export const EVENT_SET = 'emberforged';

export interface EventWindow {
  /** Friday date of the current cycle, e.g. "2026-10-23". */
  key: string;
  active: boolean;
  startsAt: number;
  endsAt: number;
}

const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Emberfall runs Friday 00:00 through Sunday 23:59 local time.
 * Monday–Thursday belong to the coming weekend, so the key always names the Friday.
 */
export function eventWindow(now = new Date()): EventWindow {
  const today = startOfDay(now);
  const day = today.getDay();
  const friday = new Date(today);

  if (day === 0 || day >= 5) {
    // Mid-event: step back to the Friday that started this cycle.
    friday.setDate(today.getDate() - (day === 0 ? 2 : day - 5));
  } else {
    // Monday–Thursday points at the weekend that has not started yet.
    friday.setDate(today.getDate() + ((5 - day + 7) % 7));
  }

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  const startsAt = friday.getTime();
  const endsAt = sunday.getTime();
  return {
    key: dateKey(friday),
    active: now.getTime() >= startsAt && now.getTime() <= endsAt,
    startsAt,
    endsAt,
  };
}

export function nextEventStart(now = new Date()): number {
  const window = eventWindow(now);
  if (window.active) return window.startsAt;

  const today = startOfDay(now);
  const untilFriday = (5 - today.getDay() + 7) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() + untilFriday);
  return start.getTime();
}

export function normalizeEvent(raw?: Partial<EventState> | null): EventState {
  const bosses = Number(raw?.bosses);
  return {
    key: typeof raw?.key === 'string' ? raw.key.slice(0, 10) : '',
    bosses: Number.isFinite(bosses) ? Math.max(0, Math.floor(bosses)) : 0,
    claimed: raw?.claimed === true,
  };
}

/** Milliseconds → "2d 4h" / "5h 12m" / "8m" for the event countdown. */
export function eventCountdown(ms: number): string {
  const safe = Math.max(0, ms);
  const days = Math.floor(safe / DAY_MS);
  const hours = Math.floor((safe % DAY_MS) / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
