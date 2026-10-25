import { clampVolume, loadSettings, saveSettings } from '../state/settings';
import { BEAT_MS, musicEvents } from './music';
import type { MusicMood, Wave } from './music';

export type { MusicMood } from './music';

export type Sfx =
  | 'hit'
  | 'crit'
  | 'hurt'
  | 'block'
  | 'surge'
  | 'kill'
  | 'boss'
  | 'bossSpawn'
  | 'loot'
  | 'level'
  | 'stage'
  | 'ascend'
  | 'death'
  | 'enhance'
  | 'heal'
  | 'shield'
  | 'buff'
  | 'ui';


function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// All audio is synthesised on the fly: no asset files, no network requests.
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private settings = loadSettings();
  private unlocked = false;
  private hidden = false;
  private mood: MusicMood = 'calm';
  private beatTimer: ReturnType<typeof setInterval> | null = null;
  private beatStep = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatWanted = false;

  get muted(): boolean {
    return this.settings.muted;
  }

  get musicVolume(): number {
    return this.settings.musicVolume;
  }

  get sfxVolume(): number {
    return this.settings.sfxVolume;
  }

  get musicMood(): MusicMood {
    return this.mood;
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    saveSettings({ muted });
    this.applyVolumes();

    if (muted) this.stopMusic();
    else this.startMusic();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = clampVolume(volume);
    saveSettings({ musicVolume: this.settings.musicVolume });
    this.applyVolumes();
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = clampVolume(volume);
    saveSettings({ sfxVolume: this.settings.sfxVolume });
    this.applyVolumes();
  }

  // The score follows the fight: calm farm loop, darker boss theme, faster rift arps.
  setMood(mood: MusicMood): void {
    if (this.mood === mood) return;
    this.mood = mood;
    this.stopMusic();
    this.startMusic();
  }

  // Browsers only allow audio after a gesture, so this runs on the first tap.
  unlock(): void {
    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      const ctor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!ctor) return;

      try {
        const ctx = new ctor();
        const master = ctx.createGain();
        master.gain.value = this.settings.muted ? 0 : 0.9;
        master.connect(ctx.destination);

        const musicBus = ctx.createGain();
        musicBus.gain.value = this.settings.musicVolume;
        musicBus.connect(master);

        const sfxBus = ctx.createGain();
        sfxBus.gain.value = this.settings.sfxVolume;
        sfxBus.connect(master);

        // iOS suspends the context on interruptions (calls, lock screen); resume when it can.
        ctx.onstatechange = () => {
          if (ctx.state === 'suspended' && !this.hidden && !this.settings.muted) {
            void ctx.resume().catch(() => undefined);
          }
        };

        this.ctx = ctx;
        this.master = master;
        this.musicBus = musicBus;
        this.sfxBus = sfxBus;
        this.noiseBuffer = createNoiseBuffer(ctx);
      } catch {
        this.ctx = null;
        return;
      }
    }

    const ctx = this.ctx;
    if (!ctx) return;

    this.unlocked = true;
    if (ctx.state === 'suspended') void ctx.resume();
    this.startMusic();
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (hidden) {
      this.stopMusic();
      this.stopHeartbeat();
    } else if (this.unlocked) {
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
      this.startMusic();
      if (this.heartbeatWanted) this.startHeartbeat();
    }
  }

  setHeartbeat(on: boolean): void {
    if (this.heartbeatWanted === on) return;
    this.heartbeatWanted = on;

    if (on) this.startHeartbeat();
    else this.stopHeartbeat();
  }

  play(sfx: Sfx): void {
    if (!this.ctx || !this.sfxBus || this.settings.muted) return;

    const now = this.ctx.currentTime + 0.005;

    switch (sfx) {
      case 'hit':
        this.tone(190, 80, 0.07, 'square', 0.035, now);
        this.noise(0.05, 0.025, now, 1500);
        break;
      case 'crit':
        this.tone(340, 110, 0.14, 'sawtooth', 0.055, now);
        this.noise(0.09, 0.04, now, 2200);
        break;
      case 'hurt':
        this.tone(140, 65, 0.12, 'triangle', 0.05, now);
        break;
      case 'block':
        this.tone(760, 520, 0.09, 'sine', 0.03, now);
        break;
      case 'surge':
        this.notes([392, 587.33, 783.99, 1174.66], 0.07, 0.5, 'sine', 0.05);
        this.tone(196, 98, 0.5, 'triangle', 0.04, now);
        break;
      case 'kill':
        this.tone(240, 55, 0.26, 'triangle', 0.05, now);
        this.noise(0.12, 0.025, now + 0.02, 900);
        break;
      case 'boss':
        this.tone(110, 40, 0.5, 'sawtooth', 0.07, now);
        this.noise(0.32, 0.05, now, 500);
        break;
      case 'bossSpawn':
        this.tone(80, 46, 0.45, 'sawtooth', 0.06, now);
        this.notes([62, 58], 0.16, 0.4, 'triangle', 0.045);
        break;
      case 'loot':
        this.notes([660, 880], 0.07, 0.12, 'sine', 0.035);
        break;
      case 'level':
        this.notes([523.25, 659.25, 783.99], 0.09, 0.2, 'triangle', 0.04);
        break;
      case 'stage':
        this.notes([392, 523.25, 659.25], 0.11, 0.24, 'triangle', 0.04);
        break;
      case 'ascend':
        this.notes([523.25, 659.25, 783.99, 1046.5], 0.12, 0.55, 'sine', 0.045);
        break;
      case 'death':
        this.tone(220, 48, 0.45, 'triangle', 0.05, now);
        break;
      case 'enhance':
        this.tone(880, 1320, 0.1, 'square', 0.025, now);
        this.notes([1046.5, 1568], 0.05, 0.18, 'sine', 0.025);
        break;
      case 'heal':
        this.tone(523.25, 783.99, 0.22, 'sine', 0.035, now);
        break;
      case 'shield':
        this.tone(330, 494, 0.2, 'triangle', 0.035, now);
        break;
      case 'buff':
        this.tone(440, 660, 0.16, 'square', 0.025, now);
        break;
      case 'ui':
        this.tone(620, 520, 0.035, 'sine', 0.018, now);
        break;
      default:
        break;
    }
  }

  private applyVolumes(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    this.master?.gain.setTargetAtTime(this.settings.muted ? 0 : 0.9, now, 0.02);
    this.musicBus?.gain.setTargetAtTime(this.settings.musicVolume, now, 0.02);
    this.sfxBus?.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.02);
  }

  private startMusic(): void {
    if (!this.ctx || !this.musicBus || this.settings.muted || this.hidden || this.beatTimer) return;
    this.beatStep = 0;
    this.beat();
    this.beatTimer = setInterval(() => this.beat(), BEAT_MS);
  }

  private stopMusic(): void {
    if (this.beatTimer !== null) {
      clearInterval(this.beatTimer);
      this.beatTimer = null;
    }
  }

  private beat(): void {
    if (!this.ctx || !this.musicBus || this.settings.muted || this.hidden) return;

    const step = this.beatStep;
    this.beatStep += 1;

    for (const event of musicEvents(this.mood, step)) {
      if (event.type === 'pad') {
        this.pad(event.freqs, event.duration, event.peak, event.wave);
      } else if (event.type === 'tone') {
        this.musicTone(
          event.freq,
          event.to ?? event.freq,
          event.duration,
          event.wave,
          event.peak,
        );
      } else {
        this.musicNoise(event.duration, event.peak, event.cutoff);
      }
    }
  }

  private pad(freqs: number[], duration: number, peak: number, type: Wave): void {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus) return;

    const start = ctx.currentTime + 0.05;
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 6;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + duration * 0.3);
      gain.gain.linearRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(bus);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    }
  }

  private musicTone(
    from: number,
    to: number,
    duration: number,
    type: Wave,
    peak: number,
  ): void {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus) return;

    const at = ctx.currentTime + 0.005;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.012, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + duration + 0.03);
  }

  private musicNoise(duration: number, peak: number, cutoff: number): void {
    const ctx = this.ctx;
    const bus = this.musicBus;
    const buffer = this.noiseBuffer;
    if (!ctx || !bus || !buffer) return;

    const at = ctx.currentTime + 0.005;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(at);
    source.stop(at + duration + 0.02);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer !== null) return;
    this.thump();
    this.heartbeatTimer = setInterval(() => this.thump(), 900);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private thump(): void {
    if (!this.ctx || this.settings.muted || this.hidden) return;

    const now = this.ctx.currentTime + 0.01;
    this.tone(64, 38, 0.2, 'sine', 0.05, now);
    this.tone(58, 34, 0.16, 'sine', 0.028, now + 0.21);
  }

  private tone(
    from: number,
    to: number,
    duration: number,
    type: Wave,
    peak: number,
    at: number,
  ): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.012, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + duration + 0.03);
  }

  private notes(freqs: number[], step: number, duration: number, type: Wave, peak: number): void {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + 0.005;
    freqs.forEach((freq, index) => {
      this.tone(freq, freq, duration, type, peak, start + index * step);
    });
  }

  private noise(duration: number, peak: number, at: number, cutoff: number): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    const buffer = this.noiseBuffer;
    if (!ctx || !bus || !buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(at);
    source.stop(at + duration + 0.02);
  }
}

export const sound = new SoundEngine();
