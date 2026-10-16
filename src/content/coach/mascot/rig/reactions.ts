import type { CoachMood } from '#shared/coach.ts';
import type { Onset } from '#content/coach/mascot/pose.ts';

// What a mascot does when it's clicked: a hop, a hello, a laugh, a twirl or a
// shy blush, one at a time and never the same twice running. While one plays, the
// mascot takes its mood, then goes back to the one it was given. It also says
// hello once it has come on stage (rig/entrance.ts). A jelly wobble, a tickled
// wiggle and a twirl in the air are tried in the playground first.

export const REACTION_KINDS = [
  'hop',
  'wave',
  'laugh',
  'twirl',
  'hello',
  'jiggle',
  'tickle',
  'spinHop',
  'shy',
] as const;

export type ReactionKind = (typeof REACTION_KINDS)[number];

interface Reaction {
  readonly mood: CoachMood;
  readonly seconds: number;
  /** How long its mouth chatters, laughing or saying hi. */
  readonly chatter: number;
  /** How it starts: a hop, a jelly's squash. */
  readonly onset?: Onset;
}

export const REACTIONS: Readonly<Record<ReactionKind, Reaction>> = {
  hop: { mood: 'happy', seconds: 1.1, chatter: 0, onset: { hop: 4 } },
  wave: { mood: 'happy', seconds: 1.9, chatter: 0 },
  laugh: { mood: 'delight', seconds: 1.5, chatter: 1.2, onset: { hop: 2.4 } },
  twirl: { mood: 'happy', seconds: 1.1, chatter: 0 },
  hello: { mood: 'happy', seconds: 2, chatter: 0.7 },
  jiggle: { mood: 'surprise', seconds: 1.1, chatter: 0, onset: { squash: -5, puff: 5 } },
  tickle: { mood: 'happy', seconds: 1.4, chatter: 1.2 },
  spinHop: { mood: 'delight', seconds: 1.2, chatter: 0, onset: { hop: 4.6 } },
  shy: { mood: 'shy', seconds: 2.2, chatter: 0 },
};

// The ones a click picks from.
const KINDS: readonly ReactionKind[] = ['hop', 'wave', 'laugh', 'twirl', 'shy'];
const TWIRL_SECONDS = 0.9;
// A tickle's quick wiggle.
const WIGGLE_RATE = 28;
const WIGGLE_ANGLE = 0.11;
// A shy one's slow twist from side to side.
const TWIST_RATE = 5.5;
const TWIST_ANGLE = 0.2;

/** How it sways while a tickle or a blush plays, in radians. */
export interface Sway {
  /** Sideways, tickled. */
  readonly wiggle: number;
  /** About itself, shy. */
  readonly twist: number;
}

const STILL: Sway = { wiggle: 0, twist: 0 };
const SWAYS: ReadonlySet<ReactionKind> = new Set(['tickle', 'shy']);

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
    if (kind === 'twirl' || kind === 'spinHop') this.#twirlAt = time;
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

  /** The tickle's or the blush's sway, fading in and out over the reaction. */
  sway(time: number): Sway {
    const reaction = this.#playing(time);
    if (!reaction || this.#kind === null || !SWAYS.has(this.#kind)) return STILL;
    const elapsed = time - this.#at;
    const fade = Math.sin(Math.PI * (elapsed / reaction.seconds));
    if (this.#kind === 'tickle')
      return { ...STILL, wiggle: Math.sin(elapsed * WIGGLE_RATE) * WIGGLE_ANGLE * fade };
    return { ...STILL, twist: Math.sin(elapsed * TWIST_RATE) * TWIST_ANGLE * fade };
  }
}
