import {
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
  type Object3D,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// The renderer and its scene: a key light, a sky, a room for the eyes' gloss,
// and a camera framed on the mascot's head and belly, like a portrait, or on
// all of it standing over its shadow, or by the hole it leaps out of.

const FEET = -1.25;
const DISTANCE = 7.4;
/** What the camera shows, from the ground up: head and belly, or all of it, ears and antennae too. */
export const FRAMINGS = { bust: [0.55, 2.45], full: [-0.2, 2.75] } as const;
export type Framing = keyof typeof FRAMINGS;
// Sharper than that costs more than it shows at the avatar's size.
const MAX_PIXEL_RATIO = 2;

export class Stage {
  readonly canvas: HTMLCanvasElement;
  readonly #renderer: WebGLRenderer;
  readonly #scene = new Scene();
  readonly #camera = new PerspectiveCamera(14.6, 124 / 114, 0.1, 50);
  readonly #ground = new Group();
  #environment: Texture | null = null;
  #compiled = false;
  #compiling = false;
  readonly #framing: Framing;
  readonly #shadow: Mesh<PlaneGeometry, MeshBasicMaterial> | null;
  readonly #hole = groundSprite(holeTexture(), [2.1, 1.5], 0.004);
  // The floor, drawn in depth only: what's under it, out of its hole, stays out of sight.
  readonly #floor = new Mesh(
    new PlaneGeometry(60, 60),
    new MeshBasicMaterial({ colorWrite: false }),
  );
  #actor: Object3D | null = null;
  #raise = 0;

  /** Throws without WebGL. */
  constructor(framing: Framing) {
    this.#framing = framing;
    this.#renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.#renderer.toneMapping = NeutralToneMapping;
    this.canvas = this.#renderer.domElement;
    this.#scene.environmentIntensity = 0.7;
    const key = new DirectionalLight('#fff6ea', 2.4);
    key.position.set(-2.5, 4, 3);
    this.#scene.add(key, new HemisphereLight('#dcdcff', '#8f8070', 1));
    this.#ground.position.y = FEET;
    this.#scene.add(this.#ground);
    // Its feet show only in full: there, it stands over a soft shadow.
    this.#shadow = framing === 'full' ? groundShadow() : null;
    if (this.#shadow) this.#ground.add(this.#shadow);
    this.#floor.rotation.x = -Math.PI / 2;
    this.#floor.renderOrder = -2;
    this.#hole.renderOrder = -1;
    this.#floor.visible = false;
    this.#hole.visible = false;
    this.#ground.add(this.#floor, this.#hole);
    this.#frame();
  }

  #frame(): void {
    const [bottom, top] = FRAMINGS[this.#framing];
    const middle = FEET + (bottom + top) / 2 + this.#raise;
    this.#camera.fov = MathUtils.radToDeg(2 * Math.atan((top - bottom) / 2 / DISTANCE));
    this.#camera.position.set(0, middle + 0.1, DISTANCE);
    this.#camera.lookAt(0, middle, 0);
    this.#camera.updateProjectionMatrix();
  }

  /** Puts `actor` on stage, a bust framed `raise` higher for a face off the egg's height. */
  show(actor: Object3D, raise = 0): void {
    if (this.#actor) this.#ground.remove(this.#actor);
    this.#actor = actor;
    this.#ground.add(actor);
    const raised = this.#framing === 'bust' ? raise : 0;
    if (raised === this.#raise) return;
    this.#raise = raised;
    this.#frame();
  }

  /**
   * Sizes the canvas. The framing fills its bottom `framed` pixels: a canvas taller than that
   * shows more above, at the same scale, room for the mascot's hops.
   */
  resize(width: number, height: number, framed = height): void {
    if (width === 0 || height === 0 || framed === 0) return;
    this.#renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / framed;
    if (height > framed)
      this.#camera.setViewOffset(width, framed, 0, framed - height, width, height);
    else this.#camera.clearViewOffset();
    this.#camera.updateProjectionMatrix();
  }

  /** Half the width it shows where the mascot stands. */
  get halfWidth(): number {
    return Math.tan(MathUtils.degToRad(this.#camera.fov) / 2) * DISTANCE * this.#camera.aspect;
  }

  /** The shadow under a mascot `height` off the ground, mid-hop: smaller and fainter. */
  lift(height: number, x: number): void {
    if (!this.#shadow) return;
    this.#shadow.position.x = x;
    const lift = 1 / (1 + Math.max(0, height) * 1.6);
    this.#shadow.scale.setScalar(lift);
    // None under it while it's below the floor.
    this.#shadow.material.opacity = height < 0 ? 0 : lift;
  }

  /** The hole in the floor it comes out of, `openness` from 0 to 1; null, the floor is whole. */
  open(openness: number | null): void {
    this.#floor.visible = openness !== null;
    this.#hole.visible = openness !== null && openness > 0.01;
    this.#hole.scale.setScalar(Math.max(openness ?? 0, 0.001));
  }

  // The room, its light blurred for each roughness: built as the first frame is, not with the
  // stage, which is built in the same task as the mascot.
  #light(): void {
    if (this.#environment) return;
    const generator = new PMREMGenerator(this.#renderer);
    this.#environment = generator.fromScene(new RoomEnvironment(), 0.04).texture;
    generator.dispose();
    this.#scene.environment = this.#environment;
  }

  /**
   * Whether a frame can be drawn without a freeze. The first time, it lights the stage and
   * compiles the shaders of what's on it, off the main thread where the browser can.
   */
  ready(): boolean {
    if (this.#compiled || this.#compiling) return this.#compiled;
    this.#compiling = true;
    this.#light();
    // A failed compile leaves it to the first frame, as it would be otherwise.
    void this.#renderer
      .compileAsync(this.#scene, this.#camera)
      .catch((error: unknown) => console.warn('[LichessNeo] the coach’s shaders', error))
      .finally(() => {
        this.#compiled = true;
      });
    return false;
  }

  render(): void {
    this.#light();
    this.#renderer.render(this.#scene, this.#camera);
  }

  dispose(): void {
    for (const mesh of [this.#shadow, this.#hole, this.#floor]) {
      if (!mesh) continue;
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.dispose();
    }
    this.#environment?.dispose();
    this.#renderer.dispose();
    // Browsers keep a few WebGL contexts per page: hand this one back now.
    this.#renderer.forceContextLoss();
  }
}

/** A round gradient, drawn once on a canvas: `stops` from its center out. */
function radialTexture(stops: readonly (readonly [number, string])[]): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [at, color] of stops) gradient.addColorStop(at, color);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  return new CanvasTexture(canvas);
}

/** A soft shadow, dark in its middle. */
const shadowTexture = (): CanvasTexture =>
  radialTexture([
    [0, 'rgba(0, 0, 0, 0.55)'],
    [1, 'rgba(0, 0, 0, 0)'],
  ]);

/** A hole, deep in its middle, its rim lit, its edge soft. */
const holeTexture = (): CanvasTexture =>
  radialTexture([
    [0, 'rgba(6, 5, 12, 1)'],
    [0.7, 'rgba(18, 15, 30, 1)'],
    [0.84, 'rgba(70, 64, 96, 0.95)'],
    [0.92, 'rgba(18, 15, 30, 0.6)'],
    [1, 'rgba(0, 0, 0, 0)'],
  ]);

/** `texture` laid flat on the ground, `size` wide and deep, `lift` over it. */
function groundSprite(
  texture: CanvasTexture,
  [width, depth]: readonly [number, number],
  lift: number,
): Mesh<PlaneGeometry, MeshBasicMaterial> {
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new Mesh(new PlaneGeometry(width, depth), material);
  sprite.rotation.x = -Math.PI / 2;
  sprite.position.set(0, lift, 0.15);
  return sprite;
}

/** A round soft shadow on the ground. */
const groundShadow = (): Mesh<PlaneGeometry, MeshBasicMaterial> =>
  groundSprite(shadowTexture(), [2.6, 1.3], 0.002);
