import type { CoachMood } from '#shared/coach.ts';
import type { Character } from '#content/coach/mascot/cast/character.ts';
import { createFurLook, type FurLook } from '#content/coach/mascot/fur/fur.ts';
import type { EntranceKind } from '#content/coach/mascot/rig/entrance.ts';
import type { ReactionKind } from '#content/coach/mascot/rig/reactions.ts';
import { Mascot } from '#content/coach/mascot/rig/rig.ts';
import { Stage, type Framing } from '#content/coach/mascot/stage.ts';
import { tuneFur } from './fur-tuning.ts';
import { PLAIN_FUR, type FurTuning } from './settings.ts';

// The playground's stage: one mascot, driven as content/coach/mascot/view.ts
// drives it in the extension, with a clock that can slow down, stop and step.

// A long pause (a breakpoint) resumes as one short step, as the extension's loop does.
const MAX_STEP = 1 / 30;
// How far past the canvas's edge an entrance starts, as view.ts has it.
const OFF_STAGE = 1.15;
const FRAME = 1 / 60;

// The look's colors, copied from a fresh look so the tips' tints stay fur.ts's.
const PAINTED = ['uCoat', 'uFrontColor', 'uAccent', 'uCoatTip', 'uFrontTip', 'uAccentTip'] as const;

export class Theater {
  readonly #host: HTMLElement;
  #stage: Stage;
  #framing: Framing;
  #character: Character | null = null;
  #mascot: Mascot | null = null;
  #look: FurLook | null = null;
  #raise = 0;
  #mood: CoachMood = 'neutral';
  #talking = false;
  #fur: FurTuning = PLAIN_FUR;
  #speed = 1;
  #paused = false;
  #follow = true;
  #frame = 0;
  #last = 0;

  constructor(host: HTMLElement, framing: Framing) {
    this.#host = host;
    this.#framing = framing;
    this.#stage = this.#mount(framing);
    new ResizeObserver(() => this.#resize()).observe(host);
    window.addEventListener('pointermove', this.#pointTo, { passive: true });
    this.#run();
  }

  #mount(framing: Framing): Stage {
    const stage = new Stage(framing);
    this.#host.append(stage.canvas);
    return stage;
  }

  #resize(): void {
    this.#stage.resize(this.#host.clientWidth, this.#host.clientHeight);
    this.#stage.render();
  }

  readonly #pointTo = (event: PointerEvent): void => {
    if (!this.#follow) return;
    const box = this.#host.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const x = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
    const y = -(event.clientY - (box.top + box.height * 0.35)) / (box.height / 2);
    this.#mascot?.pointTo({ x, y });
  };

  setFraming(framing: Framing): void {
    this.#stage.dispose();
    this.#stage.canvas.remove();
    this.#stage = this.#mount(framing);
    this.#framing = framing;
    if (this.#character?.facingLeft) this.play(this.#character, false);
    else if (this.#mascot) this.#stage.show(this.#mascot.root, this.#raise);
    this.#resize();
  }

  /** Puts `character` on stage, a new mascot that keeps the mood and the fur's tuning. */
  play(character: Character, greets: boolean): void {
    this.#mascot?.dispose();
    this.#character = character;
    // Whole, as the home's hero shows it, one turned three quarters looks left.
    const shown = this.#framing === 'full' ? (character.facingLeft ?? character) : character;
    const look = createFurLook(character.colors, character.frontMask, character.stripes);
    const mascot = new Mascot(shown, look);
    mascot.setMood(this.#mood);
    mascot.setTalking(this.#talking);
    if (greets) mascot.waveHello();
    tuneFur(mascot.root, this.#fur);
    this.#look = look;
    this.#mascot = mascot;
    this.#raise = character.bust ?? 0;
    this.#stage.show(mascot.root, this.#raise);
    this.#stage.render();
  }

  /** Repaints the mascot in `character`'s colors: a robot eases into them, as between levels. */
  paint(character: Character): void {
    this.#mascot?.recolor(character.colors);
    const look = this.#look;
    if (!look) return;
    const fresh = createFurLook(character.colors, character.frontMask, character.stripes);
    for (const key of PAINTED) look[key].value.copy(fresh[key].value);
    look.uFront.value.copy(fresh.uFront.value);
  }

  tuneFur(tuning: FurTuning): void {
    this.#fur = tuning;
    if (this.#mascot) tuneFur(this.#mascot.root, tuning);
  }

  setMood(mood: CoachMood): void {
    this.#mood = mood;
    this.#mascot?.setMood(mood);
  }

  setTalking(talking: boolean): void {
    this.#talking = talking;
    this.#mascot?.setTalking(talking);
  }

  setFollow(follow: boolean): void {
    this.#follow = follow;
  }

  poke(): void {
    this.#mascot?.poke();
  }

  react(kind: ReactionKind): void {
    this.#mascot?.react(kind);
  }

  hop(strength: number): void {
    this.#mascot?.hop(strength);
  }

  waveHello(): void {
    this.#mascot?.waveHello();
  }

  enter(kind: EntranceKind, from: 'left' | 'right'): void {
    const side = from === 'left' ? -1 : 1;
    this.#mascot?.enter(kind, side * (this.#stage.halfWidth + OFF_STAGE));
  }

  setSpeed(speed: number): void {
    this.#speed = speed;
  }

  get paused(): boolean {
    return this.#paused;
  }

  setPaused(paused: boolean): void {
    this.#paused = paused;
    if (paused) cancelAnimationFrame(this.#frame);
    else this.#run();
  }

  /** One frame of a sixtieth of a second at the clock's speed, while paused. */
  step(): void {
    this.#advance(FRAME);
  }

  /** The canvas as a PNG, drawn just now: WebGL clears it once the frame is shown. */
  snapshot(): string {
    this.#stage.render();
    return this.#stage.canvas.toDataURL('image/png');
  }

  #run(): void {
    this.#last = performance.now();
    this.#frame = requestAnimationFrame(this.#tick);
  }

  readonly #tick = (now: number): void => {
    this.#advance(Math.min(Math.max(now - this.#last, 0) / 1000, MAX_STEP));
    this.#last = now;
    this.#frame = requestAnimationFrame(this.#tick);
  };

  #advance(dt: number): void {
    const mascot = this.#mascot;
    mascot?.update(dt * this.#speed);
    this.#stage.lift(mascot?.height ?? 0, mascot?.x ?? 0);
    this.#stage.open(mascot?.hole ?? null);
    this.#stage.render();
  }
}
