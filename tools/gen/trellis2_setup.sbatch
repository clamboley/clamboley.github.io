#!/bin/bash
#SBATCH --job-name=trellis2-setup
#SBATCH --time=03:00:00
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=24
#SBATCH --mem=96G
#SBATCH --partition=gpu
#SBATCH --gres=gpu:1
#SBATCH --gres=gpu:h100:1
#SBATCH --output=%x-%j.log

# Builds the TRELLIS.2 environment in the job's scratch and packs it to the share.
set -euo pipefail
echo "job=$SLURM_JOB_ID node=$(hostname) start=$(date)"
nvidia-smi --query-gpu=index,name,memory.total --format=csv,noheader
echo "scratch=$WORKING_DIR"; df -h "$WORKING_DIR" | tail -1
export PYTHONUNBUFFERED=1
export MAX_JOBS="${MAX_JOBS:-20}"
bash "${SHARE:-$HOME/vitrine-gen}/tools/setup_env.sh"
echo "end=$(date)"
