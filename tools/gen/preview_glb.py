"""
Blender (headless) turntable preview of a GLB: 4 views side by side, Workbench renderer.

    blender -b --python tools/gen/preview_glb.py -- input.glb output.png [size]
"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1 :]
glb, out = argv[0], argv[1]
size = int(argv[2]) if len(argv) > 2 else 512

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']

# frame the model
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
centre = (lo + hi) / 2
radius = max((hi - lo).length / 2, 1e-3)
print(f'PREVIEW meshes={len(meshes)} faces={sum(len(o.data.polygons) for o in meshes)} size={[round(v, 3) for v in (hi - lo)]}')

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.display.shading.show_shadows = True
scene.render.resolution_x = size
scene.render.resolution_y = size
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('w')
scene.world.color = (0.18, 0.18, 0.2)

cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 50
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

for i, angle in enumerate([30, 120, 210, 300]):
    a = math.radians(angle)
    cam.location = centre + Vector((math.cos(a) * radius * 3.2, math.sin(a) * radius * 3.2, radius * 1.1))
    direction = centre - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{out}.{i}.png'
    bpy.ops.render.render(write_still=True)

# stitch
import numpy as np  # noqa: E402

tiles = []
for i in range(4):
    img = bpy.data.images.load(f'{out}.{i}.png')
    px = np.array(img.pixels[:], dtype=np.float32).reshape(size, size, 4)[::-1, :, :3]
    tiles.append(px)
sheet = np.concatenate(tiles, axis=1)
result = bpy.data.images.new('sheet', width=size * 4, height=size, alpha=False)
rgba = np.concatenate([sheet[::-1], np.ones((size, size * 4, 1), dtype=np.float32)], axis=2)
result.pixels = rgba.ravel().tolist()
result.filepath_raw = out
result.file_format = 'PNG'
result.save()
print('PREVIEW written', out)
