import { useState } from 'react';
import {
  MAX_ACTIVE_SKILLS,
  SKILLS,
  SKILL_MAX_LEVEL,
  activeSkills,
  passiveSkills,
  skillById,
  skillEffectText,
  skillUpgradeCost,
} from '../data/skills';
import { useGameStore } from '../state/store';
import { fmt } from './format';

type Picker = { kind: 'active'; slot: number } | { kind: 'passive' };

export default function SkillsPanel() {
  const books = useGameStore((state) => state.books);
  const skills = useGameStore((state) => state.skills);
  const setSkill = useGameStore((state) => state.setSkill);
  const setPassive = useGameStore((state) => state.setPassive);
  const upgradeSkill = useGameStore((state) => state.upgradeSkill);
  const [picker, setPicker] = useState<Picker | null>(null);

  const options = picker
    ? picker.kind === 'active'
      ? activeSkills()
      : passiveSkills()
    : [];

  const assign = (id: string | null) => {
    if (!picker) return;
    if (picker.kind === 'active') setSkill(picker.slot, id);
    else setPassive(id);
    setPicker(null);
  };

  const passiveInfo = skillById(skills.passive);

  return (
    <div className="skills-panel">
      <div className="section-head">
        <span>SKILL BOOKS</span>
        <span>▤ {fmt(books)}</span>
      </div>
      <p className="detail-note">
        Auto-cast mengikuti urutan slot: slot 1 cast lebih dulu, dengan jeda global 2 detik antar cast. Skill book didapat dari boss.
      </p>

      <div className="skill-slots">
        {Array.from({ length: MAX_ACTIVE_SKILLS }, (_, slot) => {
          const info = skillById(skills.active[slot]);
          const level = info ? (skills.levels[info.id] ?? 1) : 1;
          return (
            <button
              key={slot}
              type="button"
              className="skill-slot"
              onClick={() => setPicker({ kind: 'active', slot })}
            >
              <span className="skill-slot-label">SLOT {slot + 1}</span>
              <span
                className="skill-slot-name"
                style={info ? { color: info.color } : undefined}
              >
                {info ? info.name : 'EMPTY'}
              </span>
              <span className="skill-slot-meta">{info ? `LV ${level}` : 'TAP TO SET'}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="skill-slot passive"
        onClick={() => setPicker({ kind: 'passive' })}
      >
        <span className="skill-slot-label">PASSIVE</span>
        <span
          className="skill-slot-name"
          style={passiveInfo ? { color: passiveInfo.color } : undefined}
        >
          {passiveInfo ? passiveInfo.name : 'EMPTY'}
        </span>
        <span className="skill-slot-meta">
          {passiveInfo ? `LV ${skills.levels[passiveInfo.id] ?? 1}` : 'TAP TO SET'}
        </span>
      </button>

      {picker && (
        <div className="skill-picker">
          <div className="section-head">
            <span>
              {picker.kind === 'active' ? `PICK SLOT ${picker.slot + 1}` : 'PICK PASSIVE'}
            </span>
            <span>AUTO-CAST</span>
          </div>
          <div className="skill-pick-list">
            {options.map((info) => (
              <button
                key={info.id}
                type="button"
                className="skill-pick"
                onClick={() => assign(info.id)}
              >
                <span className="skill-pick-name" style={{ color: info.color }}>
                  {info.name}
                </span>
                <span className="skill-pick-effect">
                  {skillEffectText(info, skills.levels[info.id] ?? 1)}
                </span>
              </button>
            ))}
            <button type="button" className="skill-pick clear" onClick={() => assign(null)}>
              CLEAR SLOT
            </button>
          </div>
        </div>
      )}

      <div className="section-head library-head">
        <span>SKILL LIBRARY</span>
        <span>MAX LV {SKILL_MAX_LEVEL}</span>
      </div>

      <ul className="skill-list">
        {SKILLS.map((info) => {
          const level = skills.levels[info.id] ?? 1;
          const maxed = level >= SKILL_MAX_LEVEL;
          const cost = skillUpgradeCost(level);

          return (
            <li key={info.id} className="skill-row">
              <div className="skill-row-top">
                <span className="skill-name" style={{ color: info.color }}>
                  {info.name}
                </span>
                <span className="skill-type">
                  {info.type === 'active' ? 'ACTIVE' : 'PASSIVE'} · LV {level}
                </span>
              </div>
              <span className="skill-effect">{skillEffectText(info, level)}</span>
              <button
                type="button"
                className="skill-up"
                onClick={() => upgradeSkill(info.id)}
                disabled={maxed || books < cost}
              >
                {maxed ? 'MAX' : `UPGRADE · ▤${cost}`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
