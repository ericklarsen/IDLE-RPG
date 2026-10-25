import { useState } from 'react';
import {
  ASCEND_BRANCHES,
  ASCEND_NODES,
  ascendNodeById,
  ascendNodeCost,
  shardReward,
} from '../data/ascension';
import { BALANCE } from '../data/balance';
import { useGameStore } from '../state/store';
import { fmt } from './format';

function totalLabel(nodeId: string, level: number): string {
  if (nodeId === 'head-start') return `start at stage ${1 + 2 * level}`;
  if (nodeId === 'long-haul') return `${8 + 2 * level}h offline cap`;
  if (nodeId === 'scavenger') return `+${level * 3}% drop chance`;
  return `+${level * 8}%`;
}

export default function AscendPanel() {
  const maxStage = useGameStore((state) => state.maxStage);
  const shards = useGameStore((state) => state.shards);
  const ascensions = useGameStore((state) => state.ascensions);
  const nodes = useGameStore((state) => state.ascendNodes);
  const ascend = useGameStore((state) => state.ascend);
  const buyAscendNode = useGameStore((state) => state.buyAscendNode);
  const [confirming, setConfirming] = useState(false);

  const eligible = maxStage >= BALANCE.ascendStage;
  const reward = shardReward(maxStage);

  if (confirming) {
    return (
      <div className="ascend-confirm">
        <span className="eyebrow">ASCEND NOW?</span>
        <h3>Start a new run</h3>
        <p className="detail-note">
          This resets level, gold, stage, gear, Boost ranks, essence, cores, books, and skill
          levels. Ascension nodes, Star Shards, and your skill loadout are kept.
        </p>
        <ul className="ascend-warning">
          <li>Reset: level, gold, stage, inventory, Boost, currency, skill levels</li>
          <li>Kept: {ascensions} previous ascension(s), {shards} shards, node tree</li>
          <li>
            Reward: <b>✧{reward} Star Shards</b> · next run starts at stage{' '}
            <b>{1 + 2 * (nodes['head-start'] ?? 0)}</b>
          </li>
        </ul>
        <div className="detail-actions">
          <button
            type="button"
            onClick={() => {
              ascend();
              setConfirming(false);
            }}
          >
            CONFIRM ASCEND
          </button>
          <button type="button" className="ghost" onClick={() => setConfirming(false)}>
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ascend-panel">
      <div className="section-head">
        <span>STAR SHARDS</span>
        <span>✧ {fmt(shards)}</span>
      </div>
      <p className="detail-note">
        Ascension permanen. Shard didapat dari stage tertinggi saat reset.
      </p>

      <div className="ascend-status">
        <span>BEST STAGE</span>
        <b>
          {fmt(maxStage)}
          {!eligible && ` / ${BALANCE.ascendStage}`}
        </b>
        <span>RUNS</span>
        <b>{ascensions}</b>
      </div>

      {ASCEND_BRANCHES.map((branch) => (
        <div key={branch.id} className="ascend-branch">
          <div className="section-head">
            <span>{branch.label.toUpperCase()}</span>
          </div>
          <ul className="ascend-list">
            {ASCEND_NODES.filter((node) => node.branch === branch.id).map((node) => {
              const level = nodes[node.id] ?? 0;
              const maxed = level >= node.max;
              const cost = ascendNodeCost(level);
              const affordable = shards >= cost;

              return (
                <li key={node.id} className="ascend-node">
                  <div className="ascend-node-top">
                    <span className="ascend-node-name" style={{ color: node.color }}>
                      {node.label}
                    </span>
                    <span className="ascend-node-rank">
                      RANK {level}/{node.max}
                    </span>
                  </div>
                  <span className="ascend-node-effect">
                    {node.effect} per rank · {level > 0 ? totalLabel(node.id, level) : 'not taken'}
                  </span>
                  <button
                    type="button"
                    className="ascend-node-btn"
                    onClick={() => buyAscendNode(node.id)}
                    disabled={maxed || !affordable}
                  >
                    {maxed ? 'MAX' : `+1 · ✧${cost}`}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <button
        type="button"
        className="ascend-btn"
        onClick={() => setConfirming(true)}
        disabled={!eligible}
      >
        {eligible ? `ASCEND · EARN ✧${reward}` : `CLEAR STAGE ${BALANCE.ascendStage} FIRST`}
      </button>
      <p className="detail-note ascend-note">
        {ascendNodeById('head-start')?.effect}: +2 stage per rank · Star Shard reward scales with
        your best stage.
      </p>
    </div>
  );
}
