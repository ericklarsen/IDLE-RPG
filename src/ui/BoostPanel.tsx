import { BOOST_BRANCHES, BOOST_MAX, BOOST_ORDER, boostCost } from '../data/boost';
import { ELEMENT_COLOR, ELEMENT_SHORT } from '../data/elements';
import { PETS, PET_MAX_CAP, PET_SYNTH_STEP } from '../data/pets';
import { useGameStore } from '../state/store';
import { fmt } from './format';

export default function BoostPanel() {
  const cores = useGameStore((state) => state.cores);
  const boosts = useGameStore((state) => state.boosts);
  const upgradeBoost = useGameStore((state) => state.upgradeBoost);
  const respecBoosts = useGameStore((state) => state.respecBoosts);
  const pets = useGameStore((state) => state.pets);
  const upgradePet = useGameStore((state) => state.upgradePet);
  const setActivePet = useGameStore((state) => state.setActivePet);
  const synthesizePet = useGameStore((state) => state.synthesizePet);

  const totalLevels = BOOST_ORDER.reduce((sum, branch) => sum + boosts[branch], 0);

  return (
    <div className="boost-panel">
      <div className="section-head">
        <span>BOSS CORES</span>
        <span>✦ {fmt(cores)}</span>
      </div>
      <p className="detail-note">
        Boost permanen. Setiap boss wave 10 memberi core; respec mengembalikan semuanya.
      </p>

      <ul className="boost-list">
        {BOOST_ORDER.map((branch) => {
          const info = BOOST_BRANCHES[branch];
          const level = boosts[branch];
          const cost = boostCost(level);
          const maxed = level >= BOOST_MAX;
          const total = Math.round(info.per * level * 1000) / 10;

          return (
            <li key={branch} className="boost-row">
              <div className="boost-main">
                <span className="boost-name" style={{ color: info.color }}>
                  {info.label}
                </span>
                <span className="boost-level">
                  RANK {level}/{BOOST_MAX}
                </span>
              </div>
              <span className="boost-effect">
                {info.effect} per rank · total +{total}%
              </span>
              <button
                type="button"
                className="boost-btn"
                onClick={() => upgradeBoost(branch)}
                disabled={maxed || cores < cost}
              >
                {maxed ? 'MAX' : `+1 · ✦${cost}`}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="respec-btn"
        onClick={respecBoosts}
        disabled={totalLevels === 0}
      >
        RESPEC · REFUND ALL
      </button>

      <div className="section-head bag-head">
        <span>WISPS</span>
        <span>{pets.active ? `ACTIVE: ${pets.active.toUpperCase()}` : 'ONE AT A TIME'}</span>
      </div>

      <p className="detail-note">
        One wisp fights at a time. Gold trains the level; duplicate eggs from bosses and
        tower caches raise the ceiling by {PET_SYNTH_STEP} (max {PET_MAX_CAP}).
      </p>

      <div className="pet-list">
        {pets.pets.map((pet) => {
          const info = PETS.find((entry) => entry.id === pet.id)!;
          const isActive = pets.active === pet.id;
          const atCeiling = pet.level >= pet.maxLevel;

          return (
            <div
              key={pet.id}
              className={`companion-card${isActive ? ' on' : ''}${pet.unlocked ? '' : ' locked'}`}
              style={{ borderLeftColor: info.color }}
            >
              <div className="companion-head">
                <span className="companion-name" style={{ color: pet.unlocked ? info.color : undefined }}>
                  {pet.name}
                </span>
                <span className="elem-tag" style={{ color: ELEMENT_COLOR[info.element] }}>
                  {ELEMENT_SHORT[info.element]}
                </span>
                <span className="companion-stats">
                  {pet.unlocked ? `LV ${pet.level}/${pet.maxLevel}` : `STAGE ${info.unlockStage}`}
                </span>
              </div>

              {pet.unlocked ? (
                <>
                  <span className="pet-stats">
                    {fmt(pet.damage)} DMG · {fmt(pet.dps)} DPS · {pet.eggs} EGG
                    {pet.eggs === 1 ? '' : 'S'}
                  </span>
                  <p className="detail-note">{info.desc}</p>

                  <div className="pet-actions">
                    <button
                      type="button"
                      className={`companion-btn${isActive ? ' on' : ''}`}
                      onClick={() => (isActive ? setActivePet(null) : setActivePet(pet.id))}
                    >
                      {isActive ? 'REST' : 'SET ACTIVE'}
                    </button>
                    <button
                      type="button"
                      className="companion-btn"
                      onClick={() => upgradePet(pet.id)}
                      disabled={atCeiling || !pet.upgradeable}
                    >
                      {atCeiling ? 'MAX LEVEL' : `TRAIN · ◆${fmt(pet.cost)}`}
                    </button>
                    {pet.eggs > 0 && pet.maxLevel < PET_MAX_CAP && (
                      <button
                        type="button"
                        className="companion-btn synth"
                        onClick={() => synthesizePet(pet.id)}
                      >
                        SYNTHESISE · +{PET_SYNTH_STEP} CAP
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="detail-note">
                  Clear stage {info.unlockStage} to awaken the {pet.name}.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
