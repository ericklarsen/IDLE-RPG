export type AscendBranch = 'power' | 'fortune' | 'automation';
export type AscendNodeId =
  | 'might'
  | 'vigor'
  | 'prosperity'
  | 'scavenger'
  | 'head-start'
  | 'long-haul';

export interface AscendNodeInfo {
  id: AscendNodeId;
  branch: AscendBranch;
  label: string;
  effect: string;
  per: number;
  max: number;
  color: string;
}

export interface AscendBranchInfo {
  id: AscendBranch;
  label: string;
}

export const ASCEND_BRANCHES: AscendBranchInfo[] = [
  { id: 'power', label: 'Power' },
  { id: 'fortune', label: 'Fortune' },
  { id: 'automation', label: 'Automation' },
];

export const ASCEND_NODES: AscendNodeInfo[] = [
  {
    id: 'might',
    branch: 'power',
    label: 'Might',
    effect: '+8% ATK',
    per: 0.08,
    max: 10,
    color: '#b0362a',
  },
  {
    id: 'vigor',
    branch: 'power',
    label: 'Vigor',
    effect: '+8% max HP',
    per: 0.08,
    max: 10,
    color: '#16295c',
  },
  {
    id: 'prosperity',
    branch: 'fortune',
    label: 'Prosperity',
    effect: '+8% gold',
    per: 0.08,
    max: 10,
    color: '#96700f',
  },
  {
    id: 'scavenger',
    branch: 'fortune',
    label: 'Scavenger',
    effect: '+3% drop chance',
    per: 0.03,
    max: 5,
    color: '#3a2a52',
  },
  {
    id: 'head-start',
    branch: 'automation',
    label: 'Head Start',
    effect: 'start 2 stages higher',
    per: 2,
    max: 5,
    color: '#1f5aa6',
  },
  {
    id: 'long-haul',
    branch: 'automation',
    label: 'Long Haul',
    effect: '+2h offline cap',
    per: 2,
    max: 3,
    color: '#5b6379',
  },
];

const BY_ID = new Map(ASCEND_NODES.map((node) => [node.id, node]));

export function ascendNodeById(id: string | null | undefined): AscendNodeInfo | undefined {
  if (!id) return undefined;
  return BY_ID.get(id as AscendNodeId);
}

export function ascendNodeCost(level: number): number {
  return level + 1;
}

export function shardReward(maxStage: number): number {
  return Math.max(0, Math.floor(Math.pow(Math.max(0, maxStage) / 10, 1.6)));
}
