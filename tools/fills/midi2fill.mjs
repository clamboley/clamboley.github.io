#!/usr/bin/env node
/**
 * Converts a MuseScore drumset MIDI export into a Fill literal for
 * src/audio/songFills.ts. Usage:
 *   node tools/fills/midi2fill.mjs tools/fills/scores/floor.mid [samples/fills/floor.wav]
 * Prints the TS snippet, plus warnings (unmapped notes, duration).
 */
import { readFileSync } from 'node:fs';

/** General MIDI percussion -> kit element. */
const GM = new Map([
  [35, 'kick'],
  [36, 'kick'],
  [37, 'snare'],
  [38, 'snare'],
  [40, 'snare'],
  [41, 'floor'],
  [43, 'floor'],
  [45, 'tom2'],
  [47, 'tom2'],
  [48, 'tom1'],
  [50, 'tom1'],
  [42, 'hihat'],
  [44, 'hihat'],
  [46, 'hihat'],
  [49, 'crash'],
  [55, 'crash'],
  [57, 'crash'],
  [52, 'crash'],
  [51, 'ride'],
  [53, 'ride'],
  [59, 'ride'],
]);

const path = process.argv[2];
if (!path) {
  console.error('usage: midi2fill.mjs <file.mid> [sample-path.wav]');
  process.exit(1);
}
const sample = process.argv[3] ?? null;
const data = readFileSync(path);

let pos = 0;
const u32 = () => {
  const v = data.readUInt32BE(pos);
  pos += 4;
  return v;
};
const u16 = () => {
  const v = data.readUInt16BE(pos);
  pos += 2;
  return v;
};
const u8 = () => data[pos++];
const varlen = () => {
  let v = 0,
    b;
  do {
    b = u8();
    v = (v << 7) | (b & 0x7f);
  } while (b & 0x80);
  return v;
};

if (data.toString('latin1', 0, 4) !== 'MThd') throw new Error('not a MIDI file');
pos = 8;
u16(); // format
const ntrks = u16();
const division = u16();
if (division & 0x8000) throw new Error('SMPTE time not supported');

const tempos = [{ tick: 0, usPerQuarter: 500000 }];
const notes = [];
const unmapped = new Map();
const skippedChannels = new Set();
for (let trk = 0; trk < ntrks; trk++) {
  if (data.toString('latin1', pos, pos + 4) !== 'MTrk') throw new Error('bad track header');
  pos += 4;
  const end = pos + 4 + u32();
  let tick = 0;
  let status = 0;
  while (pos < end) {
    tick += varlen();
    let b = u8();
    if (b < 0x80) {
      pos--;
      b = status;
    } else status = b;
    if (b === 0xff) {
      const type = u8();
      const len = varlen();
      if (type === 0x51)
        tempos.push({
          tick,
          usPerQuarter: (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2],
        });
      pos += len;
    } else if (b === 0xf0 || b === 0xf7) {
      pos += varlen();
    } else {
      const kind = b & 0xf0;
      const d1 = u8();
      const d2 = kind === 0xc0 || kind === 0xd0 ? 0 : u8();
      if (kind === 0x90 && d2 > 0) {
        // GM percussion lives on channel 10 (0-indexed 9); anything else is
        // another instrument (guitar, bass...) and must not become a drum
        if ((b & 0x0f) !== 9) skippedChannels.add((b & 0x0f) + 1);
        else {
          const key = GM.get(d1);
          if (key) notes.push({ tick, key, velocity: d2 / 127 });
          else unmapped.set(d1, (unmapped.get(d1) ?? 0) + 1);
        }
      }
    }
  }
  pos = end;
}

tempos.sort((a, b) => a.tick - b.tick);
const toSeconds = (tick) => {
  let s = 0,
    last = tempos[0];
  for (const t of tempos) {
    if (t.tick >= tick) break;
    s += ((t.tick - last.tick) / division) * (last.usPerQuarter / 1e6);
    last = t;
  }
  return s + ((tick - last.tick) / division) * (last.usPerQuarter / 1e6);
};

const hits = notes
  .map((n) => ({
    t: Math.round(toSeconds(n.tick) * 1000) / 1000,
    key: n.key,
    velocity: Math.max(0.05, Math.round(n.velocity * 100) / 100),
  }))
  .sort((a, b) => a.t - b.t || a.key.localeCompare(b.key));

if (hits.length === 0) {
  console.error('no mapped drum notes found');
  process.exit(1);
}
if (skippedChannels.size > 0)
  console.error(`! non-drum channels ignored: ${[...skippedChannels].join(', ')}`);
for (const [pitch, count] of unmapped)
  console.error(`! unmapped GM note ${String(pitch)} (x${String(count)}) ignored`);
const lastT = hits[hits.length - 1].t;
if (lastT + 0.45 > 2.6)
  console.error(`! fill lasts ${(lastT + 0.45).toFixed(2)} s with tail — over the 2.6 s budget`);
console.error(
  `${String(hits.length)} hits, last at ${lastT.toFixed(3)} s, tempo ${String(Math.round(6e7 / tempos[tempos.length - 1].usPerQuarter))} bpm`,
);

const lines = hits.map(
  (h) => `    { t: ${String(h.t)}, key: '${h.key}', velocity: ${String(h.velocity)} },`,
);
console.log(
  `{\n  sample: ${sample ? `'${sample}'` : 'null'},\n  hits: [\n${lines.join('\n')}\n  ],\n}`,
);
