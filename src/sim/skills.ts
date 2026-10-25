import {
  MAX_ACTIVE_SKILLS,
  SKILL_MAX_LEVEL,
  SKILLS,
  skillById,
  skillScale,
} from '../data/skills';
import type { SkillLoadout } from './types';

export function defaultLoadout(): SkillLoadout {
  return {
    active: ['heavy-strike', 'holy-mend', null, null, null, null],
    passive: null,
    levels: Object.fromEntries(SKILLS.map((skill) => [skill.id, 1])),
  };
}

export function cloneLoadout(skills: SkillLoadout): SkillLoadout {
  return {
    active: [...skills.active],
    passive: skills.passive,
    levels: { ...skills.levels },
  };
}

export function normalizeSkills(value?: Partial<SkillLoadout>): SkillLoadout {
  const base = defaultLoadout();
  if (!value) return base;

  const active: (string | null)[] = Array.from({ length: MAX_ACTIVE_SKILLS }, (_, index) => {
    const id = Array.isArray(value.active) ? value.active[index] : null;
    return typeof id === 'string' && skillById(id)?.type === 'active' ? id : null;
  });

  const passiveId = typeof value.passive === 'string' ? value.passive : null;
  const passive = skillById(passiveId)?.type === 'passive' ? passiveId : null;

  const levels = { ...base.levels };
  if (value.levels && typeof value.levels === 'object') {
    for (const skill of SKILLS) {
      const raw = value.levels[skill.id];
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        levels[skill.id] = Math.max(1, Math.min(SKILL_MAX_LEVEL, Math.floor(raw)));
      }
    }
  }

  return { active, passive, levels };
}

export interface PassiveBonuses {
  atkPct: number;
  hpPct: number;
  speedPct: number;
}

export function passiveBonuses(skills: SkillLoadout): PassiveBonuses {
  const info = skillById(skills.passive);
  if (!info) return { atkPct: 0, hpPct: 0, speedPct: 0 };

  const value = (info.statPct ?? 0) * skillScale(skills.levels[info.id] ?? 1);
  return {
    atkPct: info.stat === 'atk' ? value : 0,
    hpPct: info.stat === 'hp' ? value : 0,
    speedPct: info.stat === 'speed' ? value : 0,
  };
}
