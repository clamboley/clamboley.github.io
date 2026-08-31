#!/bin/bash
#SBATCH --job-name=zimage
#SBATCH --time=01:00:00
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=8
#SBATCH --mem=64G
#SBATCH --partition=gpu
#SBATCH --gres=gpu:1
#SBATCH --gres=gpu:h100:1
#SBATCH --output=%x-%j.log

# Reference images from a prompt file into inputs/$BATCH (ready for trellis2_generate).
#   sbatch --export=ALL,PROMPTS=stadium,BATCH=stadium-refs zimage_imagine.sbatch
set -euo pipefail
PROMPTS="${PROMPTS:-stadium}"
BATCH="${BATCH:-$PROMPTS-refs}"
SHARE="${SHARE:-$HOME/vitrine-gen}"

echo "job=$SLURM_JOB_ID node=$(hostname) prompts=$PROMPTS batch=$BATCH start=$(date)"
source "$SHARE/tools/activate.sh"
"$ENV/bin/python" "$SHARE/tools/imagine.py" \
  --model $MODELS_DIR/image/Z-Image-Turbo \
  --prompts "$SHARE/tools/prompts/$PROMPTS.txt" \
  --out "$SHARE/inputs/$BATCH" \
  ${IMAGINE_ARGS:-}
echo "end=$(date)"
