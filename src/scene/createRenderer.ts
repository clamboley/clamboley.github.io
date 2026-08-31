import { ACESFilmicToneMapping, WebGLRenderer } from 'three';

const MAX_PIXEL_RATIO = 1.75;

export function createRenderer(): WebGLRenderer {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  return renderer;
}
