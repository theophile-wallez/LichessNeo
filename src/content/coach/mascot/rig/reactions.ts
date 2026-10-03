import type { CoachMood } from '#shared/coach.ts';

// What a mascot does when it's clicked: a hop, a hello, a laugh or a twirl,
// one at a time and never the same twice running. While one plays, the
// mascot takes its mood, then goes back to the one it was given.

export type ReactionKind = 'hop' | 'wave' | 'laugh' | 'twirl';

interface Reaction {
  readonly mood: CoachMood;
  readonly seconds: number;
  /** How long its mouth chatters, laughing. */
  readonly laugh: number;
}

export const REACTIONS: Readonly<Record<ReactionKind, Reaction>> = {
  hop: { mood: 'happy', seconds: 1.1, laugh: 0 },
  wave: { mood: 'happy', seconds: 1.9, laugh: 0 },
  laugh: { mood: 'delight', seconds: 1.5, laugh: 1.2 },
  twirl: { mood: 'happy', seconds: 1.1, laugh: 0 },
};

const KINDS: readonly ReactionKind[] = ['hop', 'wave', 'laugh', 'twirl'];
const TWIRL_SECONDS = 0.9;

export class Reactions {
  #kind: ReactionKind | null = null;
  #at = -Infinity;
  readonly #random: () => number;

  constructor(random: () => number = Math.random) {
    this.#random = random;
  }

  /** Starts a reaction other than the last one, and says which. */
  start(time: number): ReactionKind {
    const others = KINDS.filter(kind => kind !== this.#kind);
    const kind = others[Math.floor(this.#random() * others.length)] ?? 'hop';
    this.#kind = kind;
    this.#at = time;
    return kind;
  }

  #playing(time: number): Reaction | null {
    const reaction = this.#kind === null ? null : REACTIONS[this.#kind];
    return reaction && time - this.#at < reaction.seconds ? reaction : null;
  }

  /** The mood to show: the reaction's while it plays, else `given`. */
  mood(time: number, given: CoachMood): CoachMood {
    return this.#playing(time)?.mood ?? given;
  }

  laughing(time: number): boolean {
    const reaction = this.#playing(time);
    return reaction !== null && time - this.#at < reaction.laugh;
  }

  /** The twirl's turn so far, in radians: a full one, eased in and out. */
  spin(time: number): number {
    if (this.#kind !== 'twirl') return 0;
    const progress = Math.min(1, Math.max(0, (time - this.#at) / TWIRL_SECONDS));
    return progress < 1 ? (Math.PI * 2 * (1 - Math.cos(progress * Math.PI))) / 2 : 0;
  }
}
