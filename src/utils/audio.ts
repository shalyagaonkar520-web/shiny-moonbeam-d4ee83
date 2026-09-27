// Short UI sounds, synthesised with the Web Audio API.
//
// These used to be .wav files on assets.mixkit.co, which now answers 403: every
// tap made a failed network request on mobile data and played nothing. A
// generated tone needs no download and works offline.

type Tone = { freqs: number[]; step: number; length: number; volume: number };

export const SOUNDS = {
  CLICK: 'click',
  ADD_TO_CART: 'add',
  QUANTITY_TICK: 'tick',
  ORDER_SUCCESS: 'success',
} as const;

const TONES: Record<string, Tone> = {
  click: { freqs: [880], step: 0, length: 0.05, volume: 0.05 },
  tick: { freqs: [1200], step: 0, length: 0.04, volume: 0.04 },
  add: { freqs: [660, 990], step: 0.06, length: 0.09, volume: 0.07 },
  success: { freqs: [523, 659, 784, 1047], step: 0.09, length: 0.18, volume: 0.08 },
};

let ctx: AudioContext | null = null;

export const playSound = (sound: string) => {
  try {
    const tone = TONES[sound];
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!tone || !Ctor) return;
    ctx = ctx || new Ctor();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const start = ctx.currentTime;
    tone.freqs.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      const t = start + i * tone.step;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(tone.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.length);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + tone.length + 0.02);
    });
  } catch {
    /* sound is decoration; never let it break a tap */
  }
};
