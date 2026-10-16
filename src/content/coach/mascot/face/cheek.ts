import {
  CircleGeometry,
  Mesh,
  RingGeometry,
  type BufferGeometry,
  type Group,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { blush } from './features.ts';
import type { SkinPoint, Surface } from './surface.ts';

// A face's cheeks, laid on the skin point by point: they wrap round a head that
// curves away, where a flat disc would stand off its edge, floating. A round
// blush at rest turns to freckles as the face blushes.

const RADIUS = 0.06;
const BLUSH_OPACITY = 0.55;
const FRECKLE_COLOR = '#e0609a';
// A round blush, a little wider than tall.
const ROUND = { width: 1, height: 0.6 } as const;

/** A round blush, or a few freckles. */
export type CheekStyle = 'blush' | 'freckles';

/** The freckles' middles and sizes, across the cheek's middle. */
const FRECKLES: readonly (readonly [number, number, number])[] = [
  [-0.046, 0.01, 0.014],
  [-0.008, 0.03, 0.013],
  [0.04, 0.012, 0.015],
  [-0.024, -0.022, 0.012],
  [0.018, -0.02, 0.0115],
];

function cheekGeometry(style: CheekStyle): BufferGeometry {
  // In rings, so its triangles follow the skin's curve instead of cutting under it.
  if (style === 'blush') return new RingGeometry(0, RADIUS, 24, 6);
  return mergeGeometries(
    FRECKLES.map(([x, y, radius]) => new CircleGeometry(radius, 12).translate(x, y, 0)),
  );
}

/** Where it is on the face, slid with it, and how wide and tall, as a share of its rest. */
export interface CheekLay {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

class Cheek {
  readonly mesh: Mesh;
  /** The disc's own points, flat, around its middle. */
  readonly #disc: Float32Array;

  constructor(material: Material, style: CheekStyle) {
    const geometry = cheekGeometry(style);
    this.#disc = Float32Array.from(geometry.getAttribute('position').array);
    this.mesh = new Mesh(geometry, material);
    // Its points are moved every frame: its bounds as built would cull it.
    this.mesh.frustumCulled = false;
  }

  lay(surface: Surface, at: CheekLay, lift: number, skin: SkinPoint): void {
    const position = this.mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const across = (this.#disc[i * 3] ?? 0) * at.width;
      const up = (this.#disc[i * 3 + 1] ?? 0) * at.height;
      const { point, normal } = surface.at(at.x + across, at.y + up, skin);
      point.addScaledVector(normal, lift);
      position.setXYZ(i, point.x, point.y, point.z);
    }
    position.needsUpdate = true;
  }
}

/** Where the cheeks sit, either side, and how they look at rest. */
export interface CheeksLook {
  readonly x: number;
  readonly y: number;
  readonly style?: CheekStyle;
}

interface Side {
  readonly round: Cheek | null;
  readonly freckles: Cheek;
  readonly x: number;
}

export class Cheeks {
  readonly #round = blush.clone();
  readonly #freckled = blush.clone();
  readonly #sides: readonly Side[];
  readonly #y: number;
  /** How it looks at rest: a round blush, freckles, or bare. */
  readonly #rest: CheekStyle | null;
  readonly #lift: number;

  /** On `group`, at `look`'s place, or bare at rest where `look` is null and they sit at `place`. */
  constructor(
    group: Group,
    look: CheeksLook | null,
    place: { x: number; y: number },
    lift: number,
  ) {
    this.#rest = look ? (look.style ?? 'blush') : null;
    this.#y = (look ?? place).y;
    this.#lift = lift;
    this.#freckled.color.set(FRECKLE_COLOR);
    this.#sides = [-1, 1].map(side => {
      const round = this.#rest === 'blush' ? new Cheek(this.#round, 'blush') : null;
      const freckles = new Cheek(this.#freckled, 'freckles');
      group.add(...[round?.mesh, freckles.mesh].filter(mesh => mesh !== undefined));
      return { round, freckles, x: side * (look ?? place).x };
    });
  }

  /** Lays them on `surface`, slid as the face is, as much blushing as `blushing`. */
  update(
    surface: Surface,
    slid: { x: number; y: number },
    blushing: number,
    skin: SkinPoint,
  ): void {
    const freckled = this.#rest === 'freckles' ? 1 : blushing;
    this.#round.opacity = BLUSH_OPACITY * (1 - blushing);
    this.#freckled.opacity = BLUSH_OPACITY * freckled + 0.4 * blushing;
    const y = this.#y + slid.y;
    for (const { round, freckles, x } of this.#sides) {
      const at = { x: x + slid.x, y };
      for (const [cheek, shown, size] of [
        [round, this.#round.opacity, ROUND],
        [freckles, freckled, { width: 1, height: 1 }],
      ] as const) {
        if (!cheek) continue;
        cheek.mesh.visible = shown > 0.02;
        if (cheek.mesh.visible) cheek.lay(surface, { ...at, ...size }, this.#lift, skin);
      }
    }
  }

  dispose(): void {
    this.#round.dispose();
    this.#freckled.dispose();
  }
}
