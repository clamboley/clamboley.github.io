# Sourced by the sbatch jobs. The cluster gives every job a fresh local scratch
# ($WORKING_DIR, wiped afterwards): restore the packed environment there and
# export what TRELLIS.2 / diffusers need.
SHARE="${SHARE:-${SHARE:-$HOME/vitrine-gen}}"
ROOT="${ROOT:-${WORKING_DIR:-$HOME}/vitrine-gen}"
ENV="$ROOT/env"

if [ ! -x "$ENV/bin/python" ]; then
  [ -f "$SHARE/env.tar.gz" ] || { echo "missing $SHARE/env.tar.gz: run trellis2_setup.sbatch first"; exit 1; }
  echo "[$(date +%H:%M:%S)] restoring the environment into $ROOT"
  mkdir -p "$ENV"
  tar -xzf "$SHARE/env.tar.gz" -C "$ENV"
  "$ENV/bin/python" "$ENV/bin/conda-unpack"  # its shebang wants a "python" on PATH
  tar -C "$ROOT" --use-compress-program="$ENV/bin/unzstd" -xf "$SHARE/work.tar.zst"
  echo "[$(date +%H:%M:%S)] environment restored"
fi

export PATH="$ENV/bin:$PATH"
export LD_LIBRARY_PATH="$ENV/lib:${LD_LIBRARY_PATH:-}"
export CUDA_HOME="$ENV"
export TORCH_EXTENSIONS_DIR="$ROOT/torch_ext"
export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 PYTHONUNBUFFERED=1
export TMPDIR="$ROOT/tmp"; mkdir -p "$TMPDIR" "$TORCH_EXTENSIONS_DIR"
