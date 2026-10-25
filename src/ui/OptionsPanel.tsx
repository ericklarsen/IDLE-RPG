import { useState } from 'react';
import { sound } from '../audio/sound';
import { isMotionReduced, setMotionReduced } from '../state/motion';

/** Audio and motion controls, moved out of the battle HUD. */
export default function OptionsPanel() {
  const [muted, setMuted] = useState(() => sound.muted);
  const [reduceMotion, setReduceMotionState] = useState(() => isMotionReduced());
  const [levels, setLevels] = useState(() => ({
    music: Math.round(sound.musicVolume * 100),
    sfx: Math.round(sound.sfxVolume * 100),
  }));

  const changeMusic = (pct: number) => {
    sound.setMusicVolume(pct / 100);
    setLevels((current) => ({ ...current, music: pct }));
  };

  const changeSfx = (pct: number) => {
    sound.setSfxVolume(pct / 100);
    setLevels((current) => ({ ...current, sfx: pct }));
  };

  const toggleMotion = () => {
    const next = !reduceMotion;
    setMotionReduced(next);
    setReduceMotionState(next);
  };

  return (
    <div className="options-panel">
      <div className="section-head">
        <span>AUDIO</span>
        <span>{muted ? 'MUTED' : 'ON'}</span>
      </div>

      <div className="option-row">
        <span>SOUND</span>
        <button
          type="button"
          className={`motion-btn${muted ? '' : ' on'}`}
          aria-pressed={!muted}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          onClick={() => {
            sound.unlock();
            setMuted(sound.toggleMuted());
          }}
        >
          {muted ? 'OFF' : 'ON'}
        </button>
      </div>

      <label className="option-row">
        <span>MUSIC</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={levels.music}
          aria-label="Music volume"
          onChange={(event) => changeMusic(Number(event.target.value))}
        />
        <b>{levels.music}%</b>
      </label>

      <label className="option-row">
        <span>SFX</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={levels.sfx}
          aria-label="Sound effects volume"
          onChange={(event) => changeSfx(Number(event.target.value))}
        />
        <b>{levels.sfx}%</b>
      </label>

      <div className="section-head">
        <span>MOTION</span>
        <span>{reduceMotion ? 'REDUCED' : 'FULL'}</span>
      </div>

      <div className="option-row">
        <span>EFFECTS</span>
        <button
          type="button"
          className={`motion-btn${reduceMotion ? ' on' : ''}`}
          aria-pressed={reduceMotion}
          aria-label={reduceMotion ? 'Enable motion effects' : 'Reduce motion'}
          onClick={toggleMotion}
        >
          {reduceMotion ? 'REDUCED' : 'FULL'}
        </button>
      </div>

      <p className="options-note">
        Reduced motion turns off screen shake, boss zoom, and the pulsing health vignette.
      </p>
    </div>
  );
}
