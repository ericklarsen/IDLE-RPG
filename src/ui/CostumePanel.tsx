import { COSTUMES, COSTUME_TIERS, COSTUME_PITY } from '../data/costumes';
import { PALETTES, paletteById } from '../data/palettes';
import { costumeBonuses } from '../sim/costume';
import { useGameStore } from '../state/store';

const percent = (value: number): number => Math.round(value * 100);

/**
 * The wardrobe: one outfit at a time, six tiers, each with its own passive and
 * its own always-on cast. Locked tiers show the farming stage that unlocks the
 * drop instead of a price, because costumes are found, never bought.
 */
export default function CostumePanel() {
  const costume = useGameStore((state) => state.costume);
  const farmStage = useGameStore((state) => state.farmStage);
  const dust = useGameStore((state) => state.dust);
  const essence = useGameStore((state) => state.essence);
  const equipCostume = useGameStore((state) => state.equipCostume);
  const forgeCostume = useGameStore((state) => state.forgeCostume);
  const palette = useGameStore((state) => state.palette);
  const wearPalette = useGameStore((state) => state.wearPalette);

  const bonuses = costumeBonuses(costume);
  const accent = paletteById(palette.worn);
  const worn = COSTUMES.find((entry) => entry.id === costume.equipped) ?? null;
  const needsAtk = percent(bonuses.atkPct) > 0;

  return (
    <div className="costume-panel">
      <div className="section-head">
        <span>
          WARDROBE · {costume.owned.length}/{COSTUMES.length}
        </span>
        <span>{worn ? `WORN: ${worn.name.toUpperCase()}` : 'NOTHING WORN'}</span>
      </div>

      <p className="detail-note">
        Bosses can drop an outfit; the tower cache on floors 5, 8, and 10 drops a better
        one. Costumes never level — a higher tier simply carries a stronger passive and a
        harder-hitting skill. Duplicates turn into dust, and dust can forge a tier you have
        not found yet.
      </p>

      <p className="costume-pity">
        BOSS DROP · GUARANTEED IN {Math.max(1, COSTUME_PITY - costume.pity)} MORE BOSS
        {COSTUME_PITY - costume.pity === 1 ? '' : 'ES'}
      </p>

      <div className="costume-total">
        <div>
          <label>PASSIVE</label>
          <b>
            {needsAtk ? `+${percent(bonuses.atkPct)}% ATK` : 'none'}
            {percent(bonuses.hpPct) > 0 ? ` · +${percent(bonuses.hpPct)}% HP` : ''}
            {percent(bonuses.defPct) > 0 ? ` · +${percent(bonuses.defPct)}% DEF` : ''}
            {percent(bonuses.speedPct) > 0 ? ` · +${percent(bonuses.speedPct)}% SPD` : ''}
            {percent(bonuses.crit) > 0 ? ` · +${percent(bonuses.crit)}% CRIT` : ''}
          </b>
        </div>
        <div>
          <label>SKILL</label>
          <b>{worn ? `${worn.skill.name} · ${worn.skill.cooldown}s` : 'none'}</b>
        </div>
      </div>

      <div className="costume-list">
        {COSTUMES.map((entry) => {
          const tier = COSTUME_TIERS[entry.tier];
          const owned = costume.owned.includes(entry.id);
          const isWorn = costume.equipped === entry.id;
          const dropped = farmStage >= tier.stage;

          return (
            <div
              key={entry.id}
              className={`costume-card${owned ? ' owned' : ''}${isWorn ? ' worn' : ''}`}
              style={{ borderLeftColor: tier.color }}
            >
              <div className="costume-card-head">
                <span className="costume-tier" style={{ color: tier.color }}>
                  {tier.label.toUpperCase()}
                </span>
                <span className="costume-name" style={{ color: owned ? tier.color : undefined }}>
                  {entry.name}
                </span>
                {isWorn && <span className="costume-worn">WORN</span>}
              </div>

              <div className="costume-effect">{entry.effect}</div>

              <div className="costume-skill">
                <span className="costume-skill-name">{entry.skill.name}</span>
                <span className="costume-skill-desc">
                  {entry.skill.desc} · every {entry.skill.cooldown}s
                </span>
              </div>

              {owned ? (
                <button
                  type="button"
                  className={`costume-btn${isWorn ? ' off' : ''}`}
                  onClick={() => equipCostume(isWorn ? null : entry.id)}
                >
                  {isWorn ? 'REMOVE' : 'WEAR'}
                </button>
              ) : (
                <div className="costume-forge">
                  <p className="costume-locked">
                    {dropped
                      ? 'Not found yet — keep killing bosses'
                      : `Drops once you farm stage ${tier.stage}`}
                  </p>
                  <button
                    type="button"
                    className="costume-btn forge"
                    disabled={dust < tier.forge.dust || essence < tier.forge.essence}
                    onClick={() => forgeCostume(entry.id)}
                    aria-label={`Forge ${entry.name} for ${tier.forge.dust} dust and ${tier.forge.essence} essence`}
                  >
                    FORGE · ✧{tier.forge.dust} · ✦{tier.forge.essence}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="palette-block">
        <div className="section-head">
          <span>
            PALETTE · {palette.unlocked.length}/{PALETTES.length}
          </span>
          <span>{accent ? accent.name.toUpperCase() : 'DEFAULT TONES'}</span>
        </div>

        <p className="detail-note">
          A palette repaints the trim, cape, and leather over whatever outfit is worn.
          Purely cosmetic: no stat, no drop rate. Each one is earned once and kept for
          good, even through Ascension and a new league week.
        </p>

        <div className="palette-list">
          <button
            type="button"
            className={`palette-chip${palette.worn ? '' : ' on'}`}
            onClick={() => wearPalette(null)}
            aria-pressed={!palette.worn}
          >
            <span className="palette-swatch" style={{ background: '#a9bcd6' }} aria-hidden="true" />
            <span className="palette-copy">
              <b>Default</b>
              <small>No accent</small>
            </span>
            {!palette.worn && <span className="palette-state">WORN</span>}
          </button>

          {PALETTES.map((entry) => {
            const unlocked = palette.unlocked.includes(entry.id);
            const isWorn = palette.worn === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                className={`palette-chip${unlocked ? '' : ' locked'}${isWorn ? ' on' : ''}`}
                disabled={!unlocked}
                onClick={() => wearPalette(isWorn ? null : entry.id)}
                aria-pressed={isWorn}
                aria-label={
                  unlocked ? `Wear ${entry.name}` : `${entry.name} locked: ${entry.unlock}`
                }
              >
                <span className="palette-swatch" style={{ background: entry.swatch }} aria-hidden="true" />
                <span className="palette-copy">
                  <b>{entry.name}</b>
                  <small>{unlocked ? entry.unlock : `LOCKED · ${entry.unlock}`}</small>
                </span>
                {isWorn && <span className="palette-state">WORN</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
