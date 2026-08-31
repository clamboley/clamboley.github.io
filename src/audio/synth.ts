import type { SynthVoice } from '../kit.types.ts';

/**
 * Temporary drum voices synthesized with the Web Audio API.
 * Replaced by recorded samples at step 3 — kept small on purpose.
 */
export class Synth {
  private readonly noise: AudioBuffer;

  constructor(
    private readonly ctx: AudioContext,
    private readonly output: AudioNode,
  ) {
    const length = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  play(voice: SynthVoice, at: number, velocity: number): void {
    switch (voice.type) {
      case 'kick':
        this.kick(at, velocity);
        break;
      case 'snare':
        this.snare(at, velocity);
        break;
      case 'tom':
        this.tom(at, velocity, voice.pitch);
        break;
      case 'hat':
        this.hat(at, velocity);
        break;
      case 'crash':
        this.crash(at, velocity);
        break;
      case 'ride':
        this.ride(at, velocity);
        break;
    }
  }

  /** Woody click of two sticks against each other (the count-in). */
  stick(at: number, velocity: number): void {
    const body = this.ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(1350, at);
    body.frequency.exponentialRampToValueAtTime(900, at + 0.02);
    body.connect(this.envelope(at, 0.4 * velocity, 0.03));
    body.start(at);
    body.stop(at + 0.05);
    const snap = this.noiseSource(at, 0.03);
    const bp = this.filter('bandpass', 3200, 1.2);
    snap.connect(bp);
    bp.connect(this.envelope(at, 0.5 * velocity, 0.025));
  }

  /** Short swell of low-passed noise, stands in for the crowd cheering. */
  cheer(at: number): void {
    const source = this.noiseSource(at, 2.4);
    const filter = this.filter('lowpass', 850, 0.6);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.15, at + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
  }

  private kick(at: number, velocity: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, at);
    osc.frequency.exponentialRampToValueAtTime(46, at + 0.11);
    osc.connect(this.envelope(at, 0.95 * velocity, 0.3));
    osc.start(at);
    osc.stop(at + 0.45);
  }

  private tom(at: number, velocity: number, pitch: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, at);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.55, at + 0.28);
    osc.connect(this.envelope(at, 0.8 * velocity, 0.42));
    osc.start(at);
    osc.stop(at + 0.55);
    const attack = this.noiseSource(at, 0.05);
    const filter = this.filter('highpass', 1000);
    attack.connect(filter);
    filter.connect(this.envelope(at, 0.12 * velocity, 0.04));
  }

  private snare(at: number, velocity: number): void {
    const source = this.noiseSource(at, 0.25);
    const filter = this.filter('highpass', 1600);
    source.connect(filter);
    filter.connect(this.envelope(at, 0.7 * velocity, 0.17));
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(196, at);
    osc.connect(this.envelope(at, 0.28 * velocity, 0.08));
    osc.start(at);
    osc.stop(at + 0.15);
  }

  private hat(at: number, velocity: number): void {
    const source = this.noiseSource(at, 0.1);
    const filter = this.filter('highpass', 8200);
    source.connect(filter);
    filter.connect(this.envelope(at, 0.35 * velocity, 0.05));
  }

  private crash(at: number, velocity: number): void {
    const source = this.noiseSource(at, 1.6);
    const filter = this.filter('highpass', 4200);
    source.connect(filter);
    filter.connect(this.envelope(at, 0.5 * velocity, 1.35));
  }

  private ride(at: number, velocity: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, at);
    osc.connect(this.envelope(at, 0.22 * velocity, 0.6));
    osc.start(at);
    osc.stop(at + 0.8);
    const source = this.noiseSource(at, 0.4);
    const filter = this.filter('highpass', 6800);
    source.connect(filter);
    filter.connect(this.envelope(at, 0.18 * velocity, 0.3));
  }

  private envelope(at: number, peak: number, decay: number): GainNode {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    gain.connect(this.output);
    return gain;
  }

  private noiseSource(at: number, duration: number): AudioBufferSourceNode {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    source.start(at);
    source.stop(at + duration + 0.1);
    return source;
  }

  private filter(type: BiquadFilterType, frequency: number, q?: number): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    if (q !== undefined) filter.Q.value = q;
    return filter;
  }
}
