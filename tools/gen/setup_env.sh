#!/bin/bash
# Builds the TRELLIS.2 environment in the job's local scratch (the shared filesystem is
# noexec) and packs it to the share with conda-pack so later jobs restore it anywhere.
# Mirrors TRELLIS.2/setup.sh: torch 2.6 + CUDA 12.4 toolkit (conda), flash-attn wheel, CUDA extensions.
set -euo pipefail

ROOT="${ROOT:-${WORKING_DIR:-$HOME}/vitrine-gen}"
SHARE="${SHARE:-${SHARE:-$HOME/vitrine-gen}}"
ENV="$ROOT/env"
export TORCH_CUDA_ARCH_LIST="${TORCH_CUDA_ARCH_LIST:-8.0;9.0}"
export MAX_JOBS="${MAX_JOBS:-16}"
export TMPDIR="$ROOT/tmp"; mkdir -p "$TMPDIR" "$ROOT/bin"
# pip must cache on the same device as its build dir (cross-device rename otherwise)
export PIP_CACHE_DIR="$ROOT/pipcache"; mkdir -p "$PIP_CACHE_DIR"

log() { echo; echo "[$(date +%H:%M:%S)] $*"; }

log "micromamba"
if [ ! -x "$ROOT/bin/micromamba" ]; then
  cp "$SHARE/bin/micromamba" "$ROOT/bin/micromamba" && chmod +x "$ROOT/bin/micromamba"
fi
MM="$ROOT/bin/micromamba"
export MAMBA_ROOT_PREFIX="$ROOT/mamba"

if [ ! -x "$ENV/bin/python" ]; then
  log "conda env: python 3.10 + CUDA 12.4 toolkit"
  "$MM" create -y -p "$ENV" -c conda-forge python=3.10 pip ninja git zstd
  "$MM" install -y -p "$ENV" -c nvidia/label/cuda-12.4.1 cuda-toolkit
fi
export CUDA_HOME="$ENV"
export PATH="$ENV/bin:$PATH"
export LD_LIBRARY_PATH="$ENV/lib:${LD_LIBRARY_PATH:-}"
export TORCH_EXTENSIONS_DIR="$ROOT/torch_ext"; mkdir -p "$TORCH_EXTENSIONS_DIR"
PIP="$ENV/bin/pip"
PY="$ENV/bin/python"
"$PY" --version; "$ENV/bin/nvcc" --version | tail -1

log "torch 2.6 (cu124 wheels)"
"$PIP" install -q torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124
"$PY" -c "import torch; print('torch', torch.__version__, 'cuda', torch.version.cuda, 'gpu', torch.cuda.is_available())"

log "basic dependencies"
"$PIP" install -q imageio imageio-ffmpeg tqdm easydict opencv-python-headless ninja trimesh "transformers>=4.57,<4.58" tensorboard pandas lpips zstandard kornia timm einops huggingface_hub
"$PIP" install -q "git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4021b67b12c460c7057d642626897ec8"
"$PIP" install -q pillow-simd || echo "pillow-simd skipped"

log "flash-attn (prebuilt wheel if available)"
"$PIP" install -q flash-attn==2.7.3 --no-build-isolation || echo "flash-attn failed: ATTN_BACKEND=sdpa will be used"

log "TRELLIS.2 sources (with o-voxel submodules)"
if [ ! -d "$ROOT/TRELLIS.2" ]; then
  git clone -q --recursive https://github.com/microsoft/TRELLIS.2.git "$ROOT/TRELLIS.2"
fi
EXT="$ROOT/ext"; mkdir -p "$EXT"

log "nvdiffrast"
[ -d "$EXT/nvdiffrast" ] || git clone -q -b v0.4.0 https://github.com/NVlabs/nvdiffrast.git "$EXT/nvdiffrast"
"$PIP" install -q "$EXT/nvdiffrast" --no-build-isolation

log "nvdiffrec (renderutils)"
[ -d "$EXT/nvdiffrec" ] || git clone -q -b renderutils https://github.com/JeffreyXiang/nvdiffrec.git "$EXT/nvdiffrec"
"$PIP" install -q "$EXT/nvdiffrec" --no-build-isolation

log "CuMesh"
[ -d "$EXT/CuMesh" ] || git clone -q --recursive https://github.com/JeffreyXiang/CuMesh.git "$EXT/CuMesh"
"$PIP" install -q "$EXT/CuMesh" --no-build-isolation

log "FlexGEMM"
[ -d "$EXT/FlexGEMM" ] || git clone -q --recursive https://github.com/JeffreyXiang/FlexGEMM.git "$EXT/FlexGEMM"
"$PIP" install -q "$EXT/FlexGEMM" --no-build-isolation

log "o-voxel"
"$PIP" install -q "$ROOT/TRELLIS.2/o-voxel" --no-build-isolation

log "diffusers (Z-Image reference images)"
"$PIP" install -q "diffusers>=0.36" accelerate sentencepiece protobuf

log "nvdiffrast JIT warm-up (cached in $TORCH_EXTENSIONS_DIR)"
"$PY" -c "import torch, nvdiffrast.torch as dr; dr.RasterizeCudaContext(); print('nvdiffrast plugin built')"

log "smoke test"
cd "$ROOT/TRELLIS.2"
"$PY" - <<'PYEOF'
import importlib
for m in ['torch', 'nvdiffrast.torch', 'cumesh', 'flex_gemm', 'o_voxel', 'transformers', 'trellis2']:
    try:
        importlib.import_module(m); print('ok  ', m)
    except Exception as e:
        print('FAIL', m, '->', e)
try:
    import flash_attn; print('ok   flash_attn', flash_attn.__version__)
except Exception as e:
    print('warn flash_attn missing ->', e)
PYEOF
log "patching the checkout"
"$PY" "$SHARE/tools/patch_trellis2.py" "$ROOT/TRELLIS.2"

log "packing: conda-pack (relocatable env) + work tarball (code, JIT cache)"
"$PIP" install -q conda-pack
"$ENV/bin/conda-pack" -p "$ENV" -o "$SHARE/env.tar.gz.part" --format tar.gz --compress-level 3 --n-threads -1 --force
mv "$SHARE/env.tar.gz.part" "$SHARE/env.tar.gz"
rm -rf "$ROOT/TRELLIS.2/.git"
tar -C "$ROOT" --use-compress-program="$ENV/bin/zstd -T0 -3" -cf "$SHARE/work.tar.zst.part" TRELLIS.2 torch_ext
mv "$SHARE/work.tar.zst.part" "$SHARE/work.tar.zst"
ls -la "$SHARE/env.tar.gz" "$SHARE/work.tar.zst"
log "done: packed to $SHARE"
