import { CHARACTERS } from '../data/characters';
import { gameController } from '../state/controller';
import { useGameStore } from '../state/store';

/**
 * Party screen: five slots and the roster. Gear and wardrobe are per
 * character, so this only decides who fights and who leads.
 */
export default function PartyPanel() {
  // Any published tick re-renders, so HP and downed state stay live.
  useGameStore((state) => state.stage);
  const view = gameController.partyView();
  const free = view.slots.indexOf(null);

  return (
    <div className="party-panel">
      <p className="party-lede">
        Up to five characters fight together. The leader is the one the HUD tracks; everyone
        else swings on their own cooldown and can be downed until the next kill.
      </p>

      <div className="party-slots">
        {view.slots.map((id, slot) => {
          const info = id ? CHARACTERS.find((entry) => entry.id === id) : null;
          const member = view.members.find((entry) => entry.id === id);
          const leader = slot === view.activeSlot;

          return (
            <div
              key={slot}
              className={`party-slot${id ? '' : ' empty'}${leader ? ' leader' : ''}`}
            >
              <span className="party-slot-index">{slot + 1}</span>
              <span className="party-slot-name">{info?.name ?? 'EMPTY'}</span>
              <span className="party-slot-role">
                {info ? `${info.role} · ${info.element}` : '—'}
              </span>
              {member && (
                <span className="party-slot-hp">
                  {member.down ? 'DOWN' : `${member.hp} / ${member.maxHp} HP`}
                </span>
              )}
              <div className="party-slot-actions">
                {id && !leader && (
                  <button
                    className="party-btn"
                    onClick={() => gameController.setActiveSlot(slot)}
                  >
                    LEAD
                  </button>
                )}
                {id && (
                  <button
                    className="party-btn"
                    onClick={() => gameController.slotCharacter(slot, null)}
                  >
                    REMOVE
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="party-heading">ROSTER</h3>
      <div className="party-roster">
        {CHARACTERS.map((info) => {
          const unlocked = view.unlocked.includes(info.id);
          const slot = view.slots.indexOf(info.id);

          return (
            <div key={info.id} className={`party-card${unlocked ? '' : ' locked'}`}>
              <span className="party-name" style={{ color: info.color }}>
                {info.name}
              </span>
              <span className="party-meta">
                {info.role} · {info.element} · unlocks at stage {info.unlockStage}
              </span>
              <span className="party-skill">
                {info.skill.name} — {info.skill.desc}
              </span>
              <span className="party-passive">{info.passive}</span>

              {slot >= 0 ? (
                <span className="party-state">IN PARTY · SLOT {slot + 1}</span>
              ) : unlocked ? (
                <button
                  className="party-btn"
                  disabled={free === -1}
                  onClick={() => gameController.slotCharacter(free, info.id)}
                >
                  {free === -1 ? 'PARTY FULL' : 'ADD'}
                </button>
              ) : (
                <span className="party-state">LOCKED</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
