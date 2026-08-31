"""
Image → GLB (PBR) with TRELLIS.2, plus a preview sheet, for a folder of images.

    python generate.py --pipeline /path/to/pipeline --inputs DIR --out DIR [--seed 1] [--decimate 400000]
                       [--texture 2048] [--no-preprocess] [--resolution 1024_cascade|512]
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

os.environ.setdefault('OPENCV_IO_ENABLE_OPENEXR', '1')
os.environ.setdefault('PYTORCH_CUDA_ALLOC_CONF', 'expandable_segments:True')

import numpy as np  # noqa: E402
import torch  # noqa: E402
from PIL import Image  # noqa: E402

IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp'}


def preview_sheet(mesh, envmap, path: Path, frames: int = 6) -> None:
    """Renders a turntable and lays a few frames side by side (PBR + normals)."""
    from trellis2.utils import render_utils

    video = render_utils.render_video(mesh, envmap=envmap, num_frames=frames * 4, resolution=512)
    frames_pbr = render_utils.make_pbr_vis_frames(video)
    picks = frames_pbr[:: max(1, len(frames_pbr) // frames)][:frames]
    sheet = np.concatenate([np.asarray(f) for f in picks], axis=1)
    Image.fromarray(sheet).save(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--pipeline', required=True)
    parser.add_argument('--inputs', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--seed', type=int, default=1)
    parser.add_argument('--decimate', type=int, default=400_000)
    parser.add_argument('--texture', type=int, default=2048)
    parser.add_argument('--no-preprocess', action='store_true', help='images are already cut out (RGBA)')
    parser.add_argument('--resolution', default='1024_cascade')
    parser.add_argument('--envmap', default=None, help='.exr used for the preview render')
    args = parser.parse_args()

    inputs = Path(args.inputs)
    files = sorted(p for p in (inputs.iterdir() if inputs.is_dir() else [inputs]) if p.suffix.lower() in IMAGE_SUFFIXES)
    if not files:
        print('no images in', inputs)
        return 1
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    from trellis2.pipelines import Trellis2ImageTo3DPipeline
    from trellis2.renderers import EnvMap
    import o_voxel
    import cv2

    t0 = time.time()
    pipeline = Trellis2ImageTo3DPipeline.from_pretrained(args.pipeline)
    pipeline.cuda()
    print(f'pipeline loaded in {time.time() - t0:.0f}s')

    envmap = None
    if args.envmap:
        hdr = cv2.cvtColor(cv2.imread(args.envmap, cv2.IMREAD_UNCHANGED), cv2.COLOR_BGR2RGB)
        envmap = EnvMap(torch.tensor(hdr, dtype=torch.float32, device='cuda'))

    for file in files:
        stem = file.stem
        print(f'\n=== {file.name}')
        t1 = time.time()
        image = Image.open(file)
        mesh = pipeline.run(
            image,
            seed=args.seed,
            preprocess_image=not args.no_preprocess,
            pipeline_type=args.resolution,
        )[0]
        mesh.simplify(16_777_216)
        t_gen = time.time() - t1
        print(f'generated in {t_gen:.0f}s')

        if envmap is not None:
            try:
                preview_sheet(mesh, envmap, out / f'{stem}.preview.png')
            except Exception as error:  # preview must never block the export
                print('preview failed:', error)

        t2 = time.time()
        glb = o_voxel.postprocess.to_glb(
            vertices=mesh.vertices,
            faces=mesh.faces,
            attr_volume=mesh.attrs,
            coords=mesh.coords,
            attr_layout=mesh.layout,
            voxel_size=mesh.voxel_size,
            aabb=[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
            decimation_target=args.decimate,
            texture_size=args.texture,
            remesh=True,
            remesh_band=1,
            remesh_project=0,
            verbose=False,
        )
        glb_path = out / f'{stem}.glb'
        glb.export(str(glb_path), extension_webp=True)
        meta = {
            'source': file.name,
            'seed': args.seed,
            'resolution': args.resolution,
            'generation_s': round(t_gen),
            'export_s': round(time.time() - t2),
            'glb_bytes': glb_path.stat().st_size,
            'decimation_target': args.decimate,
            'texture_size': args.texture,
        }
        (out / f'{stem}.json').write_text(json.dumps(meta, indent=2))
        print(json.dumps(meta))
        torch.cuda.empty_cache()
    return 0


if __name__ == '__main__':
    sys.exit(main())
