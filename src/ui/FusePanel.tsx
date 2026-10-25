import { useState } from 'react';
import { FUSE_UP } from '../data/forge';
import { RARITY } from '../data/items';
import { fuseCandidates, fuseTarget } from '../sim/forge';
import type { Rarity } from '../sim/types';
import { itemPower } from '../sim/upgrade';
import { useGameStore } from '../state/store';
import { fmt } from './format';

const FUSABLE: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

/** FUSE tab: three items of one rarity become one of the next. */
export default function FusePanel() {
  const inventory = useGameStore((state) => state.inventory);
  const dust = useGameStore((state) => state.dust);
  const fuse = useGameStore((state) => state.fuse);

  const [rarity, setRarity] = useState<Rarity>('common');
  const [pending, setPending] = useState(false);

  const target = fuseTarget(rarity);
  const candidates = fuseCandidates(inventory, rarity);
  const short = 3 - candidates.length;

  return (
    <div
      className="forge-panel"
      id="forge-fuse"
      role="tabpanel"
      aria-labelledby="forge-tab-fuse"
    >
      <div className="section-head">
        <span>FUSE · 3 → 1</span>
        <span>✦ {fmt(dust)} DUST</span>
      </div>
      <p className="detail-note">
        Salvage gear for dust. Three items of one rarity become one item of the next rarity,
        rolled at your current farm level.
      </p>

      <div className="forge-block">
        <div className="forge-block-head">
          <span className="forge-title">PICK A RARITY</span>
          <span className="forge-out" style={target ? { color: RARITY[target].color } : undefined}>
            {target ? `→ ${RARITY[target].label}` : 'MYTHIC IS THE CAP'}
          </span>
        </div>
        <div className="forge-chips">
          {FUSABLE.map((entry) => {
            const count = inventory.filter((item) => item.rarity === entry).length;
            return (
              <button
                key={entry}
                type="button"
                className={`forge-chip${rarity === entry ? ' on' : ''}`}
                aria-pressed={rarity === entry}
                style={rarity === entry ? { borderColor: RARITY[entry].color } : undefined}
                onClick={() => {
                  setRarity(entry);
                  setPending(false);
                }}
              >
                {RARITY[entry].label} · {count}
              </button>
            );
          })}
        </div>

        {target && (
          <>
            <ul className="forge-list">
              {candidates.map((item) => (
                <li key={item.id}>
                  <span style={{ color: RARITY[item.rarity].color }}>{item.name}</span>
                  <span className="forge-list-meta">
                    +{item.enhance} · {fmt(itemPower(item))} PWR
                  </span>
                </li>
              ))}
              {short > 0 && (
                <li className="forge-empty">
                  Need {short} more {RARITY[rarity].label} item{short === 1 ? '' : 's'} in the
                  bag.
                </li>
              )}
            </ul>
            <button
              type="button"
              className="forge-action"
              disabled={candidates.length < 3 || pending}
              onClick={() => setPending(true)}
            >
              FUSE 3 {RARITY[rarity].label.toUpperCase()} → 1{' '}
              {RARITY[target].label.toUpperCase()}
            </button>
          </>
        )}
      </div>

      {pending && target && (
        <div className="forge-confirm">
          <div className="forge-block-head">
            <span className="forge-title">CONFIRM FUSE</span>
            <span className="forge-out">THIS CONSUMES ITEMS</span>
          </div>
          <ul className="forge-list">
            {candidates.map((item) => (
              <li key={item.id}>
                <span style={{ color: RARITY[item.rarity].color }}>{item.name}</span>
                <span className="forge-list-meta">{fmt(itemPower(item))} PWR</span>
              </li>
            ))}
          </ul>
          <p className="detail-note">
            Result: one random {RARITY[FUSE_UP[rarity] ?? rarity].label} item at your farm
            level.
          </p>
          <div className="forge-confirm-actions">
            <button
              type="button"
              className="forge-action"
              onClick={() => {
                fuse(rarity);
                setPending(false);
              }}
            >
              CONFIRM
            </button>
            <button
              type="button"
              className="forge-action ghost"
              onClick={() => setPending(false)}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
