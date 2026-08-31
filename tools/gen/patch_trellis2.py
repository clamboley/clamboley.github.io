"""Small, idempotent fixes applied to a TRELLIS.2 checkout (run after restore and before packing)."""
import pathlib
import sys

root = pathlib.Path(sys.argv[1])


def patch(rel: str, old: str, new: str) -> None:
    path = root / rel
    text = path.read_text()
    if new in text:
        print('already patched', rel)
        return
    if old not in text:
        print('WARNING pattern not found, skipped', rel)
        return
    path.write_text(text.replace(old, new, 1))
    print('patched', rel)


# BiRefNet (MIT) weights are stored in half; the wrapper feeds float32 inputs.
patch(
    'trellis2/pipelines/rembg/BiRefNet.py',
    '        self.model.eval()\n',
    '        self.model.float().eval()  # weights may be stored in half\n',
)
# transformers renamed DINOv3's block list between releases.
patch(
    'trellis2/modules/image_feature_extractor.py',
    'enumerate(self.model.layer):',
    "enumerate(getattr(self.model, 'layer', None) or self.model.layers):",
)
