import { Color, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, type Texture } from 'three';
import type { Logo } from '../kit.types.ts';
import {
  cymbalRoughnessTexture,
  cymbalTexture,
  floorRoughnessTexture,
  sparkleNormalTexture,
} from './textures.ts';

/** Materials shared by every piece of hardware. */
export interface KitMaterials {
  chrome: MeshStandardMaterial;
  blackGloss: MeshPhysicalMaterial;
  felt: MeshStandardMaterial;
  rubber: MeshStandardMaterial;
  resonant: MeshStandardMaterial;
}

export function createKitMaterials(): KitMaterials {
  return {
    chrome: new MeshStandardMaterial({ color: 0xf2f2f5, metalness: 1, roughness: 0.24 }),
    blackGloss: new MeshPhysicalMaterial({
      color: 0x0c0c0e,
      metalness: 0.2,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }),
    felt: new MeshStandardMaterial({ color: 0x1a1512, roughness: 1 }),
    rubber: new MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 }),
    resonant: new MeshStandardMaterial({ color: 0xe4ddcb, roughness: 0.6 }),
  };
}

/** Burgundy sparkle wrap under clear lacquer; emissive reacts to hover / strokes. */
export function shellMaterial(emissive: string): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: 0x4a0d1c,
    metalness: 0.3,
    roughness: 0.42,
    clearcoat: 0.8,
    clearcoatRoughness: 0.18,
    normalMap: sparkleNormalTexture(),
    normalScale: new Vector2(0.35, 0.35),
    emissive: new Color(emissive),
    emissiveIntensity: 0,
  });
}

export function headMaterial(map: Texture, emissive: string): MeshStandardMaterial {
  return new MeshStandardMaterial({
    map,
    roughness: 0.62,
    metalness: 0,
    emissive: new Color(emissive),
    emissiveIntensity: 0,
  });
}

export function cymbalMaterial(logo: Logo, label: string, emissive: string): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    map: cymbalTexture(logo, label),
    roughnessMap: cymbalRoughnessTexture(),
    roughness: 1,
    metalness: 1,
    anisotropy: 0.35,
    emissive: new Color(emissive),
    emissiveIntensity: 0,
  });
}

export function floorMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: 0x0c0c11,
    roughnessMap: floorRoughnessTexture(),
    roughness: 0.62,
    metalness: 0.05,
    envMapIntensity: 0.4,
  });
}
