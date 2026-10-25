import { ELEMENT_COLOR, ELEMENT_SHORT } from '../data/elements';
import { useGameStore } from '../state/store';
import { fmt } from './format';

const pct = (value: number): string => `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;

const TIER_LABEL = ['', 'T1', 'T2', 'T3'];

/**
 * The wing vault: three pairs, one worn at a time. Wings are the raid-tier
 * chase — a fraction of a mount's drop rate, but their passives and skill are
 * several times bigger, so the card has to show both plainly.
 */
export default function WingPanel() {
  const wings = useGameStore((state) => state.wings);
  const mounts = useGameStore((state) => state.mounts);
  const gold = useGameStore((state) => state.gold);
  const equipWing = useGameStore((state) => state.equipWing);
  const upgradeWing = useGameStore((state) => state.upgradeWing);
  const craftWing = useGameStore((state) => state.craftWing);

  const owned = wings.wings.filter((wing) => wing.unlocked).length;

  return (
    <div className="wing-panel">
      <div className="section-head">
        <span>
          WING VAULT · {owned}/{wings.wings.length}
        </span>
        <span>◈ {fmt(mounts.crystals)} CRYSTALS</span>
      </div>

      <p className="detail-note">
        Wings drop from dungeon bosses at 0.2%–0.7% — far rarer than a mount — and hit
        several times harder. Crafting is a gamble: a failed attempt keeps the gold but
        returns half the crystals.
      </p>

      <div className="mount-list">
        {wings.wings.map((wing) => {
          const worn = wings.active === wing.id;
          const canTemper =
            wing.unlocked &&
            wing.level < wing.maxLevel &&
            gold >= wing.upgrade.gold &&
            mounts.crystals >= wing.upgrade.crystals;
          const canCraft =
            !wing.unlocked &&
            gold >= wing.craft.gold &&
            mounts.crystals >= wing.craft.crystals;
          const craftChance = `${Math.round(wing.craft.chance * 100)}%`;

          return (
            <article
              key={wing.id}
              className={`mount-card wing-card${wing.unlocked ? ' owned' : ''}${worn ? ' ridden' : ''}`}
              style={{ borderLeftColor: wing.color }}
            >
              <div className="mount-head">
                <span className="mount-tier" style={{ color: wing.color }}>
                  {TIER_LABEL[wing.tier]}
                </span>
                <span
                  className="mount-name"
                  style={{ color: wing.unlocked ? wing.color : undefined }}
                >
                  {wing.name}
                </span>
                <span className="elem-tag" style={{ color: ELEMENT_COLOR[wing.element] }}>
                  {ELEMENT_SHORT[wing.element]}
                </span>
                {worn && <span className="mount-badge">WORN</span>}
              </div>

              <p className="mount-desc">{wing.desc}</p>

              {wing.unlocked ? (
                <>
                  <div className="mount-stats">
                    <span>
                      <b>
                        LV {wing.level}/{wing.maxLevel}
                      </b>
                    </span>
                    <span>
                      ATK <b>+{pct(wing.atkPct)}</b> · HP <b>+{pct(wing.hpPct)}</b> · DEF{' '}
                      <b>+{pct(wing.defPct)}</b>
                    </span>
                  </div>

                  <div className="mount-skill">
                    <span className="mount-skill-name">{wing.skillName}</span>
                    <span className="mount-skill-meta">
                      {wing.skillKind === 'damage'
                        ? `${wing.skillPower.toFixed(2)}× ATK`
                        : `${pct(wing.skillPower)} max HP`}{' '}
                      · {pct(wing.skillChance)} chance on hit
                    </span>
                  </div>

                  <div className="mount-actions">
                    <button
                      type="button"
                      className={`companion-btn${worn ? ' on' : ''}`}
                      onClick={() => equipWing(worn ? null : wing.id)}
                    >
                      {worn ? 'FOLD' : 'WEAR'}
                    </button>
                    <button
                      type="button"
                      className="companion-btn synth"
                      disabled={!canTemper}
                      onClick={() => upgradeWing(wing.id)}
                    >
                      {wing.level >= wing.maxLevel
                        ? 'MAX LEVEL'
                        : `TEMPER · ◆${fmt(wing.upgrade.gold)} · ◈${wing.upgrade.crystals}`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mount-stats">
                    <span>Skill · {wing.skillName}</span>
                    <span>
                      {pct(wing.skillChance)} chance ·{' '}
                      {wing.skillPower.toFixed(2)}× ATK
                    </span>
                  </div>
                  <button
                    type="button"
                    className="companion-btn synth"
                    disabled={!canCraft}
                    onClick={() => craftWing(wing.id)}
                  >
                    CRAFT · {craftChance} · ◆{fmt(wing.craft.gold)} · ◈{wing.craft.crystals}
                  </button>
                  <p className="wing-risk">
                    On failure: ◈{Math.floor(wing.craft.crystals / 2)} crystals back, gold
                    gone.
                  </p>
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
