"""
Text → reference images with Z-Image-Turbo (Apache 2.0), one PNG per prompt.

    python imagine.py --model $MODELS_DIR/image/Z-Image-Turbo --prompts prompts/stadium.txt --out DIR
                      [--size 1024] [--seeds 1,2] [--steps 8]
"""
import argparse
import sys
import time
from pathlib import Path

import torch


def read_prompts(path: Path) -> list[tuple[str, str]]:
    prompts = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        name, _, prompt = line.partition('|')
        prompts.append((name.strip(), prompt.strip()))
    return prompts


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True)
    parser.add_argument('--prompts', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--size', type=int, default=1024)
    parser.add_argument('--seeds', default='1,2')
    parser.add_argument('--steps', type=int, default=8)
    args = parser.parse_args()

    from diffusers import ZImagePipeline

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    pipe = ZImagePipeline.from_pretrained(args.model, torch_dtype=torch.bfloat16)
    pipe.to('cuda')
    print(f'pipeline loaded in {time.time() - t0:.0f}s')

    seeds = [int(s) for s in args.seeds.split(',') if s.strip()]
    for name, prompt in read_prompts(Path(args.prompts)):
        for seed in seeds:
            t1 = time.time()
            image = pipe(
                prompt=prompt,
                height=args.size,
                width=args.size,
                num_inference_steps=args.steps,
                guidance_scale=0.0,  # Turbo: distilled, no CFG
                generator=torch.Generator('cuda').manual_seed(seed),
            ).images[0]
            path = out / f'{name}-s{seed}.png'
            image.save(path)
            print(f'{path.name}  {time.time() - t1:.1f}s')
    return 0


if __name__ == '__main__':
    sys.exit(main())
