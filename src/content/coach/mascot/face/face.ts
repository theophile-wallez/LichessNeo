import { CircleGeometry, Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import type { Pose } from '#content/coach/mascot/moods.ts';
import {
  blush,
  brow,
  eye,
  Mouth,
  nose,
  type Eye,
  type EyeStyle,
  type NoseKind,
} from './features.ts';
import type { Range, SkinPoint, Surface } from './surface.ts';

// The face laid on the body's skin. Turning the head slides it over the skin,
// so it never sinks into the fur.

const AHEAD = new Vector3(0, 0, 1);

export interface FaceLook {
  readonly center: readonly [number, number];
  readonly size: readonly [number, number];
  /** How far the face may slide over the skin. */
  readonly slide: { readonly x: Range; readonly y: Range };
  readonly eyes: {
    readonly x: number;
    readonly y: number;
    readonly size: number;
    readonly style?: EyeStyle;
  };
  readonly brows: { readonly y: number; readonly color: string };
  readonly nose: { readonly kind: NoseKind; readonly y: number; readonly size: number } | null;
  readonly mouth: { readonly y: number; readonly scale: number };
  readonly cheeks: { readonly x: number; readonly y: number } | null;
}

interface Feature {
  readonly object: Object3D;
  readonly x: number;
  readonly y: number;
  /** How far off the skin. */
  readonly lift: number;
  readonly roll: number;
}

export interface Glance {
  /** How open the eyes are, from 0 to 1. */
  readonly blink: number;
  /** Where the head turns, from -1 to 1 each way. */
  readonly x: number;
  readonly y: number;
}

export class Face {
  readonly group = new Group();
  readonly #surface: Surface;
  readonly #features: Feature[] = [];
  readonly #eyes: Eye[];
  readonly #eyeSize: number;
  readonly #brows: { readonly piece: Group; readonly side: number }[];
  readonly #mouth = new Mouth();
  readonly #skin: SkinPoint = { point: new Vector3(), normal: new Vector3() };

  constructor(surface: Surface, look: FaceLook) {
    this.#surface = surface;
    const { eyes, brows, mouth } = look;
    this.#eyeSize = eyes.size;
    this.#eyes = [-1, 1].map(side => {
      const parts = eye(eyes.style ?? 'bead');
      this.#place({
        object: parts.group,
        x: side * eyes.x,
        y: eyes.y,
        lift: 0.012,
        roll: side * -0.12,
      });
      return parts;
    });
    const browMaterial = new MeshStandardMaterial({ color: brows.color, roughness: 0.5 });
    this.#brows = [-1, 1].map(side => {
      const holder = new Group();
      this.#place({ object: holder, x: side * eyes.x, y: brows.y, lift: 0.04, roll: 0 });
      const piece = brow(browMaterial);
      holder.add(piece);
      return { piece, side };
    });
    if (look.nose)
      this.#place({
        object: nose(look.nose.kind, look.nose.size),
        x: 0,
        y: look.nose.y,
        lift: 0.02,
        roll: 0,
      });
    for (const side of look.cheeks ? [-1, 1] : []) {
      const cheek = new Mesh(new CircleGeometry(0.06, 24), blush);
      cheek.scale.y = 0.6;
      this.#place({
        object: cheek,
        x: side * (look.cheeks?.x ?? 0),
        y: look.cheeks?.y ?? 0,
        lift: 0.03,
        roll: 0,
      });
    }
    this.#mouth.group.scale.setScalar(mouth.scale);
    this.#place({ object: this.#mouth.group, x: 0, y: mouth.y, lift: 0.008, roll: 0 });
    this.#slide(0, 0);
  }

  #place(feature: Feature): void {
    this.#features.push(feature);
    this.group.add(feature.object);
  }

  #slide(dx: number, dy: number): void {
    for (const { object, x, y, lift, roll } of this.#features) {
      const { point, normal } = this.#surface.at(x + dx, y + dy, this.#skin);
      object.position.copy(point).addScaledVector(normal, lift);
      object.quaternion.setFromUnitVectors(AHEAD, normal);
      if (roll) object.rotateZ(roll);
    }
  }

  update(pose: Pose, glance: Glance): void {
    this.#slide(glance.x * 0.1, glance.y * 0.06);
    const open = (1 - pose.joy) * glance.blink * (1 - pose.squint * 0.45);
    const size = this.#eyeSize * pose.eyeScale;
    for (const { bead, arch, pupil } of this.#eyes) {
      bead.scale.set(0.85 * size, 1.15 * size * Math.max(open, 0.04), 0.6 * this.#eyeSize);
      bead.visible = open > 0.03;
      bead.position.set(glance.x * 0.008, glance.y * 0.006 - pose.squint * 0.008, 0);
      if (pupil) {
        const [x, y] = [glance.x * 0.014, glance.y * 0.012];
        pupil.position.set(x, y, Math.sqrt(0.052 ** 2 - x * x - y * y) - 0.004);
      }
      arch.scale.setScalar(Math.max(pose.joy, 0.001) * this.#eyeSize);
      arch.visible = pose.joy > 0.02;
    }
    for (const { piece, side } of this.#brows) {
      piece.scale.setScalar(Math.max(pose.brow, 0.001));
      piece.visible = pose.brow > 0.02;
      piece.position.y =
        (side < 0 ? pose.browLeft : pose.browRight) * 0.03 + (pose.eyeScale - 1) * 0.06;
      piece.rotation.z = -side * pose.browTilt * 0.45;
    }
    this.#mouth.set(pose);
  }
}
