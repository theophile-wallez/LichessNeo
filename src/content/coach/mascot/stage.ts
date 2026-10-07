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
// all of it standing over its shadow.

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
  readonly #environment: Texture;
  readonly #framing: Framing;
  readonly #shadow: Mesh<PlaneGeometry, MeshBasicMaterial> | null;
  #actor: Object3D | null = null;

  /** Throws without WebGL. */
  constructor(framing: Framing) {
    this.#framing = framing;
    this.#renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.#renderer.toneMapping = NeutralToneMapping;
    this.canvas = this.#renderer.domElement;
    const generator = new PMREMGenerator(this.#renderer);
    this.#environment = generator.fromScene(new RoomEnvironment(), 0.04).texture;
    generator.dispose();
    this.#scene.environment = this.#environment;
    this.#scene.environmentIntensity = 0.7;
    const key = new DirectionalLight('#fff6ea', 2.4);
    key.position.set(-2.5, 4, 3);
    this.#scene.add(key, new HemisphereLight('#dcdcff', '#8f8070', 1));
    this.#ground.position.y = FEET;
    this.#scene.add(this.#ground);
    // Its feet show only in full: there, it stands over a soft shadow.
    this.#shadow = framing === 'full' ? groundShadow() : null;
    if (this.#shadow) this.#ground.add(this.#shadow);
    this.#frame();
  }

  #frame(): void {
    const [bottom, top] = FRAMINGS[this.#framing];
    const middle = FEET + (bottom + top) / 2;
    this.#camera.fov = MathUtils.radToDeg(2 * Math.atan((top - bottom) / 2 / DISTANCE));
    this.#camera.position.set(0, middle + 0.1, DISTANCE);
    this.#camera.lookAt(0, middle, 0);
    this.#camera.updateProjectionMatrix();
  }

  show(actor: Object3D): void {
    if (this.#actor) this.#ground.remove(this.#actor);
    this.#actor = actor;
    this.#ground.add(actor);
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
    const lift = 1 / (1 + height * 1.6);
    this.#shadow.scale.setScalar(lift);
    this.#shadow.material.opacity = lift;
  }

  render(): void {
    this.#renderer.render(this.#scene, this.#camera);
  }

  dispose(): void {
    this.#shadow?.geometry.dispose();
    this.#shadow?.material.map?.dispose();
    this.#shadow?.material.dispose();
    this.#environment.dispose();
    this.#renderer.dispose();
    // Browsers keep a few WebGL contexts per page: hand this one back now.
    this.#renderer.forceContextLoss();
  }
}

/** A round soft shadow on the ground, drawn once on a canvas. */
function groundShadow(): Mesh<PlaneGeometry, MeshBasicMaterial> {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const material = new MeshBasicMaterial({
    map: new CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
  });
  const shadow = new Mesh(new PlaneGeometry(2.6, 1.3), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.002, 0.15);
  return shadow;
}
