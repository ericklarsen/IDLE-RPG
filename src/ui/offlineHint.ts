import { BOOST_BRANCHES, BOOST_ORDER, boostCost } from '../data/boost';
import { SLOTS } from '../data/items';
import { SKILL_MAX_LEVEL, skillById, skillUpgradeCost } from '../data/skills';
import type { OfflineReport } from '../sim/offline';
import type { Boosts, Equipped, SkillLoadout } from '../sim/types';
import { enhanceChanceFor, enhanceCostFor, runeCostFor } from '../sim/upgrade';
import { fmt } from './format';

export interface HintState {
  gold: number;
  cores: number;
  books: number;
  essence: number;
  farmStage: number;
  equipped: Equipped;
  boosts: Boosts;
  skills: SkillLoadout;
}

/**
 * PLAN §7.3 asks the report to say what is upgradeable now.
 * Resources are the current pile plus everything the claim would add.
 */
export function offlineHints(state: HintState, report: OfflineReport): string[] {
  const gold = state.gold + report.gold + report.salvageGold;
  const cores = state.cores + report.cores;
  const books = state.books + report.books;
  const essence = state.essence + report.essence;
  const hints: string[] = [];

  const weapon = state.equipped.weapon;
  if (weapon) {
    const cost = enhanceCostFor(weapon);
    if (enhanceChanceFor(weapon) > 0 && gold >= cost) {
      hints.push(`ENHANCE WEAPON +${weapon.enhance} → +${weapon.enhance + 1} · ◆${fmt(cost)}`);
    }
  }

  for (const branch of BOOST_ORDER) {
    const level = state.boosts[branch];
    const cost = boostCost(level);
    if (cores >= cost) {
      hints.push(`BOOST ${BOOST_BRANCHES[branch].label.toUpperCase()} RANK ${level + 1} · ◇${cost}`);
      break;
    }
  }

  const loadout = [...state.skills.active, state.skills.passive].filter(
    (id): id is string => Boolean(id),
  );
  for (const id of loadout) {
    const level = state.skills.levels[id] ?? 1;
    if (level >= SKILL_MAX_LEVEL) continue;
    const skill = skillById(id);
    if (!skill) continue;
    const cost = skillUpgradeCost(level);
    if (books >= cost) {
      hints.push(`SKILL ${skill.name.toUpperCase()} LV ${level + 1} · ▤${cost}`);
      break;
    }
  }

  for (const slot of SLOTS) {
    const item = state.equipped[slot];
    if (!item) continue;
    const cost = runeCostFor(item);
    if (essence >= cost) {
      hints.push(`SOCKET RUNE · ${item.name.toUpperCase()} · ✦${cost}`);
      break;
    }
  }

  if (hints.length === 0) {
    hints.push(`FARM STAGE ${state.farmStage} · no affordable upgrade yet`);
  }

  return hints.slice(0, 2);
}
