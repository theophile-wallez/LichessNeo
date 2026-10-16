import { Group, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import type { Pose } from '#content/coach/mascot/pose.ts';
import { brow, eye, Mouth, nose, type Eye, type EyeStyle, type NoseKind } from './features.ts';
import { Cheeks, type CheeksLook } from './cheek.ts';
import type { Range, SkinPoint, Surface } from './surface.ts';

// The face laid on the body's skin. Turning the head slides it over the skin,
// so it never sinks into the fur.

const AHEAD = new Vector3(0, 0, 1);
// Over the fur's tips, or right on a solid skin.
const CHEEK_LIFT = { fur: 0.03, solid: 0.006 };

export interface FaceLook {
  readonly center: readonly [number, number];
  readonly size: readonly [number, number];
  /** How far the face may slide over the skin. */
  readonly slide: { readonly x: Range; readonly y: Range };
  /** Where it faces, in radians about the vertical from ahead: a head turned three quarters. */
  readonly turn?: number;
  /** Fixed on the head: the whole mascot turns to look, its face never sliding over the skin. */
  readonly fixed?: boolean;
  readonly eyes: {
    readonly x: number;
    readonly y: number;
    readonly size: number;
    readonly style?: EyeStyle;
  };
  readonly brows: { readonly y: number; readonly color: string };
  readonly nose: StockNose | OwnNose | null;
  readonly mouth: { readonly y: number; readonly scale: number };
  readonly cheeks: CheeksLook | null;
}

interface StockNose {
  readonly kind: NoseKind;
  readonly y: number;
  readonly size: number;
}

/** A nose of a character's own (a beak, a pink button, whiskers), facing ahead. */
interface OwnNose {
  readonly build: () => Object3D;
  readonly y: number;
  /** How far off the skin; a little by default. */
  readonly lift?: number;
}

interface Feature {
  readonly object: Object3D;
  readonly x: number;
  readonly y: number;
  /** How far off the skin. */
  readonly lift: number;
  readonly roll: number;
}

function noseFeature(look: StockNose | OwnNose): { object: Object3D; lift: number } {
  if ('build' in look) return { object: look.build(), lift: look.lift ?? 0.02 };
  return { object: nose(look.kind, look.size), lift: 0.02 };
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
  /** It never slides to look: the mascot turns whole instead. */
  readonly fixed: boolean;
  readonly #surface: Surface;
  readonly #features: Feature[] = [];
  readonly #eyes: Eye[];
  readonly #eyeSize: number;
  readonly #brows: { readonly piece: Group; readonly side: number }[];
  readonly #mouth = new Mouth();
  readonly #cheeks: Cheeks;
  /** How far the face has slid over the skin. */
  #slid = { x: 0, y: 0 };
  readonly #skin: SkinPoint = { point: new Vector3(), normal: new Vector3() };

  /** `furry`, its features sit over a fur's tips. */
  constructor(surface: Surface, look: FaceLook, furry: boolean) {
    this.#surface = surface;
    this.group.rotation.y = look.turn ?? 0;
    this.fixed = look.fixed ?? false;
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
    if (look.nose) this.#place({ ...noseFeature(look.nose), x: 0, y: look.nose.y, roll: 0 });
    // A face drawn without cheeks blushes under its eyes.
    const under = { x: eyes.x * 1.5, y: (eyes.y + mouth.y) / 2 };
    const lift = furry ? CHEEK_LIFT.fur : CHEEK_LIFT.solid;
    this.#cheeks = new Cheeks(this.group, look.cheeks, under, lift);
    this.#mouth.group.scale.setScalar(mouth.scale);
    this.#place({ object: this.#mouth.group, x: 0, y: mouth.y, lift: 0.008, roll: 0 });
    this.#slide(0, 0);
  }

  #place(feature: Feature): void {
    this.#features.push(feature);
    this.group.add(feature.object);
  }

  #slide(dx: number, dy: number): void {
    this.#slid = { x: dx, y: dy };
    for (const { object, x, y, lift, roll } of this.#features) {
      const { point, normal } = this.#surface.at(x + dx, y + dy, this.#skin);
      object.position.copy(point).addScaledVector(normal, lift);
      object.quaternion.setFromUnitVectors(AHEAD, normal);
      if (roll) object.rotateZ(roll);
    }
  }

  update(pose: Pose, { blink, ...gaze }: Glance): void {
    const glance = this.fixed ? { blink, x: 0, y: 0 } : { blink, ...gaze };
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
    this.#cheeks.update(this.#surface, this.#slid, pose.blush, this.#skin);
  }

  dispose(): void {
    this.#cheeks.dispose();
  }
}
