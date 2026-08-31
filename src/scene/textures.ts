import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Logo } from '../kit.types.ts';

const SIZE = 256;

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return [canvas, ctx];
}

function drawLogo(ctx: CanvasRenderingContext2D, logo: Logo, cy: number, radius: number): void {
  ctx.fillStyle = logo.color;
  ctx.beginPath();
  ctx.arc(SIZE / 2, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = logo.glyph.length > 2 ? radius * 0.6 : radius * 0.9;
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  ctx.fillText(logo.glyph, SIZE / 2, cy + 2);
}

function toTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Coated drum head with the destination logo and label. */
export function drumHeadTexture(logo: Logo, label: string): CanvasTexture {
  const [canvas, ctx] = createCanvas();
  const gradient = ctx.createRadialGradient(128, 120, 20, 128, 128, 150);
  gradient.addColorStop(0, '#f6f0e0');
  gradient.addColorStop(0.8, '#e4dbc4');
  gradient.addColorStop(1, '#c9bfa4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = 'rgba(120,105,80,.35)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.stroke();
  drawLogo(ctx, logo, 116, 58);
  ctx.fillStyle = '#57503f';
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText(label, 128, 208);
  return toTexture(canvas);
}

/** Lathed bronze cymbal with the destination logo on the bell. */
export function cymbalTexture(logo: Logo, label: string): CanvasTexture {
  const [canvas, ctx] = createCanvas();
  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 132);
  gradient.addColorStop(0, '#d8b45e');
  gradient.addColorStop(0.45, '#c09a44');
  gradient.addColorStop(1, '#7c6122');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = 'rgba(60,44,10,.28)';
  for (let r = 18, i = 0; r < 128; r += 7, i++) {
    ctx.lineWidth = 1 + (i % 3) * 0.5;
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawLogo(ctx, logo, 112, 50);
  ctx.fillStyle = '#4a3810';
  ctx.font = '600 23px system-ui, sans-serif';
  ctx.fillText(label, 128, 196);
  return toTexture(canvas);
}
