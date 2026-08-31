import { NoToneMapping, PCFShadowMap, WebGLRenderer } from 'three';

const MAX_PIXEL_RATIO = 1.75;

/** Tone mapping is left to the post-processing chain (HDR frame buffers). */
export function createRenderer(): WebGLRenderer {
  const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.toneMapping = NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  return renderer;
}
