#!/usr/bin/env python3
"""Checks that a fill's audio export runs at the tempo its MIDI export claims.

    python3 tools/fills/tempocheck.py tools/fills/scores/floor.mid public/samples/fills/floor.wav

Correlates the WAV's onset flux with the MIDI hit grid over a range of
time-scale factors and reports the best one. A scale of 1.0 means the two
exports agree; otherwise pass the printed --tempo to midi2fill.mjs.
Needs ffmpeg on the PATH.
"""
import re, struct, subprocess, sys, tempfile, wave

mid, wav = sys.argv[1], sys.argv[2]
out = subprocess.run(['node', 'tools/fills/midi2fill.mjs', mid], capture_output=True, text=True, check=True)
tempo = int(re.search(r'tempo (\d+) bpm', out.stderr).group(1))
times = sorted({float(t) for t in re.findall(r'\{ t: ([\d.]+),', out.stdout)})

with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '48000',
                    '-c:a', 'pcm_s16le', tmp.name], check=True)
    with wave.open(tmp.name, 'rb') as w:
        fs, n = w.getframerate(), w.getnframes()
        mono = struct.unpack(f'<{n}h', w.readframes(n))

hop_s = 0.002
hop = int(fs * hop_s)
env = [sum(abs(x) for x in mono[i:i + hop]) / hop for i in range(0, n - hop, hop)]
flux = [max(0.0, env[i] - env[i - 1]) for i in range(1, len(env))]

def score(scale):
    total = 0.0
    for t in times:
        i = int(t * scale / hop_s)
        if i + 2 < len(flux):
            total += flux[i] + flux[i + 1] + flux[i + 2]
    return total

# the phrase has to fit inside the file: rules out the x1.5 aliases of swung grids
duration = n / fs
max_scale = (duration - 0.2) / times[-1]
coarse = max((score(s / 100), s / 100) for s in range(40, 251) if s / 100 <= max_scale)
fine = max((score(s / 1000), s / 1000) for s in range(int(coarse[1] * 1000) - 30, int(coarse[1] * 1000) + 31))
scale = fine[1]
unity = score(1.0)
print(f'MIDI tempo {tempo} bpm, {len(times)} onsets, last at {times[-1]:.3f} s; wav {duration:.2f} s (scale <= {max_scale:.2f})')
print(f'best scale {scale:.3f} (score x{fine[0] / max(unity, 1e-9):.2f} vs 1.0)')
if abs(scale - 1) < 0.03:
    print('=> exports agree, no --tempo needed')
else:
    print(f'=> audio runs at ~{tempo / scale:.1f} bpm: use --tempo {round(tempo / scale)} '
          f'(phrase lasts {times[-1] * scale:.2f} s)')
