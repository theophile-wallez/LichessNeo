import {
  AddEquation,
  Color,
  CustomBlending,
  Data3DTexture,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  MaxEquation,
  Mesh,
  OneFactor,
  RepeatWrapping,
  RGFormat,
  ShaderMaterial,
  Vector2,
  Vector3,
  ZeroFactor,
  type BufferGeometry,
} from 'three';
import { FUR_FRAGMENT, FUR_VERTEX } from './shaders.ts';
import { STRAND_CELLS, STRAND_RANGE, STRAND_TEXELS, strandData } from './strands.ts';

// The fur's material, and the uniforms each mascot's furry parts share, so its
// colors are set once for all of them.

/** Which color a part takes: the body's mix, the coat, the front, the accent, a tail with a pale tip. */
export const FurMode = { body: 0, coat: 1, front: 2, accent: 3, tail: 4 } as const;
export type FurModeValue = (typeof FurMode)[keyof typeof FurMode];

export interface Colors {
  readonly coat: string;
  readonly front: string;
  readonly accent: string;
}

let strands: Data3DTexture | null = null;

function strandTexture(): Data3DTexture {
  const texture = new Data3DTexture(strandData(), STRAND_TEXELS, STRAND_TEXELS, STRAND_TEXELS);
  texture.format = RGFormat;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.wrapR = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/** A fur tip is its root's color, paler. */
const tint = (hex: string, toWhite: number): Color =>
  new Color(hex).lerp(new Color('#ffffff'), toWhite);

/** The uniforms every furry part of one mascot shares. */
export interface FurLook {
  readonly uCoat: { value: Color };
  readonly uFrontColor: { value: Color };
  readonly uAccent: { value: Color };
  readonly uCoatTip: { value: Color };
  readonly uFrontTip: { value: Color };
  readonly uAccentTip: { value: Color };
  /** Where the front color starts on the body, at its bottom and at its top. */
  readonly uFront: { value: Vector2 };
  /** A bee's bands: how many per unit of height, and between which heights. */
  readonly uStripes: { value: Vector3 };
  readonly uLightDir: { value: Vector3 };
  readonly uLightColor: { value: Color };
  readonly uSky: { value: Color };
  readonly uGround: { value: Color };
  readonly uStrands: { value: Data3DTexture };
}

export function createFurLook(
  colors: Colors,
  frontMask: readonly [number, number],
  stripes: readonly [number, number, number],
): FurLook {
  strands ??= strandTexture();
  return {
    uCoat: { value: new Color(colors.coat) },
    uFrontColor: { value: new Color(colors.front) },
    uAccent: { value: new Color(colors.accent) },
    uCoatTip: { value: tint(colors.coat, 0.35) },
    uFrontTip: { value: tint(colors.front, 0.6) },
    uAccentTip: { value: tint(colors.accent, 0.35) },
    uFront: { value: new Vector2(...frontMask) },
    uStripes: { value: new Vector3(...stripes) },
    uLightDir: { value: new Vector3(-0.45, 0.75, 0.55).normalize() },
    uLightColor: { value: new Color('#fff6ea') },
    uSky: { value: new Color('#dcdcff') },
    uGround: { value: new Color('#8f8070') },
    uStrands: { value: strands },
  };
}

export interface FurOptions {
  /** How many shells: more is finer, and costs more. */
  readonly layers: number;
  readonly length: number;
  readonly mode: FurModeValue;
  /** The face's center and size on the body, where the fur is short. */
  readonly face?: readonly [number, number];
  readonly faceSize?: readonly [number, number];
  readonly density?: number;
  /** A tail's height where its tip's color starts. */
  readonly tipFrom?: number;
  /** A paw whose palm is bare. */
  readonly palm?: boolean;
}

export interface FurPart {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  readonly puff: { value: number };
  /** Where the fur bends, in the part's own space. */
  readonly bend: Vector3;
  /** A point of the part whose motion the fur lags behind. */
  readonly probe: Vector3;
  readonly lag: Vector3;
  last: Vector3 | null;
}

export function createFur(
  geometry: BufferGeometry,
  look: FurLook,
  options: FurOptions,
  probe = new Vector3(),
): FurPart {
  const { layers, length, mode, face = [0, 0], faceSize = [0.46, 0.32] } = options;
  const shells = new InstancedBufferGeometry();
  shells.index = geometry.index;
  shells.setAttribute('position', geometry.getAttribute('position'));
  shells.setAttribute('normal', geometry.getAttribute('normal'));
  const heights = Float32Array.from({ length: layers }, (_, i) =>
    layers > 1 ? i / (layers - 1) : 0,
  );
  shells.setAttribute('layer', new InstancedBufferAttribute(heights, 1));
  shells.instanceCount = layers;
  const puff = { value: 0 };
  const bend = new Vector3();
  const material = new ShaderMaterial({
    vertexShader: FUR_VERTEX,
    fragmentShader: FUR_FRAGMENT,
    alphaToCoverage: true,
    // Each shell replaces the color but keeps the most opaque alpha drawn: on a transparent
    // canvas the outer shells would otherwise let the page show through the skin.
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: ZeroFactor,
    blendEquationAlpha: MaxEquation,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: OneFactor,
    defines: { STRAND_CELLS: STRAND_CELLS.toFixed(1), STRAND_RANGE: STRAND_RANGE.toFixed(2) },
    uniforms: {
      ...look,
      uLength: { value: length },
      uPuff: puff,
      uBend: { value: bend },
      uMode: { value: mode },
      uFace: { value: new Vector2(...face) },
      uFaceSize: { value: new Vector2(...faceSize) },
      uTipFrom: { value: options.tipFrom ?? 99 },
      uPalm: { value: options.palm ? 1 : 0 },
      uDensity: { value: options.density ?? 90 },
    },
  });
  const mesh = new Mesh(shells, material);
  // The shells grow past the surface's bounds, which three can't know.
  mesh.frustumCulled = false;
  return { mesh, material, puff, bend, probe, lag: new Vector3(), last: null };
}
