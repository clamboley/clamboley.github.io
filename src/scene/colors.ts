import { Color, LinearSRGBColorSpace } from 'three';

/**
 * The prototype was authored on three r128, where hex colours were used as
 * linear values. Modern three treats hex as sRGB, which would make its dark
 * greys ten times darker; this keeps the prototype's palette until the
 * materials are redone at the look step.
 */
export function legacyColor(hex: number): Color {
  return new Color().setHex(hex, LinearSRGBColorSpace);
}
