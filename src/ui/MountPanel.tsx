import { ELEMENT_COLOR, ELEMENT_SHORT } from '../data/elements';
import { useGameStore } from '../state/store';
import { fmt } from './format';

const pct = (value: number): string => `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;

const TIER_LABEL = ['', 'T1', 'T2', 'T3'];

/**
 * The stable: four mounts, one ridden at a time. Cards show what the mount
 * actually does — passive percentages, skill name and chance — so a new drop
 * can be judged without opening a detail sheet.
 */
export default function MountPanel() {
  const mounts = useGameStore((state) => state.mounts);
  const gold = useGameStore((state) => state.gold);
  const equipMount = useGameStore((state) => state.equipMount);
  const upgradeMount = useGameStore((state) => state.upgradeMount);
  const craftMount = useGameStore((state) => state.craftMount);

  const owned = mounts.mounts.filter((mount) => mount.unlocked).length;

  return (
    <div className="mount-panel">
      <div className="section-head">
        <span>
          STABLE · {owned}/{mounts.mounts.length}
        </span>
        <span>◈ {fmt(mounts.crystals)} CRYSTALS</span>
      </div>

      <p className="detail-note">
        Mounts drop from dungeon bosses or are crafted from crystals. One rides with the
        knight: passive stats plus a chance-based skill that fires on the knight's own
        attacks. Levels cost gold and crystals.
      </p>

      <div className="mount-list">
        {mounts.mounts.map((mount) => {
          const ridden = mounts.active === mount.id;
          const canTrain =
            mount.unlocked &&
            mount.level < mount.maxLevel &&
            gold >= mount.upgrade.gold &&
            mounts.crystals >= mount.upgrade.crystals;
          const canCraft =
            !mount.unlocked &&
            gold >= mount.craft.gold &&
            mounts.crystals >= mount.craft.crystals;

          return (
            <article
              key={mount.id}
              className={`mount-card${mount.unlocked ? ' owned' : ''}${ridden ? ' ridden' : ''}`}
              style={{ borderLeftColor: mount.color }}
            >
              <div className="mount-head">
                <span className="mount-tier" style={{ color: mount.color }}>
                  {TIER_LABEL[mount.tier]}
                </span>
                <span className="mount-name" style={{ color: mount.unlocked ? mount.color : undefined }}>
                  {mount.name}
                </span>
                <span className="elem-tag" style={{ color: ELEMENT_COLOR[mount.element] }}>
                  {ELEMENT_SHORT[mount.element]}
                </span>
                {ridden && <span className="mount-badge">RIDDEN</span>}
              </div>

              <p className="mount-desc">{mount.desc}</p>

              {mount.unlocked ? (
                <>
                  <div className="mount-stats">
                    <span>
                      <b>LV {mount.level}/{mount.maxLevel}</b>
                    </span>
                    <span>
                      ATK <b>+{pct(mount.atkPct)}</b> · HP <b>+{pct(mount.hpPct)}</b>
                      {mount.defPct > 0 ? ` · DEF +${pct(mount.defPct)}` : ''}
                    </span>
                  </div>

                  <div className="mount-skill">
                    <span className="mount-skill-name">{mount.skillName}</span>
                    <span className="mount-skill-meta">
                      {mount.skillKind === 'damage'
                        ? `${mount.skillPower.toFixed(2)}× ATK`
                        : `${pct(mount.skillPower)} max HP`}{' '}
                      · {pct(mount.skillChance)} chance on hit
                    </span>
                  </div>

                  <div className="mount-actions">
                    <button
                      type="button"
                      className={`companion-btn${ridden ? ' on' : ''}`}
                      onClick={() => equipMount(ridden ? null : mount.id)}
                    >
                      {ridden ? 'REST' : 'RIDE'}
                    </button>
                    <button
                      type="button"
                      className="companion-btn synth"
                      disabled={!canTrain}
                      onClick={() => upgradeMount(mount.id)}
                    >
                      {mount.level >= mount.maxLevel
                        ? 'MAX LEVEL'
                        : `TRAIN · ◆${fmt(mount.upgrade.gold)} · ◈${mount.upgrade.crystals}`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mount-stats">
                    <span>Skill · {mount.skillName}</span>
                    <span>{pct(mount.skillChance)} chance at LV 1</span>
                  </div>
                  <button
                    type="button"
                    className="companion-btn synth"
                    disabled={!canCraft}
                    onClick={() => craftMount(mount.id)}
                  >
                    CRAFT · ◆{fmt(mount.craft.gold)} · ◈{mount.craft.crystals}
                  </button>
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
