#!/bin/bash
#SBATCH --job-name=trellis2-gen
#SBATCH --time=02:00:00
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=8
#SBATCH --mem=64G
#SBATCH --partition=gpu
#SBATCH --gres=gpu:1
#SBATCH --gres=gpu:h100:1
#SBATCH --output=%x-%j.log

# Generates a GLB per image of inputs/$BATCH into outputs/$BATCH. Extra flags via GEN_ARGS.
#   sbatch --export=ALL,BATCH=smoke[,GEN_ARGS="--seed 3"] trellis2_generate.sbatch
set -euo pipefail
BATCH="${BATCH:?set BATCH=<folder under inputs/>}"
OUT="${OUT:-$BATCH}"  # output folder under outputs/, defaults to the batch name
SHARE="${SHARE:-$HOME/vitrine-gen}"

echo "job=$SLURM_JOB_ID node=$(hostname) batch=$BATCH start=$(date)"
source "$SHARE/tools/activate.sh"
# packages the packed env may predate (nodes have internet); harmless when present
"$ENV/bin/python" -c "import einops, transformers; assert transformers.__version__.startswith('4.57')" 2>/dev/null \
  || "$ENV/bin/pip" install -q einops "transformers>=4.57,<4.58"
export ATTN_BACKEND="${ATTN_BACKEND:-flash_attn}"
cd "$ROOT/TRELLIS.2"
"$ENV/bin/python" "$SHARE/tools/generate.py" \
  --pipeline "$SHARE/pipeline" \
  --inputs "$SHARE/inputs/$BATCH" \
  --out "$SHARE/outputs/$OUT" \
  --envmap "$ROOT/TRELLIS.2/assets/hdri/studio.exr" \
  ${GEN_ARGS:-}
echo "end=$(date)"
