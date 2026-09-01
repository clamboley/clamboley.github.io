import { NoToneMapping, PCFShadowMap, WebGLRenderer } from 'three';

/** Tone mapping is left to the post-processing chain (HDR frame buffers). */
export function createRenderer(pixelRatioMax: number): WebGLRenderer {
  const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioMax));
  renderer.toneMapping = NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  return renderer;
}
