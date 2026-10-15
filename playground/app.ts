import type { Character } from '#content/coach/mascot/cast/character.ts';
import { actorById, edited, type Actor, type Edits } from './cast.ts';
import { loadSettings, saveSettings, type Settings } from './settings.ts';
import { Theater } from './theater.ts';

// The playground's state: its settings, kept as they change, and the stage
// they're shown on.

// The avatar's own proportions, as the review shows the coach.
const ASPECT = 124 / 114;

export class App {
  readonly theater: Theater;
  readonly #stage: HTMLElement;
  #settings: Settings = loadSettings();

  constructor(stage: HTMLElement) {
    this.#stage = stage;
    this.#layOut();
    this.theater = new Theater(stage, this.#settings.framing);
    const { mood, talking, follow, speed, fur } = this.#settings;
    this.theater.setMood(mood);
    this.theater.setTalking(talking);
    this.theater.setFollow(follow);
    this.theater.setSpeed(speed);
    this.theater.tuneFur(fur);
    this.theater.play(this.character, true);
  }

  get settings(): Settings {
    return this.#settings;
  }

  get actor(): Actor {
    return actorById(this.#settings.actor);
  }

  get edits(): Edits {
    return this.#settings.edits[this.actor.id] ?? {};
  }

  /** The actor as edited. */
  get character(): Character {
    return edited(this.actor.character, this.edits);
  }

  update(patch: Partial<Settings>): void {
    this.#settings = { ...this.#settings, ...patch };
    saveSettings(this.#settings);
    this.#layOut();
  }

  /** Adds `patch` to the actor's edits; null takes them all back. */
  edit(patch: Edits | null): void {
    const edits = patch && {
      ...this.edits,
      ...patch,
      colors: { ...this.edits.colors, ...patch.colors },
    };
    const all = { ...this.#settings.edits };
    if (edits) all[this.actor.id] = edits;
    else delete all[this.actor.id];
    this.update({ edits: all });
  }

  #layOut(): void {
    const { size, background } = this.#settings;
    this.#stage.style.height = `${size}px`;
    this.#stage.style.width = `${Math.round(size * ASPECT)}px`;
    document.body.style.setProperty('--stage-bg', background);
  }
}
