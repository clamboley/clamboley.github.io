import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import type { Logo } from '../kit.types.ts';
import { seededRandom } from '../util/random.ts';

type Ctx = CanvasRenderingContext2D;

function createCanvas(size: number): [HTMLCanvasElement, Ctx] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return [canvas, ctx];
}

function colorTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function dataTexture(canvas: HTMLCanvasElement, repeat = 1): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  return texture;
}

function drawLogo(ctx: Ctx, logo: Logo, cx: number, cy: number, radius: number): void {
  ctx.fillStyle = logo.color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = logo.glyph.length > 2 ? radius * 0.62 : radius * 0.95;
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  ctx.fillText(logo.glyph, cx, cy + radius * 0.04);
}

function drawLabel(ctx: Ctx, label: string, cx: number, cy: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.fillText(label, cx, cy);
}

function speckle(ctx: Ctx, size: number, count: number, alpha: number, seed: number): void {
  const random = seededRandom(seed);
  for (let i = 0; i < count; i++) {
    const v = Math.floor(random() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(random() * size, random() * size, 1 + random() * 1.5, 1 + random() * 1.5);
  }
}

/** Coated batter head with the destination logo and label. */
export function drumHeadTexture(logo: Logo, label: string): CanvasTexture {
  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c * 0.9, size * 0.05, c, c, c);
  gradient.addColorStop(0, '#f4eee0');
  gradient.addColorStop(0.75, '#e6ddc6');
  gradient.addColorStop(1, '#c6bba0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, 9000, 0.06, 7);
  // collar ring near the hoop
  ctx.strokeStyle = 'rgba(110,95,70,.35)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.93, 0, Math.PI * 2);
  ctx.stroke();
  drawLogo(ctx, logo, c, c * 0.9, size * 0.2);
  drawLabel(ctx, label, c, c * 1.55, size * 0.085, '#56503f');
  return colorTexture(canvas);
}

/** Lathed bronze cymbal, logo on the bell. */
export function cymbalTexture(logo: Logo, label: string): CanvasTexture {
  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, size * 0.02, c, c, c);
  gradient.addColorStop(0, '#e2c476');
  gradient.addColorStop(0.3, '#c9a24f');
  gradient.addColorStop(0.75, '#a9843a');
  gradient.addColorStop(1, '#7a5c24');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const random = seededRandom(11);
  for (let r = 10; r < c; r += 3) {
    ctx.strokeStyle = `rgba(40,28,6,${0.08 + random() * 0.22})`;
    ctx.lineWidth = 0.6 + random() * 1.2;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawLogo(ctx, logo, c, c, size * 0.14);
  drawLabel(ctx, label, c, c * 1.5, size * 0.075, 'rgba(60,40,10,.85)');
  return colorTexture(canvas);
}

let cymbalRoughness: CanvasTexture | undefined;
/** Concentric lathe grooves as a roughness map (shared). */
export function cymbalRoughnessTexture(): Texture {
  if (cymbalRoughness) return cymbalRoughness;
  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  const c = size / 2;
  ctx.fillStyle = '#6e6e6e';
  ctx.fillRect(0, 0, size, size);
  const random = seededRandom(23);
  for (let r = 6; r < c; r += 2.5) {
    const v = Math.floor(80 + random() * 80);
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.lineWidth = 1 + random();
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  cymbalRoughness = dataTexture(canvas);
  return cymbalRoughness;
}

let sparkleNormal: CanvasTexture | undefined;
/** Tiny random facets: the glitter of a sparkle wrap under a spotlight (shared). */
export function sparkleNormalTexture(): Texture {
  if (sparkleNormal) return sparkleNormal;
  const size = 256;
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);
  const random = seededRandom(42);
  for (let i = 0; i < 2600; i++) {
    const angle = random() * Math.PI * 2;
    const tilt = 0.35 + random() * 0.55;
    const nx = Math.round(128 + Math.cos(angle) * tilt * 110);
    const ny = Math.round(128 + Math.sin(angle) * tilt * 110);
    ctx.fillStyle = `rgb(${nx},${ny},235)`;
    ctx.fillRect(random() * size, random() * size, 1 + random() * 1.4, 1 + random() * 1.4);
  }
  sparkleNormal = dataTexture(canvas, 6);
  return sparkleNormal;
}

/** Scuffed stage floor: grey noise as a roughness map. */
export function floorRoughnessTexture(): Texture {
  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = '#7a7a7a';
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, 40000, 0.35, 5);
  const random = seededRandom(9);
  ctx.strokeStyle = 'rgba(200,200,200,.12)';
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = 0.5 + random() * 2;
    ctx.beginPath();
    ctx.moveTo(random() * size, random() * size);
    ctx.lineTo(random() * size, random() * size);
    ctx.stroke();
  }
  return dataTexture(canvas, 24);
}

/** Soft round sprite for point lights (phones). */
export function glowSpriteTexture(): Texture {
  const size = 64;
  const [canvas, ctx] = createCanvas(size);
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}
