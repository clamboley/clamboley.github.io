# Génération d'assets 3D (TRELLIS.2 sur le cluster Slurm)

Image → GLB PBR avec [TRELLIS.2](https://github.com/microsoft/TRELLIS.2) (MIT) sur `un nœud GPU` (H100).

- Poids (partage CephFS, `noexec`) : `$MODELS_DIR/3D/{TRELLIS.2-4B,dinov3-vitl16-pretrain-lvd1689m,BiRefNet}`.
- Pipeline patché (chemins locaux, détourage MIT) : `$SHARE/pipeline/`.
- Environnement : sur le **disque local du nœud** (`/home/$USER/vitrine-gen/env`, le partage est `noexec`),
  d'où le `--gres=gpu:1` sur tous les jobs.

```sh
# 1. environnement (une fois par nœud, ~30-60 min) — depuis ce dossier :
rsync -a tools/gen/ $SHARE/tools/
ssh $SLURM_HOST sbatch $SHARE/tools/trellis2_setup.sbatch

# 2. générer : déposer des images dans $SHARE/inputs/<lot>/
ssh $SLURM_HOST "sbatch --export=ALL,BATCH=<lot> $SHARE/tools/trellis2_generate.sbatch"
# → $SHARE/outputs/<lot>/<image>.glb + <image>.preview.png + <image>.json
```

Logs : `$SHARE/logs/`.
