# Génération d'assets 3D (TRELLIS.2 sur le cluster Slurm)

Image → GLB PBR avec [TRELLIS.2](https://github.com/microsoft/TRELLIS.2) (MIT) sur `un nœud GPU` (H100).

- Poids (partage CephFS, `noexec`) : `$MODELS_DIR/3D/{TRELLIS.2-4B,dinov3-vitl16-pretrain-lvd1689m,BiRefNet}`.
- Pipeline patché (chemins locaux, détourage MIT) : `$SHARE/pipeline/`.
- Environnement : construit dans le scratch local du job (`$WORKING_DIR`, créé par le prolog, effacé après),
  empaqueté avec conda-pack sur le partage (`env.tar.gz` + `work.tar.zst`) et restauré par `activate.sh`
  au début de chaque job (~2 min). Le partage est `noexec`, d'où ce détour.

```sh
# 1. environnement (une fois par nœud, ~30-60 min) — depuis ce dossier :
rsync -a tools/gen/ $SHARE/tools/
ssh $SLURM_HOST sbatch $SHARE/tools/trellis2_setup.sbatch

# 2. générer : déposer des images dans $SHARE/inputs/<lot>/
ssh $SLURM_HOST "sbatch --export=ALL,BATCH=<lot> $SHARE/tools/trellis2_generate.sbatch"
# → $SHARE/outputs/<lot>/<image>.glb + <image>.preview.png + <image>.json
```

Logs : `$SHARE/logs/`.
