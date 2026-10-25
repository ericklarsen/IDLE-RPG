import { useState } from 'react';
import { ELEMENT_COLOR, ELEMENT_LABEL } from '../data/elements';
import { INVENTORY_CAP, RARITY, SLOT_LABEL, SLOTS } from '../data/items';
import { SETS } from '../data/sets';
import { SURGE_DURATION } from '../data/surge';
import { itemPower, setProgress } from '../sim/upgrade';
import { useGameStore } from '../state/store';
import { filterBag, type BagFilter, type BagSort } from './bag';
import CostumePanel from './CostumePanel';
import { fmt } from './format';
import ItemDetail from './ItemDetail';
import ItemGlyph from './ItemGlyph';
import ItemIcon from './ItemIcon';
import Screen from './Screen';

const FILTERS: BagFilter[] = ['all', ...SLOTS];
const SORTS: { id: BagSort; label: string }[] = [
  { id: 'power', label: 'POWER' },
  { id: 'rarity', label: 'RARITY' },
];

function pct(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

interface Props {
  /** Open item detail, owned by the app nav so back closes it. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * Everything about the knight's loadout lives here: the combat readout that
 * used to sit in the HUD, the equipped slots, set bonuses, and the bag.
 */
export default function GearScreen({ selectedId, onSelect }: Props) {
  const {
    level,
    gold,
    atk,
    dps,
    kills,
    gearScore,
    equipped,
    inventory,
    costume,
    heroElement,
    elemBonus,
    surge,
    log,
    shield,
    heroHp,
    heroMaxHp,
    equipBest,
    salvageCommons,
  } = useGameStore();

  const [tab, setTab] = useState<'gear' | 'costume'>('gear');
  const [filter, setFilter] = useState<BagFilter>('all');
  const [sort, setSort] = useState<BagSort>('power');
  const allItems = [...SLOTS.map((slot) => equipped[slot]), ...inventory];
  const selected = selectedId
    ? (allItems.find((item) => item?.id === selectedId) ?? null)
    : null;
  const selectedEquipped = selected
    ? SLOTS.some((slot) => equipped[slot]?.id === selected.id)
    : false;
  const activeSets = setProgress(equipped).filter((set) => set.count > 0);
  const shown = filterBag(inventory, filter, sort);

  return (
    <Screen
      eyebrow={`KNIGHT · LV ${level}`}
      title="Gear"
      aside={
        <span className="gold-chip">
          <span className="diamond">◆</span>
          {fmt(gold)}
        </span>
      }
    >
      <div className="rift-tabs gear-tabs" role="tablist" aria-label="Gear and costume">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'gear'}
          className={`rift-tab${tab === 'gear' ? ' on' : ''}`}
          onClick={() => {
            setTab('gear');
            onSelect(null);
          }}
        >
          GEAR
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'costume'}
          className={`rift-tab${tab === 'costume' ? ' on' : ''}`}
          onClick={() => {
            setTab('costume');
            onSelect(null);
          }}
        >
          COSTUME · {costume.owned.length}
        </button>
      </div>

      {tab === 'costume' ? (
        <CostumePanel />
      ) : selected ? (
        <ItemDetail
          item={selected}
          equipped={selectedEquipped}
          onBack={() => onSelect(null)}
        />
      ) : (
        <>
          <div className="section-head">
            <span>KNIGHT</span>
            <span>GEAR SCORE {fmt(gearScore)}</span>
          </div>

          <div className="stats">
            <div>
              <label>ATK</label>
              <b>{atk}</b>
            </div>
            <div>
              <label>DPS</label>
              <b>{fmt(dps)}</b>
            </div>
            <div>
              <label>KILLS</label>
              <b>{fmt(kills)}</b>
            </div>
            <div>
              <label>GEAR</label>
              <b className="gold-text">{fmt(gearScore)}</b>
            </div>
          </div>

          <div className="attune-row">
            {heroElement ? (
              <>
                <span className="attune-tag" style={{ color: ELEMENT_COLOR[heroElement] }}>
                  {ELEMENT_LABEL[heroElement]}
                </span>
                <span>attuned</span>
                <span className="attune-bonus">+{elemBonus}% ELEM</span>
              </>
            ) : (
              <span className="attune-empty">NO ELEMENT — socket runes to attune</span>
            )}
            {shield > 0 && <span className="shield-chip">+{fmt(shield)} SHIELD</span>}
            <span className="attune-hp">
              {fmt(heroHp)} / {fmt(heroMaxHp)} HP
            </span>
          </div>

          {surge.unlocked && (
            <div className={`surge-row${surge.active ? ' active' : ''}`}>
              <span className="surge-label">
                SURGE{' '}
                {surge.active ? `${surge.remaining.toFixed(1)}s` : `${Math.round(surge.charge * 100)}%`}
              </span>
              <div className="track surge">
                <span
                  style={{
                    width: `${surge.active ? pct(surge.remaining, SURGE_DURATION) : pct(surge.charge, 1)}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="log-line">{log[0] ?? 'The forge is quiet.'}</div>

          <div className="section-head">
            <span>EQUIPPED</span>
            <span>
              {SLOTS.filter((slot) => equipped[slot]).length}/{SLOTS.length} SLOTS
            </span>
          </div>

          {activeSets.length > 0 && (
            <div className="set-list">
              {activeSets.map((set) => (
                <div key={set.id} className="set-line" style={{ borderColor: set.color }}>
                  <div className="set-line-head">
                    <span className="set-line-name" style={{ color: set.color }}>
                      {set.label}
                    </span>
                    <span className="set-line-count">
                      {set.count}/{set.total} EQUIPPED
                    </span>
                  </div>
                  <div className="set-tiers">
                    {set.tiers.map((tier) => (
                      <span
                        key={tier.pieces}
                        className={`set-tier${tier.active ? ' on' : ''}`}
                      >
                        {tier.pieces} · {tier.text}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="gear-grid">
            {SLOTS.map((slot) => {
              const item = equipped[slot];
              return (
                <button
                  key={slot}
                  type="button"
                  className="gear-slot"
                  style={item ? { borderColor: RARITY[item.rarity].color } : undefined}
                  onClick={() => item && onSelect(item.id)}
                  disabled={!item}
                  title={item ? 'Tap to view' : 'Empty slot'}
                >
                  <span className="gear-slot-label">
                    <ItemGlyph slot={slot} size={12} />
                    {SLOT_LABEL[slot]}
                  </span>
                  <span
                    className="gear-slot-name"
                    style={item ? { color: RARITY[item.rarity].color } : undefined}
                  >
                    {item ? item.name : '—'}
                  </span>
                  <span className="gear-slot-power">
                    {item ? `+${item.enhance} · ${fmt(itemPower(item))} PWR` : 'EMPTY'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="gear-actions">
            <button type="button" onClick={equipBest}>
              EQUIP BEST
            </button>
            <button type="button" className="ghost" onClick={salvageCommons}>
              SALVAGE COMMONS
            </button>
          </div>

          <div className="section-head bag-head">
            <span>
              BAG {inventory.length}/{INVENTORY_CAP}
            </span>
            <span>
              {filter === 'all'
                ? 'TAP AN ITEM'
                : `SHOWING ${shown.length}/${inventory.length}`}
            </span>
          </div>

          <div className="bag-tools">
            <div className="bag-chips">
              {FILTERS.map((entry) => {
                const count =
                  entry === 'all'
                    ? inventory.length
                    : inventory.filter((item) => item.slot === entry).length;
                return (
                  <button
                    key={entry}
                    type="button"
                    className={`bag-chip${filter === entry ? ' on' : ''}`}
                    aria-pressed={filter === entry}
                    onClick={() => setFilter(entry)}
                  >
                    {entry === 'all' ? 'ALL' : SLOT_LABEL[entry].toUpperCase()} · {count}
                  </button>
                );
              })}
            </div>
            <div className="bag-chips bag-sorts">
              {SORTS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`bag-chip${sort === entry.id ? ' on' : ''}`}
                  aria-pressed={sort === entry.id}
                  onClick={() => setSort(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {inventory.length === 0 && (
            <p className="empty-bag">
              Kill enemies to find gear. Bosses always drop Epic or better.
            </p>
          )}

          {inventory.length > 0 && shown.length === 0 && (
            <p className="empty-bag">
              No {filter === 'all' ? 'items' : SLOT_LABEL[filter].toLowerCase()} in the bag.
            </p>
          )}

          <div className="item-grid">
            {shown.map((item) => {
              const rarity = RARITY[item.rarity];
              return (
                <button
                  key={item.id}
                  type="button"
                  className="item-cell"
                  style={{
                    borderColor: rarity.color,
                    backgroundImage: `linear-gradient(160deg, ${rarity.color}22, rgba(255,255,255,0.015))`,
                  }}
                  aria-label={`${rarity.label} ${SLOT_LABEL[item.slot]} ${item.name}${
                    item.set ? ` · ${SETS[item.set].label}` : ''
                  }`}
                  onClick={() => onSelect(item.id)}
                >
                  {item.set && (
                    <span
                      className="item-cell-set"
                      style={{ borderTopColor: SETS[item.set].color }}
                      aria-hidden="true"
                    />
                  )}
                  {item.enhance > 0 && (
                    <span className="item-cell-enhance">+{item.enhance}</span>
                  )}
                  <span className="item-cell-icon">
                    <ItemIcon slot={item.slot} name={item.name} size={32} />
                  </span>
                  <span className="item-cell-name" style={{ color: rarity.color }}>
                    {item.name}
                  </span>
                  <span className="item-cell-power">{fmt(itemPower(item))}</span>
                </button>
              );
            })}
            {filter === 'all' &&
              Array.from({ length: Math.max(0, INVENTORY_CAP - inventory.length) }, (_, index) => (
                <span key={`empty-${index}`} className="item-cell empty" aria-hidden="true" />
              ))}
          </div>
        </>
      )}
    </Screen>
  );
}
