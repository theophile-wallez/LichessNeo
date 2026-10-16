import {
  DataTexture,
  MeshPhysicalMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  type Texture,
} from 'three';

// The solid skins a mascot may have in place of fur: the robot's glossy
// plastic, and others, each a material in any of the mascot's colors.

export const FINISHES = ['plastic', 'clay', 'velvet', 'metal', 'ceramic', 'toon', 'jelly'] as const;
export type Finish = (typeof FINISHES)[number];

export type SolidMaterial = MeshPhysicalMaterial | MeshToonMaterial;

let toonSteps: Texture | null = null;

/** A cartoon's three flat shades: shadow, midtone, light. */
function toonGradient(): Texture {
  const texture = new DataTexture(Uint8Array.from([90, 170, 255]), 3, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

const MAKERS: Readonly<Record<Finish, (color: string) => SolidMaterial>> = {
  plastic: color =>
    new MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.1 }),
  clay: color => new MeshPhysicalMaterial({ color, roughness: 0.92 }),
  velvet: color =>
    new MeshPhysicalMaterial({
      color,
      roughness: 1,
      sheen: 1,
      sheenRoughness: 0.45,
      sheenColor: '#ffffff',
    }),
  metal: color => new MeshPhysicalMaterial({ color, metalness: 0.85, roughness: 0.28 }),
  ceramic: color =>
    new MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }),
  toon: color => {
    toonSteps ??= toonGradient();
    return new MeshToonMaterial({ color, gradientMap: toonSteps });
  },
  // Wet and glossy, its edges lit pale as light comes through them. Not transmission:
  // over the transparent canvas that samples nothing and turns it dark.
  jelly: color =>
    new MeshPhysicalMaterial({
      color,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      sheen: 1,
      sheenRoughness: 0.3,
      sheenColor: '#ffffff',
      ior: 1.4,
    }),
};

export const solid = (finish: Finish, color: string): SolidMaterial => MAKERS[finish](color);
