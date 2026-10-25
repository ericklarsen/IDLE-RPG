import type { Element, EnemyKind, SpriteKey } from '../sim/types';

interface EnemyTier {
  sprite: SpriteKey;
  names: string[];
  element: Element;
}

export const ENEMY_TIERS: EnemyTier[] = [
  { sprite: 'slime', names: ['Moss Slime', 'Bog Ooze', 'Green Blob'], element: 'ice' },
  { sprite: 'bat', names: ['Cave Bat', 'Dusk Wing', 'Blood Bat'], element: 'dark' },
  { sprite: 'skeleton', names: ['Bone Guard', 'Rattled Archer', 'Crypt Knight'], element: 'holy' },
  { sprite: 'goblin', names: ['Goblin Scrapper', 'Spear Goblin', 'Cave Runt'], element: 'fire' },
  { sprite: 'wraith', names: ['Pale Wraith', 'Soul Mote', 'Grave Shade'], element: 'lightning' },
];

export const BOSS_NAMES = [
  'The Hollow King',
  'Ember Warden',
  'Frost Colossus',
  'Bone Tyrant',
  'Void Herald',
];

export const BOSS_ELEMENTS: Element[] = ['dark', 'fire', 'ice', 'holy', 'lightning'];

export interface EnemyIdentity {
  name: string;
  sprite: SpriteKey;
  element: Element;
}

export function pickEnemy(stage: number, wave: number, kind: EnemyKind): EnemyIdentity {
  const tier = ENEMY_TIERS[(stage - 1) % ENEMY_TIERS.length];

  if (kind === 'boss') {
    return {
      name: BOSS_NAMES[(stage - 1) % BOSS_NAMES.length],
      sprite: 'demon',
      element: BOSS_ELEMENTS[(stage - 1) % BOSS_ELEMENTS.length],
    };
  }

  const baseName = tier.names[(wave - 1) % tier.names.length];
  return {
    name: kind === 'elite' ? `Elite ${baseName}` : baseName,
    sprite: tier.sprite,
    element: tier.element,
  };
}
