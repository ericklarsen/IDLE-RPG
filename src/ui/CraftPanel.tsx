import { useState } from 'react';
import { DUST_BY_RARITY, FORGE_COST } from '../data/forge';
import { SLOT_LABEL, SLOTS } from '../data/items';
import { SETS } from '../data/sets';
import { craftableSets } from '../sim/forge';
import type { ItemSet, Slot } from '../sim/types';
import { useGameStore } from '../state/store';
import { fmt } from './format';

/** CRAFT tab: buy a missing Epic piece of a set you have already found. */
export default function CraftPanel() {
  const dust = useGameStore((state) => state.dust);
  const essence = useGameStore((state) => state.essence);
  const codex = useGameStore((state) => state.codex);
  const craftSetPiece = useGameStore((state) => state.craftSetPiece);

  const sets = craftableSets(codex.items);
  const [set, setSet] = useState<ItemSet | null>(null);
  const [slot, setSlot] = useState<Slot>('weapon');
  const [pending, setPending] = useState(false);

  const activeSet = set && sets.includes(set) ? set : (sets[0] ?? null);
  const canCraft =
    activeSet !== null && dust >= FORGE_COST.dust && essence >= FORGE_COST.essence;

  return (
    <div
      className="forge-panel"
      id="forge-craft"
      role="tabpanel"
      aria-labelledby="forge-tab-craft"
    >
      <div className="section-head">
        <span>CRAFT SET PIECE</span>
        <span>
          ✦ {fmt(dust)} · ✧ {fmt(essence)}
        </span>
      </div>

      {sets.length === 0 ? (
        <p className="forge-empty">
          Find a piece of a set first — then you can craft the missing slots.
        </p>
      ) : (
        <div className="forge-block">
          <div className="forge-block-head">
            <span className="forge-title">PICK A SET AND SLOT</span>
            <span className="forge-out">
              ✦{FORGE_COST.dust} · ✧{FORGE_COST.essence}
            </span>
          </div>
          <div className="forge-chips">
            {sets.map((id) => (
              <button
                key={id}
                type="button"
                className={`forge-chip${activeSet === id ? ' on' : ''}`}
                aria-pressed={activeSet === id}
                style={activeSet === id ? { borderColor: SETS[id].color } : undefined}
                onClick={() => {
                  setSet(id);
                  setPending(false);
                }}
              >
                {SETS[id].label}
              </button>
            ))}
          </div>
          <div className="forge-chips">
            {SLOTS.map((entry) => (
              <button
                key={entry}
                type="button"
                className={`forge-chip${slot === entry ? ' on' : ''}`}
                aria-pressed={slot === entry}
                onClick={() => {
                  setSlot(entry);
                  setPending(false);
                }}
              >
                {SLOT_LABEL[entry]}
              </button>
            ))}
          </div>
          <p className="detail-note">
            Dust per salvage: Common {DUST_BY_RARITY.common} · Rare {DUST_BY_RARITY.rare} · Epic{' '}
            {DUST_BY_RARITY.epic} · Legendary {DUST_BY_RARITY.legendary}.
          </p>
          <button
            type="button"
            className="forge-action"
            disabled={!canCraft || pending || activeSet === null}
            onClick={() => setPending(true)}
          >
            {activeSet
              ? `CRAFT ${SETS[activeSet].label.toUpperCase()} ${SLOT_LABEL[slot].toUpperCase()}`
              : 'CRAFT'}
          </button>
        </div>
      )}

      {pending && activeSet && (
        <div className="forge-confirm">
          <div className="forge-block-head">
            <span className="forge-title">CONFIRM CRAFT</span>
            <span className="forge-out">THIS CONSUMES CURRENCY</span>
          </div>
          <p className="detail-note">
            Result: Epic {SETS[activeSet].label} {SLOT_LABEL[slot]} · {FORGE_COST.dust} dust +{' '}
            {FORGE_COST.essence} essence.
          </p>
          <div className="forge-confirm-actions">
            <button
              type="button"
              className="forge-action"
              onClick={() => {
                craftSetPiece(slot, activeSet);
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
