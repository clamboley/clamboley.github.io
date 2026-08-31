#!/bin/bash
# Web-ready copies of TRELLIS.2 exports (already decimated at export time):
# WebP textures + meshopt compression, no further simplification.
#   tools/gen/ingest.sh $SHARE/outputs/stadium-web-lite crowd 'fan-*'
set -euo pipefail
src="$1"; dst="public/models/$2"; pattern="${3:-*}"
mkdir -p "$dst"
for f in "$src"/$pattern.glb; do
  [ -f "$f" ] || continue
  npx --yes @gltf-transform/cli optimize "$f" "$dst/$(basename "$f")" \
    --simplify false --texture-compress webp --compress meshopt 2>&1 | grep -E "info:|error" || true
done
du -sh "$dst"
