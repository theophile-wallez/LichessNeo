import { Group, Matrix4, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import type { Character, PartMotion } from './character.ts';
import { latheGeometry, reshape, type Profile } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import { PIECE_FOOT, pieceRing } from './chess-piece.ts';
import { Horse } from './knight-parts.ts';

// A chess knight: a chubby horse's head and arched neck on the pawn's foot,
// turned three quarters as the piece stands, its long muzzle leaning forward,
// ears up, and a mane of soft scallops down its neck. It looks to the viewer's
// right, and to the left where it stands large, on the home's hero.

const SIDES = [-1, 1] as const;

const BASE: Profile = [...PIECE_FOOT, [0.62, -0.56], [0.4, -0.48], [0.001, -0.46]];

/** A horse's ear, a plump leaf, standing on the origin. */
function earGeometry() {
  return reshape(new SphereGeometry(0.2, 32, 24), vertex => {
    const along = Math.min(Math.max((vertex.y / 0.2 + 1) / 2, 0), 1);
    const width = 1 - 0.7 * along ** 1.5;
    vertex.x *= width * 0.8;
    vertex.z *= width * 0.5;
    vertex.y = along * 0.42;
  });
}

/** Scallops by angle back from straight up over the head's middle, and size: the forelock first. */
const MANE: readonly (readonly [number, number])[] = [
  [-0.35, 0.72],
  [-0.2, 0.95],
  [0.25, 1],
  [0.65, 1],
  [1.05, 0.98],
  [1.45, 0.92],
  [1.85, 0.84],
  [2.25, 0.74],
];

const MANE_COLOR = '#ecd3a4';

// Where the mane's angles are taken from, in the head's own frame: on its middle, between the ears.
const MANE_CENTER = new Vector3(0, 0.45, -0.1);

/** A scallop of the mane: narrow across the neck, long along it. */
function scallopGeometry() {
  return reshape(new SphereGeometry(0.15, 32, 20), vertex => {
    vertex.x *= 0.75;
    vertex.y *= 1;
    vertex.z *= 1.25;
  });
}

function mane(rig: RigBuilder, horse: Horse): void {
  const geometry = scallopGeometry();
  const across = horse.placed(new Vector3(1, 0, 0));
  const basis = new Matrix4();
  for (const [angle, size] of MANE) {
    const outward = new Vector3(0, Math.cos(angle), -Math.sin(angle));
    const center = horse.placed(MANE_CENTER.clone());
    const from = horse.placed(MANE_CENTER.clone().addScaledVector(outward, 2));
    const { point, normal } = horse.skinFrom(from, center.sub(from).normalize());
    const along = new Vector3().crossVectors(across, normal).normalize();
    const side = new Vector3().crossVectors(normal, along);
    const mesh = rig.fur(geometry, {
      layers: 12,
      length: 0.03,
      mode: FurMode.accent,
      accent: MANE_COLOR,
    });
    mesh.quaternion.setFromRotationMatrix(basis.makeBasis(side, normal, along));
    mesh.position.copy(point).addScaledVector(normal, 0.02);
    mesh.scale.setScalar(size);
    rig.body.add(mesh);
  }
}

function stand(rig: RigBuilder, horse: Horse): PartMotion | null {
  rig.body.add(rig.fur(latheGeometry(BASE), { layers: 12, length: 0.03, mode: FurMode.coat }));
  pieceRing(rig, { radius: 0.6, y: -0.56, thickness: 0.075 });
  mane(rig, horse);
  return null;
}

const nostrilMaterial = new MeshStandardMaterial({ color: '#7a58c0', roughness: 0.6 });

/** Two soft nostrils on the end of its muzzle, part of the face so they slide with it. */
function nostrils(): Group {
  const group = new Group();
  const geometry = new SphereGeometry(0.034, 20, 12);
  for (const side of SIDES) {
    const nostril = new Mesh(geometry, nostrilMaterial);
    nostril.scale.set(1.3, 0.9, 0.4);
    nostril.position.x = side * 0.075;
    nostril.rotation.z = side * 0.4;
    group.add(nostril);
  }
  return group;
}

/** The knight turned `turn` about the vertical: its face and ears turn with its head. */
function turned(turn: number): Character {
  const horse = new Horse(turn);
  return {
    name: 'Cavalier',
    skin: 'velvet',
    colors: { coat: '#c9b5f5', front: '#efe7ff', accent: '#ff9ccf' },
    frontMask: [0.8, 0.9],
    stripes: [0, 0, 0],
    body: {
      geometry: () => horse.geometry(),
      surface: () => horse.geometry(80),
      bottom: -1,
      fur: 0.05,
    },
    // Along its head, turned as it is: big eyes just over its short muzzle, its nostrils
    // and mouth on the muzzle's end.
    face: {
      center: [0, 0.68],
      size: [0.5, 0.45],
      slide: { x: [-0.6, 0.6], y: [0.1, 1.3] },
      turn,
      fixed: true,
      eyes: { x: 0.19, y: 0.85, size: 1.75 },
      brows: { y: 1.01, color: '#6a4fb0' },
      nose: { build: nostrils, y: 0.53, lift: 0.01 },
      mouth: { y: 0.38, scale: 0.95 },
      cheeks: { x: 0.28, y: 0.69, style: 'freckles' },
    },
    ears: {
      geometry: earGeometry,
      position: [0.19, 1.2, -0.1],
      tilt: 0.25,
      lift: 0,
      fur: 0.04,
      inner: true,
      turn,
    },
    arms: { position: [0.42, -0.12, 0.12], scale: 0.62, pads: null },
    feet: null,
    bust: 0.3,
    extras: rig => stand(rig, horse),
  };
}

// Three quarters to the viewer's right.
const TURN = 0.42;

export const knight: Character = { ...turned(TURN), facingLeft: turned(-TURN) };
