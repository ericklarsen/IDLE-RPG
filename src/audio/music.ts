export type MusicMood = 'calm' | 'boss' | 'rift';

export type Wave = OscillatorType;

export type MusicEvent =
  | { type: 'pad'; freqs: number[]; duration: number; peak: number; wave: Wave }
  | { type: 'tone'; freq: number; to?: number; duration: number; peak: number; wave: Wave }
  | { type: 'noise'; duration: number; peak: number; cutoff: number };

// One beat drives every music layer; each mood triggers its layers on beat multiples.
export const BEAT_MS = 240;

export const CHORDS: Record<MusicMood, number[][]> = {
  calm: [
    [110, 164.81, 220],
    [98, 146.83, 196],
    [87.31, 130.81, 174.61],
    [98, 146.83, 196],
  ],
  boss: [
    [73.42, 87.31, 110],
    [58.27, 87.31, 116.54],
    [49, 73.42, 98],
    [55, 82.41, 110],
  ],
  rift: [
    [87.31, 130.81, 174.61],
    [98, 146.83, 196],
    [110, 164.81, 220],
    [103.83, 155.56, 207.65],
  ],
};

export const RIFT_ARP = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63];

// Pure: given a mood and a beat index, what should be scheduled right now.
export function musicEvents(mood: MusicMood, step: number): MusicEvent[] {
  if (mood === 'calm') {
    if (step % 21 !== 0) return [];
    return [
      {
        type: 'pad',
        freqs: CHORDS.calm[(step / 21) % CHORDS.calm.length],
        duration: 5.04,
        peak: 0.02,
        wave: 'sine',
      },
    ];
  }

  if (mood === 'boss') {
    const events: MusicEvent[] = [];
    if (step % 19 === 0) {
      events.push({
        type: 'pad',
        freqs: CHORDS.boss[(step / 19) % CHORDS.boss.length],
        duration: 4.56,
        peak: 0.018,
        wave: 'sine',
      });
    }
    // A low pulse underneath every third beat keeps boss fights moving.
    if (step % 3 === 0) {
      events.push({ type: 'tone', freq: 56, to: 38, duration: 0.24, peak: 0.05, wave: 'sine' });
    }
    if (step % 12 === 6) {
      events.push({ type: 'tone', freq: 659.25, duration: 0.42, peak: 0.007, wave: 'sine' });
    }
    return events;
  }

  const events: MusicEvent[] = [];
  if (step % 15 === 0) {
    events.push({
      type: 'pad',
      freqs: CHORDS.rift[(step / 15) % CHORDS.rift.length],
      duration: 3.6,
      peak: 0.013,
      wave: 'triangle',
    });
  }
  events.push({
    type: 'tone',
    freq: RIFT_ARP[step % RIFT_ARP.length],
    duration: 0.16,
    peak: 0.016,
    wave: 'triangle',
  });
  if (step % 2 === 1) {
    events.push({ type: 'noise', duration: 0.045, peak: 0.01, cutoff: 6000 });
  }
  return events;
}
