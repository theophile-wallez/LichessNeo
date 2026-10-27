import type { CoachMood } from '#shared/coach.ts';
import { createElement, setData } from '#shared/dom.ts';
import type { MascotView } from './mascot/index.ts';
import type { Framing } from './mascot/stage.ts';
import { loadMascots, onCoachMotion } from './load.ts';

// One place a mascot shows live, outside the Game Review: a box of ours put in
// the page, over the still the page shows under it, mounted once the mascots'
// bundle is in, and gone with whatever holds it. The holder is marked
// `data-ln-ext-live` once it's drawn, for its still to go. Without WebGL, or
// while the settings keep the coaches still, the still stays.

/** Who shows: a coach by its number, or the computer's robot by Stockfish's level. */
export type Cast = { readonly coach: number } | { readonly computer: number };

export interface SpotOptions {
  /** Sets where the box goes and its size. */
  readonly className: string;
  readonly framing: Framing;
  /** It waves hello as it shows (the default), or is simply there. */
  readonly greets?: boolean;
  /** It's built once the browser is idle, so it never holds up the page. */
  readonly whenIdle?: boolean;
  /** Called once it's drawn, with what holds it. */
  readonly onDrawn?: (holder: HTMLElement) => void;
}

// The longest it waits for the browser to be idle.
const IDLE_TIMEOUT_MS = 1500;

const idle = (): Promise<void> =>
  new Promise(resolve => requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT_MS }));

function play(view: MascotView, cast: Cast): void {
  if ('coach' in cast) view.setCoach(cast.coach);
  else view.setComputer(cast.computer);
}

export class MascotSpot {
  readonly #options: SpotOptions;
  #holder: HTMLElement | null = null;
  #box: HTMLElement | null = null;
  #view: MascotView | null = null;
  #mood: CoachMood = 'neutral';
  #cast: Cast = { coach: 1 };
  #stopFollowing: (() => void) | null = null;

  constructor(options: SpotOptions) {
    this.#options = options;
  }

  /** Puts `cast` in `holder` with `mood`, or takes it away for null. Cheap when nothing changed. */
  sync(holder: HTMLElement | null, mood: CoachMood, cast: Cast): void {
    this.#mood = mood;
    this.#cast = cast;
    if (holder !== this.#holder) this.#follow(holder);
    if (this.#box && (!holder || this.#box.parentElement !== holder)) this.#remove();
    if (holder && !this.#box) void this.#mount(holder);
    if (!this.#view) return;
    play(this.#view, cast);
    this.#view.setMood(mood);
  }

  /** A cute reaction, as to a click. */
  poke(): void {
    this.#view?.poke();
  }

  // Taken off or put back as the settings' 3D is switched, in this tab or another.
  #follow(holder: HTMLElement | null): void {
    this.#holder = holder;
    this.#stopFollowing?.();
    this.#stopFollowing = holder ? onCoachMotion(moving => this.#move(holder, moving)) : null;
  }

  #move(holder: HTMLElement, moving: boolean): void {
    if (!holder.isConnected) return this.sync(null, this.#mood, this.#cast);
    this.#remove();
    if (moving) void this.#mount(holder);
  }

  async #mount(holder: HTMLElement): Promise<void> {
    const box = createElement('div', {
      className: `ln-ext-mascot ${this.#options.className}`,
      attrs: { 'aria-hidden': 'true' },
    });
    holder.append(box);
    this.#box = box;
    const { framing, greets, whenIdle, onDrawn } = this.#options;
    if (whenIdle) await idle();
    const mountMascot = await loadMascots();
    if (this.#box !== box || !box.isConnected) return;
    const view = mountMascot?.(box, {
      framing,
      greets: greets ?? true,
      onDrawn: () => {
        if (this.#box !== box) return;
        setData(holder, 'lnExtLive', '');
        onDrawn?.(holder);
      },
    });
    if (!view) return;
    play(view, this.#cast);
    view.setMood(this.#mood);
    box.addEventListener('click', () => view.poke());
    this.#view = view;
  }

  #remove(): void {
    this.#view?.destroy();
    this.#view = null;
    const holder = this.#box?.parentElement;
    if (holder) setData(holder, 'lnExtLive', null);
    this.#box?.remove();
    this.#box = null;
  }
}
