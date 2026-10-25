import type { Element } from '../sim/types';

export type SkillType = 'active' | 'passive';
export type SkillKind = 'damage' | 'drain' | 'heal' | 'shield' | 'buff';
export type PassiveStat = 'atk' | 'hp' | 'speed';

export interface SkillInfo {
  id: string;
  name: string;
  type: SkillType;
  kind: SkillKind;
  element?: Element;
  cooldown?: number;
  multiplier?: number;
  healPct?: number;
  drainPct?: number;
  shieldPct?: number;
  buffPct?: number;
  duration?: number;
  slowPct?: number;
  stat?: PassiveStat;
  statPct?: number;
  desc: string;
  color: string;
}

/** Pockie Ninja builds list six skills; six slots keep that breadth while
 * the global cast gate stops extra slots from doubling skill throughput. */
export const MAX_ACTIVE_SKILLS = 6;
/** Minimum seconds between any two casts, regardless of per-skill cooldowns. */
export const SKILL_GLOBAL_COOLDOWN = 2;
export const SKILL_MAX_LEVEL = 10;
export const SKILL_LEVEL_BONUS = 0.08;

export const SKILLS: SkillInfo[] = [
  {
    id: 'heavy-strike',
    name: 'Heavy Strike',
    type: 'active',
    kind: 'damage',
    multiplier: 2,
    cooldown: 6,
    desc: '200% ATK damage',
    color: '#16295c',
  },
  {
    id: 'ember-burst',
    name: 'Ember Burst',
    type: 'active',
    kind: 'damage',
    element: 'fire',
    multiplier: 1.5,
    cooldown: 7,
    desc: '150% ATK fire damage',
    color: '#b0362a',
  },
  {
    id: 'frost-lance',
    name: 'Frost Lance',
    type: 'active',
    kind: 'damage',
    element: 'ice',
    multiplier: 1.3,
    cooldown: 6,
    duration: 4,
    slowPct: 0.3,
    desc: '130% ATK ice damage · slows the enemy for 4s',
    color: '#1f5aa6',
  },
  {
    id: 'thunder-chain',
    name: 'Thunder Chain',
    type: 'active',
    kind: 'damage',
    element: 'lightning',
    multiplier: 1.7,
    cooldown: 8,
    desc: '170% ATK lightning damage',
    color: '#96700f',
  },
  {
    id: 'umbral-rend',
    name: 'Umbral Rend',
    type: 'active',
    kind: 'drain',
    element: 'dark',
    multiplier: 1.4,
    drainPct: 0.3,
    cooldown: 9,
    desc: '140% ATK dark damage · heal 30% of it',
    color: '#3a2a52',
  },
  {
    id: 'holy-mend',
    name: 'Holy Mend',
    type: 'active',
    kind: 'heal',
    healPct: 0.15,
    cooldown: 12,
    desc: 'Heal 15% max HP',
    color: '#565a1c',
  },
  {
    id: 'aegis',
    name: 'Aegis',
    type: 'active',
    kind: 'shield',
    shieldPct: 0.2,
    duration: 8,
    cooldown: 15,
    desc: 'Shield for 20% max HP, 8s',
    color: '#5b6379',
  },
  {
    id: 'frenzy',
    name: 'Frenzy',
    type: 'active',
    kind: 'buff',
    buffPct: 0.3,
    duration: 6,
    cooldown: 14,
    desc: '+30% ATK for 6s',
    color: '#b0362a',
  },
  {
    id: 'keen-edge',
    name: 'Keen Edge',
    type: 'passive',
    kind: 'buff',
    stat: 'atk',
    statPct: 0.08,
    desc: '+8% ATK',
    color: '#b0362a',
  },
  {
    id: 'vitality',
    name: 'Vitality',
    type: 'passive',
    kind: 'buff',
    stat: 'hp',
    statPct: 0.1,
    desc: '+10% max HP',
    color: '#16295c',
  },
  {
    id: 'swiftness',
    name: 'Swiftness',
    type: 'passive',
    kind: 'buff',
    stat: 'speed',
    statPct: 0.06,
    desc: '+6% ATK SPD',
    color: '#1f5aa6',
  },
];

const BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]));

export function skillById(id: string | null | undefined): SkillInfo | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}

export function activeSkills(): SkillInfo[] {
  return SKILLS.filter((skill) => skill.type === 'active');
}

export function passiveSkills(): SkillInfo[] {
  return SKILLS.filter((skill) => skill.type === 'passive');
}

export function skillScale(level: number): number {
  return 1 + SKILL_LEVEL_BONUS * (Math.max(1, Math.min(SKILL_MAX_LEVEL, level)) - 1);
}

export function skillUpgradeCost(level: number): number {
  return Math.max(1, Math.min(SKILL_MAX_LEVEL, level));
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;

export function skillEffectText(skill: SkillInfo, level: number): string {
  const scale = skillScale(level);
  switch (skill.kind) {
    case 'damage': {
      const element = skill.element ? ` ${skill.element}` : '';
      const slow = skill.slowPct ? ` · slow ${percent(skill.slowPct * scale)}` : '';
      return `${percent((skill.multiplier ?? 1) * scale)} ATK${element} damage${slow}`;
    }
    case 'drain': {
      const element = skill.element ? ` ${skill.element}` : '';
      return `${percent((skill.multiplier ?? 1) * scale)} ATK${element} damage · heal ${percent(
        (skill.drainPct ?? 0) * scale,
      )} of it`;
    }
    case 'heal':
      return `Heal ${percent((skill.healPct ?? 0) * scale)} max HP`;
    case 'shield':
      return `Shield ${percent((skill.shieldPct ?? 0) * scale)} max HP · ${skill.duration ?? 8}s`;
    case 'buff':
      if (skill.type === 'passive') {
        return `${skill.desc} (total +${Math.round((skill.statPct ?? 0) * scale * 100)}%)`;
      }
      return `+${percent((skill.buffPct ?? 0) * scale)} ATK · ${skill.duration ?? 6}s`;
  }
}
