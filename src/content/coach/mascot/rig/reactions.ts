import type { CoachMood } from '#shared/coach.ts';

// What a mascot does when it's clicked: a hop, a hello, a laugh or a twirl,
// one at a time and never the same twice running. While one plays, the
// mascot takes its mood, then goes back to the one it was given. It also says
// hello once it has come on stage (rig/entrance.ts).

export type ReactionKind = 'hop' | 'wave' | 'laugh' | 'twirl' | 'hello';

interface Reaction {
  readonly mood: CoachMood;
  readonly seconds: number;
  /** How long its mouth chatters, laughing or saying hi. */
  readonly chatter: number;
}

export const REACTIONS: Readonly<Record<ReactionKind, Reaction>> = {
  hop: { mood: 'happy', seconds: 1.1, chatter: 0 },
  wave: { mood: 'happy', seconds: 1.9, chatter: 0 },
  laugh: { mood: 'delight', seconds: 1.5, chatter: 1.2 },
  twirl: { mood: 'happy', seconds: 1.1, chatter: 0 },
  hello: { mood: 'happy', seconds: 2, chatter: 0.7 },
};

// The ones a click picks from.
const KINDS: readonly ReactionKind[] = ['hop', 'wave', 'laugh', 'twirl'];
const TWIRL_SECONDS = 0.9;

export class Reactions {
  #kind: ReactionKind | null = null;
  #at = -Infinity;
  /** When the last twirl began: it turns all the way round whatever comes after it. */
  #twirlAt = -Infinity;
  readonly #random: () => number;

  constructor(random: () => number = Math.random) {
    this.#random = random;
  }

  /** Starts a reaction other than the last one, and not a twirl while one turns; says which. */
  start(time: number): ReactionKind {
    const twirling = this.spin(time) !== 0;
    const others = KINDS.filter(kind => kind !== this.#kind && !(twirling && kind === 'twirl'));
    const kind = others[Math.floor(this.#random() * others.length)] ?? 'hop';
    this.play(kind, time);
    return kind;
  }

  play(kind: ReactionKind, time: number): void {
    this.#kind = kind;
    this.#at = time;
    if (kind === 'twirl') this.#twirlAt = time;
  }

  #playing(time: number): Reaction | null {
    const reaction = this.#kind === null ? null : REACTIONS[this.#kind];
    return reaction && time - this.#at < reaction.seconds ? reaction : null;
  }

  /** The mood to show: the reaction's while it plays, else `given`. */
  mood(time: number, given: CoachMood): CoachMood {
    return this.#playing(time)?.mood ?? given;
  }

  chattering(time: number): boolean {
    const reaction = this.#playing(time);
    return reaction !== null && time - this.#at < reaction.chatter;
  }

  /** The twirl's turn so far, in radians: a full one, eased in and out, whatever began since. */
  spin(time: number): number {
    const progress = Math.min(1, Math.max(0, (time - this.#twirlAt) / TWIRL_SECONDS));
    return progress < 1 ? (Math.PI * 2 * (1 - Math.cos(progress * Math.PI))) / 2 : 0;
  }
}
