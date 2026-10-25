import { BALANCE } from '../data/balance';
import { ELEMENTS, ELEMENT_COLOR, ELEMENT_SHORT } from '../data/elements';
import { RARITY, SLOT_LABEL } from '../data/items';
import { SETS } from '../data/sets';
import type { Item } from '../sim/types';
import {
  MAX_RUNES,
  TIER_MIN,
  capTier,
  enhanceChanceFor,
  enhanceCostFor,
  itemPower,
  itemStats,
  refineCostFor,
  runeCostFor,
  runeText,
  setProgress,
  substatText,
  substatTier,
} from '../sim/upgrade';
import { refineCap } from '../sim/refine';
import { useGameStore } from '../state/store';
import { fmt } from './format';
import ItemIcon from './ItemIcon';

interface Props {
  item: Item;
  equipped: boolean;
  onBack: () => void;
}

export default function ItemDetail({ item, equipped, onBack }: Props) {
  const gold = useGameStore((state) => state.gold);
  const equipItem = useGameStore((state) => state.equipItem);
  const unequip = useGameStore((state) => state.unequip);
  const salvage = useGameStore((state) => state.salvage);
  const essence = useGameStore((state) => state.essence);
  const enhanceItem = useGameStore((state) => state.enhanceItem);
  const refineItem = useGameStore((state) => state.refineItem);
  const refineToTier = useGameStore((state) => state.refineToTier);
  const toggleSubstatLock = useGameStore((state) => state.toggleSubstatLock);
  const enchantItem = useGameStore((state) => state.enchantItem);
  const worn = useGameStore((state) => state.equipped);
  const refineView = useGameStore((state) => state.refine);

  const rarity = RARITY[item.rarity];
  const setInfo = item.set ? setProgress(worn).find((set) => set.id === item.set) : null;
  const stats = itemStats(item);
  const maxed = item.enhance >= BALANCE.enhanceMax;
  const enhanceCost = enhanceCostFor(item);
  const chance = enhanceChanceFor(item);
  const refineCost = refineCostFor(item);
  const canEnhance = !maxed && gold >= enhanceCost;
  const slotRefine = refineView.slots[item.slot];
  const cap = refineCap(slotRefine.level);
  const capLabel = capTier(cap);
  const hasUnlocked = item.substats.some((sub) => !sub.locked);
  const allLocked = item.substats.length > 0 && !hasUnlocked;
  const canRefine = gold >= refineCost && !allLocked;
  const canAutoRefine = canRefine && hasUnlocked && cap >= TIER_MIN.A;
  const slotResonance = refineView.resonance;
  const levelsToA = Math.max(
    0,
    Math.ceil((TIER_MIN.A - BALANCE.refineCapBase) / BALANCE.refineCapPerLevel),
  );

  const runeCost = runeCostFor(item);
  const canEnchant = essence >= runeCost;
  const runeCount = item.runes.filter(Boolean).length;
  const resonance =
    runeCount === MAX_RUNES &&
    item.runes.every((rune) => rune && rune.element === item.runes[0]?.element);

  return (
    <div className="item-detail">
      <button type="button" className="detail-back" onClick={onBack}>
        ‹ BACK
      </button>

      <div className="detail-hero" style={{ borderColor: rarity.color }}>
        <div className="detail-head">
          <span className="detail-icon" style={{ borderColor: rarity.color }}>
            <ItemIcon slot={item.slot} name={item.name} size={40} />
          </span>
          <div className="detail-head-text">
            <span className="item-slot" style={{ color: rarity.color }}>
              {rarity.label} {SLOT_LABEL[item.slot]}
            </span>
            <h3 style={{ color: rarity.color }}>{item.name}</h3>
          </div>
        </div>
        <span className="detail-meta">
          iLv {item.level} · {fmt(itemPower(item))} PWR · +{item.enhance} · REFINE LV{' '}
          {slotRefine.level}
        </span>
        <div className="detail-stats">
          <div>
            <label>ATK</label>
            <b>{fmt(stats.atk)}</b>
          </div>
          <div>
            <label>HP</label>
            <b>{fmt(stats.hp)}</b>
          </div>
          <div>
            <label>DEF</label>
            <b>{fmt(stats.def)}</b>
          </div>
        </div>
      </div>

      {setInfo && (
        <div className="detail-block set-detail">
          <div className="section-head">
            <span style={{ color: setInfo.color }}>{setInfo.label.toUpperCase()}</span>
            <span>
              {setInfo.count}/{setInfo.total} EQUIPPED
            </span>
          </div>
          <p className="detail-note">{setInfo.flavor}</p>
          <ul className="set-tier-list">
            {setInfo.tiers.map((tier) => (
              <li key={tier.pieces} className={`set-tier-row${tier.active ? ' on' : ''}`}>
                <span className="set-piece-count">{tier.pieces} PC</span>
                <span>{tier.text}</span>
                <span className="set-state">{tier.active ? 'ACTIVE' : 'LOCKED'}</span>
              </li>
            ))}
          </ul>
          {!equipped && item.set && (
            <p className="detail-note set-hint">
              Equip this piece to count it toward {SETS[item.set].label}.
            </p>
          )}
        </div>
      )}

      <div className="detail-block">
        <div className="section-head">
          <span>
            ENHANCE +{item.enhance}/{BALANCE.enhanceMax}
          </span>
          <span>{maxed ? 'MAX' : `${Math.round(chance * 100)}% SUCCESS`}</span>
        </div>
        <p className="detail-note">
          {maxed
            ? 'This item cannot be enhanced further.'
            : `◆${fmt(enhanceCost)} per attempt · +12% item stats per level${
                item.pity > 0 ? ` · pity ${item.pity}` : ''
              }`}
        </p>
        <div className="detail-actions">
          <button type="button" onClick={() => enhanceItem(item.id, 1)} disabled={!canEnhance}>
            ENHANCE
          </button>
          <button type="button" onClick={() => enhanceItem(item.id, 10)} disabled={!canEnhance}>
            ENHANCE ×10
          </button>
        </div>
      </div>

      <div className="detail-block">
        <div className="section-head">
          <span>
            SUBSTATS · LV {slotRefine.level}/{BALANCE.refineMax}
          </span>
          <span>◆{fmt(refineCost)} REFINE</span>
        </div>
        <p className="detail-note">
          Every refine costs the same and fills the bar — a bad roll still moves you forward.
          Higher refine levels unlock better tiers; the level stays with the slot when you swap
          gear.
        </p>

        <div className="refine-track">
          <div className="refine-bar" aria-hidden="true">
            <span
              style={{
                width: `${(slotRefine.progress / BALANCE.refineProgress) * 100}%`,
              }}
            />
          </div>
          <div className="refine-meta">
            <span>
              PROGRESS {slotRefine.progress}/{BALANCE.refineProgress}
            </span>
            <span>
              CAP {capLabel} · PITY {slotRefine.pity}/{BALANCE.refinePity}
            </span>
          </div>
          <div className="refine-meta">
            <span>Tier C–{capLabel} possible</span>
            <span>
              {cap >= TIER_MIN.A
                ? 'REFINE TO A ready'
                : `Tier A at REFINE LV ${levelsToA}`}
            </span>
          </div>
        </div>
        <ul className="substat-list">
          {item.substats.length === 0 && (
            <li className="substat-empty">No substats yet — refine to roll them.</li>
          )}
          {item.substats.map((sub, index) => {
            const tier = substatTier(sub, item);
            return (
              <li key={`${sub.key}-${index}`} className={`substat${sub.locked ? ' locked' : ''}`}>
                <span className={`tier tier-${tier.toLowerCase()}`}>{tier}</span>
                <span className="substat-text">{substatText(sub)}</span>
                <button
                  type="button"
                  className="lock-btn"
                  aria-pressed={sub.locked}
                  onClick={() => toggleSubstatLock(item.id, index)}
                >
                  {sub.locked ? 'LOCKED' : 'LOCK'}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="refine-row">
          <button
            type="button"
            className="refine-btn"
            onClick={() => refineItem(item.id)}
            disabled={!canRefine}
          >
            REFINE
          </button>
          <button
            type="button"
            className="refine-btn auto"
            onClick={() => refineToTier(item.id)}
            disabled={!canAutoRefine}
          >
            REFINE TO A
          </button>
        </div>

        <div className="refine-resonance">
          <span className="refine-meta-label">RESONANCE · ALL SLOTS</span>
          <span className="refine-meta-value">
            LOWEST LV {slotResonance.level}/20 ·{' '}
            {slotResonance.next === 0
              ? 'MAX: +8% ATK / +8% HP / +3% CRIT'
              : `NEXT AT LV ${slotResonance.next}`}
          </span>
        </div>
      </div>

      <div className="detail-block">
        <div className="section-head">
          <span>
            RUNES {runeCount}/{MAX_RUNES}
          </span>
          <span>✦ {fmt(essence)} ESSENCE</span>
        </div>
        <div className="rune-slots">
          {item.runes.map((rune, index) => (
            <div
              key={index}
              className={`rune-slot${rune ? '' : ' empty'}`}
              style={rune ? { borderColor: `${ELEMENT_COLOR[rune.element]}66` } : undefined}
            >
              {rune ? (
                <>
                  <span className="rune-element" style={{ color: ELEMENT_COLOR[rune.element] }}>
                    {ELEMENT_SHORT[rune.element]}
                  </span>
                  <b>{runeText(rune)}</b>
                </>
              ) : (
                <span className="rune-empty">EMPTY</span>
              )}
            </div>
          ))}
        </div>
        {resonance && (
          <p className="rune-resonance">RESONANCE ×1.5 — bonus elemen diperkuat.</p>
        )}
        <p className="detail-note">
          Rune terbanyak menentukan elemen hero. Biaya ✦{fmt(runeCost)} per rune.
        </p>
        <div className="rune-elements">
          {ELEMENTS.map((element) => (
            <button
              key={element}
              type="button"
              className="rune-btn"
              style={{ color: ELEMENT_COLOR[element] }}
              onClick={() => enchantItem(item.id, element)}
              disabled={!canEnchant}
            >
              {ELEMENT_SHORT[element]}
            </button>
          ))}
        </div>
      </div>

      <div className="detail-actions">
        {equipped ? (
          <button
            type="button"
            onClick={() => {
              unequip(item.slot);
              onBack();
            }}
          >
            UNEQUIP
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              equipItem(item.id);
              onBack();
            }}
          >
            EQUIP
          </button>
        )}
        {equipped ? (
          <button type="button" className="ghost" onClick={onBack}>
            CLOSE
          </button>
        ) : (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              salvage(item.id);
              onBack();
            }}
          >
            SALVAGE +{item.salvage}g
          </button>
        )}
      </div>
    </div>
  );
}
