import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  Points,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { seededRandom } from '../util/random.ts';

const DOME_RADIUS = 300;
const STAR_COUNT = 7000;

const noiseGlsl = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 1.7; a *= 0.5; }
    return v;
  }
`;

const domeVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragment = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 glowWarm;
  uniform vec3 glowCold;
  uniform vec3 milky;
  ${noiseGlsl}
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    // night gradient, a touch of haze above the horizon
    vec3 col = mix(horizon, zenith, smoothstep(-0.02, 0.55, h));
    // the show spills onto the low haze: magenta one side, blue the other, mostly ahead
    float ahead = 0.55 + 0.45 * (-d.z);
    float low = exp(-pow(max(h, 0.0) / 0.13, 2.0)) * smoothstep(-0.08, 0.02, h);
    col += mix(glowWarm, glowCold, smoothstep(-0.6, 0.6, d.x)) * low * ahead * 0.55;
    // a soft milky band, tilted across the sky
    vec3 bandNormal = normalize(vec3(0.42, 0.55, 0.72));
    float band = exp(-pow(abs(dot(d, bandNormal)) / 0.17, 2.0));
    float cloud = fbm(d * 7.0);
    float dust = fbm(d * 18.0 + 5.0);
    col += milky * band * (0.25 + 0.9 * cloud) * (0.7 + 0.6 * dust) * smoothstep(-0.02, 0.2, h);
    // faint nebulosity so the dark is not flat
    col += vec3(0.035, 0.02, 0.06) * fbm(d * 3.0 + 11.0) * smoothstep(0.0, 0.4, h);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const starsVertex = /* glsl */ `
  attribute float size;
  attribute float phase;
  attribute vec3 tint;
  uniform float time;
  uniform float pixelRatio;
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    vTint = tint;
    float twinkle = 0.72 + 0.28 * sin(time * (1.2 + phase) + phase * 6.2831);
    vAlpha = twinkle;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * pixelRatio * twinkle;
    gl_Position = projectionMatrix * mv;
  }
`;

const starsFragment = /* glsl */ `
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float core = exp(-r * r * 6.0);
    gl_FragColor = vec4(vTint * core * vAlpha, core * vAlpha);
  }
`;

/**
 * Open-air night: a gradient dome with a milky band and the show's glow on
 * the horizon haze, and a few thousand twinkling stars.
 */
export class Sky {
  readonly root = new Group();
  private readonly stars: ShaderMaterial;

  constructor(pixelRatio: number) {
    const dome = new Mesh(
      new SphereGeometry(DOME_RADIUS, 48, 24),
      new ShaderMaterial({
        vertexShader: domeVertex,
        fragmentShader: domeFragment,
        uniforms: {
          zenith: { value: new Color(0x05060f) },
          horizon: { value: new Color(0x1a1230) },
          glowWarm: { value: new Color(0x6a1a5a) },
          glowCold: { value: new Color(0x142a78) },
          milky: { value: new Color(0x2a2650) },
        },
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.root.add(dome);

    const random = seededRandom(1024);
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT);
    const tints = new Float32Array(STAR_COUNT * 3);
    const [bx, by, bz] = [0.42, 0.55, 0.72];
    let n = 0;
    while (n < STAR_COUNT) {
      // uniform on the sphere, keep the upper hemisphere, favour the milky band
      const u = random() * 2 - 1;
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const x = r * Math.cos(a);
      const y = u;
      const z = r * Math.sin(a);
      if (y < 0.015) continue;
      const band = Math.abs(x * bx + y * by + z * bz);
      if (band > 0.25 && random() < 0.55) continue;
      positions[n * 3] = x * (DOME_RADIUS - 2);
      positions[n * 3 + 1] = y * (DOME_RADIUS - 2);
      positions[n * 3 + 2] = z * (DOME_RADIUS - 2);
      const bright = random();
      sizes[n] = 1.2 + bright * bright * bright * 5.5;
      phases[n] = random();
      const warm = random();
      tints[n * 3] = 0.85 + warm * 0.15;
      tints[n * 3 + 1] = 0.88 + (1 - warm) * 0.05;
      tints[n * 3 + 2] = 0.9 + (1 - warm) * 0.1;
      n++;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('size', new BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new BufferAttribute(phases, 1));
    geometry.setAttribute('tint', new BufferAttribute(tints, 3));
    this.stars = new ShaderMaterial({
      vertexShader: starsVertex,
      fragmentShader: starsFragment,
      uniforms: { time: { value: 0 }, pixelRatio: { value: pixelRatio } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    });
    const stars = new Points(geometry, this.stars);
    stars.frustumCulled = false;
    this.root.add(stars);
  }

  update(elapsed: number): void {
    (this.stars.uniforms.time as { value: number }).value = elapsed;
  }
}
