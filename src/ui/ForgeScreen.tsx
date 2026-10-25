import { useRef, useState } from 'react';
import { BALANCE } from '../data/balance';
import { RARITY, SLOT_LABEL, SLOTS } from '../data/items';
import { itemPower } from '../sim/upgrade';
import { useGameStore } from '../state/store';
import CraftPanel from './CraftPanel';
import { fmt } from './format';
import FusePanel from './FusePanel';
import Screen from './Screen';

type ForgeTab = 'enhance' | 'fuse' | 'craft';

const TABS: { id: ForgeTab; label: string }[] = [
  { id: 'enhance', label: 'ENHANCE' },
  { id: 'fuse', label: 'FUSE' },
  { id: 'craft', label: 'CRAFT' },
];

/**
 * The forge owns every gold-to-power loop, split into three tabs so each job
 * gets its own screen instead of one long scroll.
 */
export default function ForgeScreen() {
  const {
    equipped,
    hasWeapon,
    enhanceLevel,
    enhanceCost,
    enhanceChance,
    enhanceWeapon,
    enhanceAllSlots,
    gold,
    dead,
  } = useGameStore();

  const [tab, setTab] = useState<ForgeTab>('enhance');
  const tabsRef = useRef<HTMLDivElement>(null);

  const weapon = equipped.weapon;
  const maxed = hasWeapon && enhanceChance <= 0;
  const canEnhance = hasWeapon && !maxed && gold >= enhanceCost && !dead;
  const canBatch = SLOTS.some(
    (slot) => (equipped[slot]?.enhance ?? BALANCE.enhanceGuaranteed) < BALANCE.enhanceGuaranteed,
  );

  const select = (next: ForgeTab) => {
    setTab(next);
    // Switching tabs starts at the top of the new one, not mid-scroll.
    tabsRef.current?.closest('.screen-body')?.scrollTo({ top: 0 });
  };

  return (
    <Screen
      eyebrow="WORKSHOP"
      title="Forge"
      aside={
        <span className="gold-chip">
          <span className="diamond">◆</span>
          {fmt(gold)}
        </span>
      }
    >
      <div className="forge-tabs" role="tablist" aria-label="Forge sections" ref={tabsRef}>
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            id={`forge-tab-${entry.id}`}
            aria-selected={tab === entry.id}
            aria-controls={`forge-${entry.id}`}
            className={`forge-tab${tab === entry.id ? ' on' : ''}`}
            onClick={() => select(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'enhance' && (
        <div
          className="forge-panel"
          id="forge-enhance"
          role="tabpanel"
          aria-labelledby="forge-tab-enhance"
        >
          <div className="section-head">
            <span>ENHANCE WEAPON</span>
            <span>{weapon ? `${fmt(itemPower(weapon))} PWR` : 'NO WEAPON'}</span>
          </div>

          <div className="forge-block">
            <div className="forge-block-head">
              <span
                className="forge-title"
                style={weapon ? { color: RARITY[weapon.rarity].color } : undefined}
              >
                {weapon ? weapon.name.toUpperCase() : 'NOTHING EQUIPPED'}
              </span>
              <span className="forge-out">{hasWeapon ? `+${enhanceLevel}` : 'EMPTY SLOT'}</span>
            </div>

            <button
              className="enhance-btn"
              disabled={!canEnhance}
              onClick={() => enhanceWeapon(1)}
            >
              <span className="enhance-title">ENHANCE WEAPON</span>
              <span className="enhance-sub">
                {!hasWeapon
                  ? 'Equip a weapon in GEAR'
                  : maxed
                    ? `+${enhanceLevel} · MAX LEVEL`
                    : `+${enhanceLevel} → +${enhanceLevel + 1} · ${Math.round(enhanceChance * 100)}% · ◆${fmt(enhanceCost)}`}
              </span>
            </button>
          </div>

          <div className="section-head">
            <span>ALL SLOTS</span>
            <span>+{BALANCE.enhanceGuaranteed} GUARANTEED</span>
          </div>

          <div className="forge-block">
            <ul className="forge-list">
              {SLOTS.map((slot) => {
                const item = equipped[slot];
                return (
                  <li key={slot}>
                    <span style={item ? { color: RARITY[item.rarity].color } : undefined}>
                      <span className="forge-slot-label">{SLOT_LABEL[slot]}</span>
                      {item ? item.name : '—'}
                    </span>
                    <span className="forge-list-meta">
                      {item ? `+${item.enhance}` : 'EMPTY'}
                    </span>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="forge-action forge-batch"
              onClick={enhanceAllSlots}
              disabled={!canBatch}
            >
              ENHANCE ALL SLOTS → +{BALANCE.enhanceGuaranteed}
            </button>
          </div>
        </div>
      )}

      {tab === 'fuse' && <FusePanel />}
      {tab === 'craft' && <CraftPanel />}
    </Screen>
  );
}
