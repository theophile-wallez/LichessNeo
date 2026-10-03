import { BufferGeometry, Group, Matrix4, Mesh, Vector3 } from 'three';
import type { CoachMood } from '#shared/coach.ts';
import type { Character, PartMotion } from '#content/coach/mascot/cast/character.ts';
import { Face } from '#content/coach/mascot/face/face.ts';
import { Surface } from '#content/coach/mascot/face/surface.ts';
import {
  createFur,
  FurMode,
  type FurLook,
  type FurOptions,
  type FurPart,
} from '#content/coach/mascot/fur/fur.ts';
import { easePose, MOODS, type Pose } from '#content/coach/mascot/moods.ts';
import { between, damp, Spring } from '#content/coach/mascot/motion.ts';
import { Blinker, Glances, Jumper, Talker, type Gaze } from './behaviour.ts';
import { bendFur } from './fur-lag.ts';
import { Reactions } from './reactions.ts';
import {
  buildArms,
  buildEars,
  buildFeet,
  palmForward,
  type Arm,
  type Ear,
  type RigBuilder,
} from './limbs.ts';

// One rig for every mascot: a character says what its body, face, ears, arms
// and feet look like, and what else it has; the rig breathes, blinks, talks,
// hops, takes the review's moods, and reacts when it's clicked.

const HELLO_SECONDS = 1.8;

export class Mascot implements RigBuilder {
  readonly root = new Group();
  readonly body = new Group();
  /** The mood it shows: the one it was given, or a reaction's. */
  mood: CoachMood = 'neutral';
  #given: CoachMood = 'neutral';
  #talking = false;
  readonly #reactions = new Reactions();
  readonly #squashed = new Group();
  readonly #torso = new Group();
  readonly #look: FurLook;
  readonly #furs: FurPart[] = [];
  readonly #face: Face;
  readonly #ears: Ear[];
  readonly #arms: Arm[];
  readonly #extra: PartMotion | null;
  #pose: Pose = MOODS.neutral.pose;
  #time = 0;
  readonly #squash = new Spring(240, 11);
  readonly #lean = new Spring(120, 9);
  readonly #puff = new Spring(90, 7);
  readonly #jumper = new Jumper(this.#squash);
  readonly #blinker = new Blinker();
  readonly #talker = new Talker();
  readonly #glances = new Glances();
  #twitchAt = 3;
  #waveUntil = 0;
  #wave = 0;
  readonly #armRotation = new Matrix4();

