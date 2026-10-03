import type { CoachMood } from '#shared/coach.ts';
import { CAST } from './cast/characters.ts';
import { createFurLook } from './fur/fur.ts';
import { VisibleLoop } from './loop.ts';
import { Mascot } from './rig/rig.ts';
import { Stage, type Framing } from './stage.ts';

// One live mascot in an avatar: its canvas, its loop, and what the review
// asks of it. Its eyes follow the pointer while it runs.

export interface MascotView {
  /** The coach's number, 1 to 7. */
  readonly setCoach: (coach: number) => void;
  readonly setMood: (mood: CoachMood) => void;
  readonly setTalking: (talking: boolean) => void;
  /** A cute reaction to a click. */
  readonly poke: () => void;
  readonly destroy: () => void;
}

function cast(coach: number): Mascot {
  const character = CAST[(coach - 1 + CAST.length) % CAST.length] ?? CAST[0];
  if (!character) throw new Error('the cast is empty');
  const look = createFurLook(character.colors, character.frontMask, character.stripes);
  return new Mascot(character, look);
}

class LiveMascot implements MascotView {
  readonly #stage: Stage;
  readonly #loop: VisibleLoop;
  readonly #resizer: ResizeObserver;
  #mascot: Mascot | null = null;
  #coach = 0;
  #mood: CoachMood = 'neutral';
  #talking = false;

  constructor(host: HTMLElement, stage: Stage) {
    this.#stage = stage;
    host.append(stage.canvas);
    // The canvas, not its host: a stylesheet may let it spill past the avatar's sides.
    const { canvas } = stage;
    this.#resizer = new ResizeObserver(() => stage.resize(canvas.clientWidth, canvas.clientHeight));
    this.#resizer.observe(canvas);
    this.#loop = new VisibleLoop(host, dt => this.#frame(dt));
    window.addEventListener('pointermove', this.#follow, { passive: true });
  }

  readonly #follow = (event: PointerEvent): void => {
    if (!this.#loop.running) return;
    const box = this.#stage.canvas.getBoundingClientRect();
    if (box.width === 0) return;
    const x = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
    const y = -(event.clientY - (box.top + box.height * 0.35)) / (box.height / 2);
    this.#mascot?.pointTo({ x, y });
  };

  #frame(dt: number): void {
    this.#mascot?.update(dt);
    this.#stage.lift(this.#mascot?.height ?? 0);
    this.#stage.render();
  }

  setCoach(coach: number): void {
    if (coach === this.#coach) return;
    this.#coach = coach;
    this.#mascot?.dispose();
    const mascot = cast(coach);
    mascot.setMood(this.#mood);
    mascot.setTalking(this.#talking);
    mascot.waveHello();
    this.#mascot = mascot;
    this.#stage.show(mascot.root);
  }

  setMood(mood: CoachMood): void {
    this.#mood = mood;
    this.#mascot?.setMood(mood);
  }

  setTalking(talking: boolean): void {
    this.#talking = talking;
    this.#mascot?.setTalking(talking);
  }

  poke(): void {
    this.#mascot?.poke();
  }

  destroy(): void {
    window.removeEventListener('pointermove', this.#follow);
    this.#loop.dispose();
    this.#resizer.disconnect();
    this.#mascot?.dispose();
    this.#stage.dispose();
    this.#stage.canvas.remove();
  }
}

export interface MascotOptions {
  /** Its head and belly, as the review's avatar shows it (the default), or all of it. */
  readonly framing?: Framing;
}

/** A live mascot drawn in `host`, or null where the browser has no WebGL. */
export function mountMascot(host: HTMLElement, options: MascotOptions = {}): MascotView | null {
  let stage: Stage;
  try {
    stage = new Stage(options.framing ?? 'bust');
  } catch (error) {
    console.warn('[LichessReimagined] no WebGL for the coach', error);
    return null;
  }
  return new LiveMascot(host, stage);
}
