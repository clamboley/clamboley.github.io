#!/bin/bash
# Web-ready GLB: simplify, resize textures, WebP, meshopt compression.
#   tools/gen/optimize_glb.sh in.glb out.glb [simplify-ratio] [simplify-error] [texture-size]
set -euo pipefail
in="$1"; out="$2"; ratio="${3:-0.02}"; error="${4:-0.004}"; tex="${5:-512}"
mkdir -p "$(dirname "$out")"
npx --yes @gltf-transform/cli optimize "$in" "$out" \
  --simplify-ratio "$ratio" --simplify-error "$error" \
  --texture-size "$tex" --texture-compress webp \
  --compress meshopt 2>&1 | grep -E "info:|error" || true
