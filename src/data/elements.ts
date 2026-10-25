import type { Element } from '../sim/types';

export const ELEMENTS: Element[] = ['fire', 'ice', 'lightning', 'holy', 'dark'];

export const ELEMENT_LABEL: Record<Element, string> = {
  fire: 'Fire',
  ice: 'Ice',
  lightning: 'Lightning',
  holy: 'Holy',
  dark: 'Dark',
};

export const ELEMENT_SHORT: Record<Element, string> = {
  fire: 'FIRE',
  ice: 'ICE',
  lightning: 'LIGHT',
  holy: 'HOLY',
  dark: 'DARK',
};

export const ELEMENT_COLOR: Record<Element, string> = {
  fire: '#b0362a',
  ice: '#1f5aa6',
  lightning: '#a97a06',
  holy: '#565a1c',
  dark: '#3a2a52',
};

/** fire → ice → lightning → holy → dark → fire */
export const ELEMENT_BEATS: Record<Element, Element> = {
  fire: 'ice',
  ice: 'lightning',
  lightning: 'holy',
  holy: 'dark',
  dark: 'fire',
};

export const ELEMENT_STRONG_MULT = 1.25;
export const ELEMENT_WEAK_MULT = 0.85;

export function elementMultiplier(attacker: Element | null, defender: Element): number {
  if (!attacker) return 1;
  if (ELEMENT_BEATS[attacker] === defender) return ELEMENT_STRONG_MULT;
  if (ELEMENT_BEATS[defender] === attacker) return ELEMENT_WEAK_MULT;
  return 1;
}
