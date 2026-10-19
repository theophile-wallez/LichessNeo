import { z } from 'zod/mini';
import { type CoachMood, ROBOT_COACH, ROBOT_COACH_LEVEL } from '#shared/coach.ts';
import { readStored, StorageKey, writeStored } from '#shared/storage.ts';
import type { Character } from './cast/character.ts';
import { coachCharacter } from './cast/cast.ts';
import { robotFor } from './cast/robot.ts';
import { ENTRANCE_KINDS, nextEntrance } from './rig/entrance.ts';
import { createFurLook } from './fur/fur.ts';
import { VisibleLoop } from './loop.ts';
import { Mascot } from './rig/rig.ts';
import { Stage, type Framing } from './stage.ts';

// One live mascot in an avatar: its canvas, its loop, and what the review
// asks of it. Its eyes follow the pointer while it runs.

export interface MascotView {
  /** The coach's number, 1 to COACH_COUNT (the robot's is ROBOT_COACH). */
  readonly setCoach: (coach: number) => void;
  /** The computer's robot in place of a coach, in the colors of Stockfish's `level`, 1 to 8. */
  readonly setComputer: (level: number) => void;
  readonly setMood: (mood: CoachMood) => void;
  readonly setTalking: (talking: boolean) => void;
  /** Brings it on stage, a way other than last time's, from `from` if it walks or hops in; then it waves hello. */
  readonly enter: (from: 'left' | 'right') => void;
  /** A cute reaction to a click. */
  readonly poke: () => void;
  readonly destroy: () => void;
}

const EntranceKindSchema = z.enum(ENTRANCE_KINDS);

// How far past the canvas's edge it starts: just out of sight, arms and all.
const OFF_STAGE = 1.15;

function cast(character: Character): Mascot {
  const look = createFurLook(character.colors, character.frontMask, character.stripes);
  return new Mascot(character, look);
}

class LiveMascot implements MascotView {
  readonly #stage: Stage;
  readonly #host: HTMLElement;
  readonly #loop: VisibleLoop;
  readonly #resizer: ResizeObserver;
  #mascot: Mascot | null = null;
  #character: Character | null = null;
  #mood: CoachMood = 'neutral';
  #talking = false;
  readonly #greets: boolean;
  readonly #facing: Facing;
  #onDrawn: (() => void) | null;

  constructor(host: HTMLElement, stage: Stage, options: MascotOptions) {
    this.#stage = stage;
    this.#host = host;
    this.#greets = options.greets ?? true;
    this.#facing = options.facing ?? 'right';
    this.#onDrawn = options.onDrawn ?? null;
    host.append(stage.canvas);
    // The canvas, not its host: a stylesheet may let it spill past the avatar's sides, and
    // above it, where the framing, kept to the host's height, leaves room for hops.
    const { canvas } = stage;
    const resize = (): void =>
      stage.resize(canvas.clientWidth, canvas.clientHeight, host.clientHeight);
    // Now too, not only once observed: an entrance starts from the canvas's edge.
    resize();
    this.#resizer = new ResizeObserver(resize);
    this.#resizer.observe(canvas);
    this.#resizer.observe(host);
    this.#loop = new VisibleLoop(host, dt => this.#frame(dt));
    window.addEventListener('pointermove', this.#follow, { passive: true });
  }

  readonly #follow = (event: PointerEvent): void => {
    if (!this.#loop.running) return;
    const box = this.#stage.canvas.getBoundingClientRect();
    // Its head's height is the framing's, which the host holds, whatever room the canvas has above.
    const framed = this.#host.getBoundingClientRect();
    if (box.width === 0 || framed.height === 0) return;
    const x = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
    const y = -(event.clientY - (framed.top + framed.height * 0.35)) / (framed.height / 2);
    this.#mascot?.pointTo({ x, y });
  };

  #frame(dt: number): void {
    // Its first frame waits for the stage: the still under it shows meanwhile.
    if (!this.#stage.ready()) return;
    this.#mascot?.update(dt);
    this.#stage.lift(this.#mascot?.height ?? 0, this.#mascot?.x ?? 0);
    this.#stage.open(this.#mascot?.hole ?? null);
    this.#stage.render();
    if (!this.#mascot || !this.#onDrawn) return;
    const drawn = this.#onDrawn;
    this.#onDrawn = null;
    drawn();
  }

  setCoach(coach: number): void {
    this.#play(coach === ROBOT_COACH ? robotFor(ROBOT_COACH_LEVEL) : coachCharacter(coach));
  }

  setComputer(level: number): void {
    this.#play(robotFor(level));
  }

  #play(character: Character): void {
    if (character === this.#character) return;
    const previous = this.#character;
    this.#character = character;
    // The same mascot in other colors, a robot of another level, turns into them as it goes.
    if (this.#mascot && previous?.name === character.name) {
      this.#mascot.recolor(character.colors);
      return;
    }
    this.#mascot?.dispose();
    const mascot = cast(this.#facing === 'left' ? (character.facingLeft ?? character) : character);
    mascot.setMood(this.#mood);
    mascot.setTalking(this.#talking);
    if (this.#greets) mascot.waveHello();
    this.#mascot = mascot;
    this.#stage.show(mascot.root, character.bust);
  }

  setMood(mood: CoachMood): void {
    this.#mood = mood;
    this.#mascot?.setMood(mood);
  }

  setTalking(talking: boolean): void {
    this.#talking = talking;
    this.#mascot?.setTalking(talking);
  }

  enter(from: 'left' | 'right'): void {
    // Picked anew on every load, so remembered across them.
    const kind = nextEntrance(readStored(StorageKey.coachEntrance, EntranceKindSchema));
    writeStored(StorageKey.coachEntrance, kind);
    const side = from === 'left' ? -1 : 1;
    this.#mascot?.enter(kind, side * (this.#stage.halfWidth + OFF_STAGE));
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
  /** It waves hello as each mascot shows (the default), or is simply there. */
  readonly greets?: boolean;
  /** Called once its first mascot is drawn: a still under it may go then. */
  readonly onDrawn?: () => void;
  /** Which way one turned three quarters looks: the right (the default), or the left. */
  readonly facing?: Facing;
}

export type Facing = 'left' | 'right';

/** A live mascot drawn in `host`, or null where the browser has no WebGL. */
export function mountMascot(host: HTMLElement, options: MascotOptions = {}): MascotView | null {
  let stage: Stage;
  try {
    stage = new Stage(options.framing ?? 'bust');
  } catch (error) {
    console.warn('[LichessNeo] no WebGL for the coach', error);
    return null;
  }
  return new LiveMascot(host, stage, options);
}
