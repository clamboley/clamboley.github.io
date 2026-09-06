#!/usr/bin/env bash
# Encodes the MuseScore WAV exports into the MP3s the site preloads.
# The WAVs stay the sources (tools/fills/audio/); only the MP3s ship in public/.
# Re-run after adding a fill: ./tools/fills/encode.sh
set -euo pipefail

SRC="tools/fills/audio"
DST="public/samples/fills"
mkdir -p "$DST"

for wav in "$SRC"/*.wav; do
  mp3="$DST/$(basename "${wav%.wav}.mp3")"
  ffmpeg -y -hide_banner -loglevel error -i "$wav" -codec:a libmp3lame -q:a 2 -map_metadata 0 "$mp3"
  echo "$mp3"
done
