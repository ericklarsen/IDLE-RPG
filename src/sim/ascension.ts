import { ASCEND_NODES, ascendNodeById, ascendNodeCost } from '../data/ascension';
import { BALANCE } from '../data/balance';
import type { AscensionState } from './types';

export function emptyAscension(): AscensionState {
  return { count: 0, shards: 0, nodes: {} };
}

function clampInt(value: unknown, min: number, max: number): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

export function normalizeAscension(value?: Partial<AscensionState>): AscensionState {
  const nodes: Record<string, number> = {};
  if (value?.nodes && typeof value.nodes === 'object') {
    for (const node of ASCEND_NODES) {
      const raw = value.nodes[node.id];
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        nodes[node.id] = Math.max(0, Math.min(node.max, Math.floor(raw)));
      }
    }
  }

  return {
    count: clampInt(value?.count, 0, 9999),
    shards: clampInt(value?.shards, 0, 999_999),
    nodes,
  };
}

export interface AscendBonuses {
  atkPct: number;
  hpPct: number;
  goldPct: number;
  dropChance: number;
  startStage: number;
  offlineCapSeconds: number;
}

export function ascendBonuses(nodes: Record<string, number>): AscendBonuses {
  const rank = (id: string): number => nodes[id] ?? 0;

  return {
    atkPct: rank('might') * BALANCE.ascendMightAtk,
    hpPct: rank('vigor') * BALANCE.ascendVigorHp,
    goldPct: rank('prosperity') * BALANCE.ascendProsperityGold,
    dropChance: rank('scavenger') * BALANCE.ascendScavengerDrop,
    startStage: 1 + rank('head-start') * BALANCE.ascendStartStageStep,
    offlineCapSeconds:
      BALANCE.offlineCapSeconds +
      rank('long-haul') * BALANCE.ascendOfflineHoursPerRank * 3600,
  };
}

export interface NodeBuyResult {
  ok: boolean;
  cost: number;
  level: number;
  reason?: 'missing' | 'shards' | 'max';
}

export function nodeCost(nodeId: string, nodes: Record<string, number>): number {
  const info = ascendNodeById(nodeId);
  if (!info) return 0;
  return ascendNodeCost(nodes[nodeId] ?? 0);
}
