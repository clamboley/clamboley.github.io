import type { Fill, KitKey, SynthVoice } from '../kit.types.ts';
import { Synth } from './synth.ts';

/** Latency margin between scheduling and the first stroke, in seconds. */
const SCHEDULE_AHEAD = 0.06;

interface Graph {
  ctx: AudioContext;
  synth: Synth;
  master: GainNode;
}

/**
 * Owns the AudioContext (created on the first user gesture, as browsers
 * require) and schedules fills on the audio clock, which is the time
 * reference the visuals synchronise to.
 */
export class AudioEngine {
  private graph: Graph | null = null;
  private readonly samples = new Map<string, AudioBuffer>();

  /** Current time on the audio clock (0 until unlocked). */
  get currentTime(): number {
    return this.graph?.ctx.currentTime ?? 0;
  }

  /** Must be called from a user gesture. Idempotent. */
  unlock(): void {
    if (!this.graph) {
      const ctx = new AudioContext();
      const compressor = ctx.createDynamicsCompressor();
      const master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(compressor);
      compressor.connect(ctx.destination);
      this.graph = { ctx, master, synth: new Synth(ctx, master) };
    }
    if (this.graph.ctx.state === 'suspended') void this.graph.ctx.resume();
  }

  /** Fetches and decodes a sample so it is ready when a fill needs it. */
  async preload(url: string): Promise<void> {
    if (this.samples.has(url)) return;
    const graph = this.requireGraph();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cannot load sample ${url} (${response.status})`);
    const buffer = await graph.ctx.decodeAudioData(await response.arrayBuffer());
    this.samples.set(url, buffer);
  }

  /**
   * Plays a fill and returns its start time on the audio clock.
   * With a recorded sample the audio is the sample itself; otherwise each
   * stroke of the timeline is synthesized with the voice of its element.
   */
  playFill(fill: Fill, voiceOf: (key: KitKey) => SynthVoice): number {
    const graph = this.requireGraph();
    const start = graph.ctx.currentTime + SCHEDULE_AHEAD;

    const sample = fill.sample === null ? undefined : this.samples.get(fill.sample);
    if (sample) {
      const source = graph.ctx.createBufferSource();
      source.buffer = sample;
      source.connect(graph.master);
      source.start(start);
    } else {
      if (fill.sample !== null) console.warn(`Sample ${fill.sample} not loaded, synthesizing`);
      for (const hit of fill.hits) graph.synth.play(voiceOf(hit.key), start + hit.t, hit.velocity);
    }
    return start;
  }

  cheer(at: number): void {
    this.requireGraph().synth.cheer(at);
  }

  private requireGraph(): Graph {
    if (!this.graph)
      throw new Error('AudioEngine.unlock() must be called from a user gesture first');
    return this.graph;
  }
}
