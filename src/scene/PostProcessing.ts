import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import { HalfFloatType, type Camera, type Scene, type WebGLRenderer } from 'three';

export interface PostProcessing {
  render(dt: number): void;
  setSize(width: number, height: number): void;
}

/** Bloom on the highlights, filmic tone mapping, anti-aliasing, then grain and vignette. */
export function createPostProcessing(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
): PostProcessing {
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 1.3,
    luminanceSmoothing: 0.3,
    intensity: 0.42,
    radius: 0.5,
  });
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
  composer.addPass(new EffectPass(camera, bloom, toneMapping));
  composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: SMAAPreset.MEDIUM })));

  const grain = new NoiseEffect({ premultiply: true });
  grain.blendMode.opacity.value = 0.25;
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.62 });
  composer.addPass(new EffectPass(camera, grain, vignette));

  return {
    render: (dt) => {
      composer.render(dt);
    },
    setSize: (width, height) => {
      composer.setSize(width, height);
    },
  };
}
