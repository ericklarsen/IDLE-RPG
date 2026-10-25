import { CODEX_ENEMIES, CODEX_ITEMS, codexItemsForSlot } from '../data/codex';
import { COSTUMES, COSTUME_TIERS } from '../data/costumes';
import { MOUNTS } from '../data/mounts';
import { WINGS } from '../data/wings';
import { ELEMENT_COLOR, ELEMENT_SHORT } from '../data/elements';
import { SLOT_LABEL, SLOTS } from '../data/items';
import { SETS, SET_IDS } from '../data/sets';
import { RIFT_MODIFIERS } from '../sim/rift';
import { useGameStore } from '../state/store';

const ENEMY_GROUPS = [
  { kind: 'normal', label: 'NORMAL' },
  { kind: 'elite', label: 'ELITE' },
  { kind: 'boss', label: 'BOSS' },
] as const;

export default function CodexPanel() {
  const codex = useGameStore((state) => state.codex);
  const enemies = new Set(codex.enemies);
  const items = new Set(codex.items);
  const modifiers = new Set(codex.modifiers);
  const costumes = new Set(codex.costumes);
  const mounts = new Set(codex.mounts);
  const wings = new Set(codex.wings);

  const foundEnemies = CODEX_ENEMIES.filter((entry) => enemies.has(entry.name)).length;
  const foundItems = CODEX_ITEMS.filter((entry) => items.has(entry.name)).length;
  const foundModifiers = RIFT_MODIFIERS.filter((mod) => modifiers.has(mod.id)).length;
  const foundCostumes = COSTUMES.filter((costume) => costumes.has(costume.id)).length;
  const foundMounts = MOUNTS.filter((mount) => mounts.has(mount.id)).length;
  const foundWings = WINGS.filter((wing) => wings.has(wing.id)).length;

  return (
    <div className="codex">
      <div className="section-head">
        <span>BESTIARY</span>
        <span>
          {foundEnemies}/{CODEX_ENEMIES.length}
        </span>
      </div>

      {ENEMY_GROUPS.map((group) => (
        <div key={group.kind} className="codex-block">
          <span className="codex-sub">{group.label}</span>
          <ul className="codex-grid">
            {CODEX_ENEMIES.filter((entry) => entry.kind === group.kind).map((entry) => {
              const known = enemies.has(entry.name);
              return (
                <li key={entry.name} className={`codex-row${known ? '' : ' unknown'}`}>
                  <span className="codex-name">{known ? entry.name : '???'}</span>
                  {known && (
                    <span className="codex-elem" style={{ color: ELEMENT_COLOR[entry.element] }}>
                      {ELEMENT_SHORT[entry.element]}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="section-head bag-head">
        <span>ARSENAL</span>
        <span>
          {foundItems}/{CODEX_ITEMS.length}
        </span>
      </div>

      {SLOTS.map((slot) => (
        <div key={slot} className="codex-slot">
          <span className="codex-sub">{SLOT_LABEL[slot]}</span>
          <div className="codex-chips">
            {codexItemsForSlot(slot).map((entry) => {
              const known = items.has(entry.name);
              const color = entry.set ? SETS[entry.set].color : undefined;
              return (
                <span
                  key={entry.name}
                  className={`codex-chip${known ? ' known' : ''}`}
                  style={known && color ? { color, borderColor: color } : undefined}
                >
                  {known ? entry.name : '???'}
                </span>
              );
            })}
          </div>
        </div>
      ))}

      <div className="codex-sets">
        {SET_IDS.map((id) => {
          const set = SETS[id];
          const found = set.pieces.filter((name) => items.has(name)).length;
          return (
            <div key={id} className="codex-set" style={{ borderColor: set.color }}>
              <span className="codex-set-name" style={{ color: set.color }}>
                {set.label}
              </span>
              <span className="codex-set-count">
                {found}/{set.pieces.length} PIECES
              </span>
            </div>
          );
        })}
      </div>

      <div className="section-head bag-head">
        <span>WARDROBE</span>
        <span>
          {foundCostumes}/{COSTUMES.length}
        </span>
      </div>

      <ul className="codex-rows">
        {COSTUMES.map((costume) => {
          const known = costumes.has(costume.id);
          const tier = COSTUME_TIERS[costume.tier];
          return (
            <li
              key={costume.id}
              className={`codex-row${known ? '' : ' unknown'}`}
              style={{ borderLeftColor: tier.color }}
            >
              <span className="codex-name" style={known ? { color: tier.color } : undefined}>
                {known ? costume.name : '???'}
              </span>
              <span className="codex-desc">{tier.label}</span>
            </li>
          );
        })}
      </ul>

      <div className="section-head bag-head">
        <span>STABLE</span>
        <span>
          {foundMounts}/{MOUNTS.length}
        </span>
      </div>

      <ul className="codex-rows">
        {MOUNTS.map((mount) => {
          const known = mounts.has(mount.id);
          return (
            <li
              key={mount.id}
              className={`codex-row${known ? '' : ' unknown'}`}
              style={{ borderLeftColor: mount.color }}
            >
              <span className="codex-name" style={known ? { color: mount.color } : undefined}>
                {known ? mount.name : '???'}
              </span>
              <span className="codex-desc">
                T{mount.tier} · {ELEMENT_SHORT[mount.element]}
                {known ? ` · ${mount.skill.name}` : ''}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="section-head bag-head">
        <span>WING VAULT</span>
        <span>
          {foundWings}/{WINGS.length}
        </span>
      </div>

      <ul className="codex-rows">
        {WINGS.map((wing) => {
          const known = wings.has(wing.id);
          return (
            <li
              key={wing.id}
              className={`codex-row${known ? '' : ' unknown'}`}
              style={{ borderLeftColor: wing.color }}
            >
              <span className="codex-name" style={known ? { color: wing.color } : undefined}>
                {known ? wing.name : '???'}
              </span>
              <span className="codex-desc">
                T{wing.tier} · {ELEMENT_SHORT[wing.element]}
                {known ? ` · ${wing.skill.name}` : ''}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="section-head bag-head">
        <span>RIFT MODIFIERS</span>
        <span>
          {foundModifiers}/{RIFT_MODIFIERS.length}
        </span>
      </div>

      <ul className="codex-rows">
        {RIFT_MODIFIERS.map((mod) => (
          <li key={mod.id} className={`codex-row${modifiers.has(mod.id) ? '' : ' unknown'}`}>
            <span className="codex-name">{modifiers.has(mod.id) ? mod.label : '???'}</span>
            {modifiers.has(mod.id) && <span className="codex-desc">{mod.desc}</span>}
          </li>
        ))}
      </ul>

      <p className="codex-note">
        Enemies are logged when they spawn, gear when it drops, costumes when they join the
        wardrobe, mounts and wings when they reach the stable, and rift modifiers when a rift
        starts.
      </p>
    </div>
  );
}