  constructor(character: Character, look: FurLook) {
    this.#look = look;
    this.body.position.y = -character.body.bottom;
    this.root.add(this.#squashed);
    this.#squashed.add(this.#torso);
    this.#torso.add(this.body);
    const { body, face } = character;
    const options = {
      layers: 24,
      length: body.fur,
      mode: FurMode.body,
      face: face.center,
      faceSize: face.size,
    };
    this.body.add(this.fur(body.geometry(), options));
    this.#face = new Face(new Surface(body.surface(), face.slide), face);
    this.body.add(this.#face.group);
    this.#ears = buildEars(this, character.ears);
    this.#arms = buildArms(this, character.arms);
    buildFeet(this, this.#squashed, character.feet);
    this.#extra = character.extras(this);
  }

  /** How high it is off the ground, mid-hop. */
  get height(): number {
    return this.#jumper.height;
  }

  readonly fur = (geometry: BufferGeometry, options: FurOptions, probe?: Vector3): Mesh => {
    const part = createFur(geometry, this.#look, options, probe);
    this.#furs.push(part);
    return part.mesh;
  };

  dispose(): void {
    this.root.traverse(object => {
      if (object instanceof Mesh && object.geometry instanceof BufferGeometry)
        object.geometry.dispose();
    });
    for (const part of this.#furs) part.material.dispose();
  }

  setMood(mood: CoachMood): void {
    this.#given = mood;
  }

  /** Takes up `mood` as it shows: a hop of joy, a start of shock. */
  #show(mood: CoachMood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    if (mood === 'happy') this.hop(2.2);
    if (mood === 'delight') this.hop(4.2);
    if (mood === 'shock') {
      this.hop(2.6);
      this.#lean.kick(-2.2);
      this.#puff.kick(5);
    }
    if (mood === 'worry') this.#squash.kick(-1.2);
    if (mood === 'doubt') this.#lean.kick(0.6);
  }

  setTalking(talking: boolean): void {
    this.#talking = talking;
  }

  /** A cute reaction to a click: a hop, a hello, a laugh or a twirl. */
  poke(): void {
    const kind = this.#reactions.start(this.#time);
    if (kind === 'hop') this.hop(4);
    if (kind === 'wave') this.waveHello();
    if (kind === 'laugh') this.hop(2.4);
  }

  hop(strength: number): void {
    this.#jumper.hop(this.#time, strength);
  }

  waveHello(): void {
    this.#waveUntil = this.#time + HELLO_SECONDS;
  }

  /** The pointer, from -1 to 1 each way. */
  pointTo(gaze: Gaze): void {
    this.#glances.pointTo(gaze, this.#time);
  }

  update(dt: number): void {
    this.#time += dt;
    const time = this.#time;
    this.#show(this.#reactions.mood(time, this.#given));
    this.#talker.talking = this.#talking || this.#reactions.laughing(time);
    const mood = MOODS[this.mood];
    this.#pose = easePose(this.#pose, mood.pose, (from, to) => damp(from, to, 9, dt));
    const pose = this.#pose;
    this.#jumper.step(time, dt);
    this.#glances.step(time, dt, mood.look);
    const blink = this.#blinker.openness(time);
    const talkOpen = this.#talker.openness(dt);

    const breath = Math.sin(time * 1.7) * 0.012;
    this.#squash.target = -pose.slump * 0.05 + talkOpen * 0.012;
    const velocity = this.#jumper.velocity;
    const stretch =
      1 +
      breath +
      this.#squash.step(dt) +
      Math.min(velocity, 0) * -0.004 +
      Math.max(velocity, 0) * 0.02;
    const thin = 1 / Math.sqrt(Math.max(stretch, 0.5));
    this.#squashed.scale.set(thin, stretch, thin);
    this.root.position.y = this.#jumper.height;

    this.#lean.target = pose.lean;
    this.#torso.rotation.x = this.#lean.step(dt);
    // Without arms to wave, it says hello by wobbling.
    const wobble = this.#arms.length > 0 ? 0 : Math.sin(time * 11) * 0.09 * this.#wave;
    this.#torso.rotation.z =
      pose.tilt + wobble + Math.sin(time * 0.8) * 0.022 + Math.sin(time * 0.37) * 0.012;
    this.#torso.rotation.y = this.#glances.x * 0.14 + this.#reactions.spin(time);
    this.#moveEars(time, dt);
    this.#moveArms(time, dt);

    this.#puff.target = pose.puff;
    const puff = Math.max(-0.2, this.#puff.step(dt));
    for (const part of this.#furs) part.puff.value = puff;
    this.#extra?.update(time, this.mood);

    const open = pose.open + talkOpen * (0.6 - pose.open * 0.5);
    this.#face.update({ ...pose, open }, { blink, x: this.#glances.x, y: this.#glances.y });
    this.root.updateMatrixWorld(true);
    bendFur(this.#furs, dt);
  }

  #moveEars(time: number, dt: number): void {
    if (time > this.#twitchAt && this.#ears.length > 0) {
      this.#twitchAt = time + between(3.5, 9);
      this.#ears[Math.random() < 0.5 ? 0 : 1]?.twitch.kick(between(5, 8));
    }
    for (const { pivot, side, tilt, twitch } of this.#ears) {
      const droop = this.#pose.ears;
      pivot.rotation.z = -side * (tilt + 0.5 * droop + twitch.step(dt) * 0.1);
      pivot.rotation.x = -Math.max(droop, 0) * 0.45;
    }
  }

  #moveArms(time: number, dt: number): void {
    this.#wave = damp(this.#wave, time < this.#waveUntil ? 1 : 0, 8, dt);
    const { arms } = MOODS[this.mood];
    const wanted = new Vector3();
    for (const arm of this.#arms) {
      wanted.fromArray(arm.side < 0 ? arms.left : arms.right);
      if (this.mood === 'delight') wanted.x += Math.sin(time * 15 + arm.side) * 0.18;
      if (arm.side < 0 && this.#wave > 0.01) {
        const angle = -0.5 + Math.sin(time * 11) * 0.32;
        wanted.lerp(new Vector3(Math.sin(angle), Math.cos(angle), 0.25), this.#wave);
      }
      arm.direction.lerp(wanted.normalize(), 1 - Math.exp(-10 * dt)).normalize();
      arm.pivot.quaternion.setFromRotationMatrix(palmForward(arm.direction, this.#armRotation));
    }
  }
}
