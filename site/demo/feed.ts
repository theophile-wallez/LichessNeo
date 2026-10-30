import { animate } from 'motion';
import { queryOne } from '#shared/dom.ts';
import { Typist } from './card.ts';

// The coach's cards as a feed of notifications: it starts full, then each new
// one rises from the bottom and its coach hops onto it, typing its words, the
// ones before slide up to make room, and the oldest leave through the top. It
// plays while the feed is on screen, and holds while the pointer is over it, for
// a card to be read.

const SHOWN = 4;
// The pause once a card's words are typed, and before the first new card.
const READ_MS = 1800;
const FIRST_MS = 900;

const SPRING = { type: 'spring', visualDuration: 0.55, bounce: 0.2 } as const;

export class CardFeed {
  readonly #feed: HTMLElement;
  readonly #cards: readonly (() => HTMLElement | null)[];
  #next = 0;
  #timer = 0;
  #onScreen = false;
  #held = false;
  #due = false;

  /** `cards` draws each card in turn, the feed going round them. */
  constructor(feed: HTMLElement, cards: readonly (() => HTMLElement | null)[]) {
    this.#feed = feed;
    this.#cards = cards;
  }

  /** Fills the feed, then plays it whenever it's on screen. */
  start(): void {
    const feed = this.#feed;
    this.#fill();
    new IntersectionObserver(([entry]) => {
      this.#onScreen = entry?.isIntersecting ?? false;
      // The first new card comes a moment after the feed is first seen.
      if (this.#onScreen && this.#next === SHOWN && this.#timer === 0 && !this.#due)
        this.#wait(FIRST_MS);
      else this.#resume();
    }).observe(feed);
    // A mouse only: a tap leaves no pointer to leave, and would hold the feed for good.
    feed.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') this.#held = true;
    });
    feed.addEventListener('pointerleave', () => {
      this.#held = false;
      this.#resume();
    });
  }

  /** The first cards, their words written out: the feed doesn't start empty. */
  #fill(): void {
    for (let i = 0; i < SHOWN; i++) {
      const card = this.#cards[this.#next]?.() ?? null;
      this.#next += 1;
      if (!card) continue;
      for (const word of card.querySelectorAll('.ln-ext-w--off')) word.className = 'ln-ext-w';
      this.#feed.append(card);
    }
  }

  /** Pushes the next card once the feed may play, else when it next may. */
  #resume(): void {
    if (this.#timer !== 0 || !this.#onScreen || this.#held) return;
    if (this.#due) this.#push();
  }

  #wait(ms: number): void {
    this.#timer = window.setTimeout(() => {
      this.#timer = 0;
      this.#due = true;
      this.#resume();
    }, ms);
  }

  #push(): void {
    // Spent: until the card's words are typed, nothing else pushes one, not even the
    // feed coming back on screen.
    this.#due = false;
    const card = this.#cards[this.#next % this.#cards.length]?.() ?? null;
    if (!card) return;
    this.#next += 1;
    this.#slideUp(() => this.#feed.append(card));
    this.#leave();
    // It rises from behind the card before it, not over it. The flag goes when the
    // next one comes: sliding up stops its rise, which then never resolves.
    for (const other of this.#feed.children)
      if (other instanceof HTMLElement && other !== card) delete other.dataset.entering;
    card.dataset.entering = 'true';
    animate(
      card,
      { opacity: [0, 1], y: [56, 0], scale: [0.94, 1], filter: ['blur(6px)', 'blur(0px)'] },
      SPRING,
    );
    const coach = queryOne(card, '.mini-card__coach', HTMLElement);
    if (coach)
      animate(
        coach,
        { y: ['105%', '0%'] },
        { type: 'spring', visualDuration: 0.5, bounce: 0.35, delay: 0.18 },
      );
    const icon = queryOne(card, '.demo-say__icon', HTMLElement);
    if (icon)
      animate(
        icon,
        { scale: [0.3, 1], rotate: [-25, 0] },
        { type: 'spring', visualDuration: 0.45, bounce: 0.45, delay: 0.25 },
      );
    // Its words come once its coach is on it, and the next card once they're read.
    window.setTimeout(() => {
      new Typist(() => undefined).type(card, () => this.#wait(READ_MS));
    }, 400);
  }

  /** Runs `change`, the cards then sliding from where they were to where it put them. */
  #slideUp(change: () => void): void {
    const cards = [...this.#feed.children].filter(card => card instanceof HTMLElement);
    const before = cards.map(card => card.offsetTop);
    change();
    for (const [i, card] of cards.entries()) {
      const moved = (before[i] ?? 0) - card.offsetTop;
      if (moved !== 0) animate(card, { y: [moved, 0] }, SPRING);
    }
  }

  /** The oldest cards past the ones shown leave through the top. */
  #leave(): void {
    const staying = [...this.#feed.children].filter(
      card => card instanceof HTMLElement && !card.dataset.leaving,
    );
    for (const card of staying.slice(0, Math.max(0, staying.length - SHOWN))) {
      if (!(card instanceof HTMLElement)) continue;
      card.dataset.leaving = 'true';
      animate(
        card,
        { opacity: 0, y: -40, scale: 0.92, filter: 'blur(6px)' },
        { duration: 0.45, ease: [0.4, 0, 1, 1] },
      )
        .then(() => card.remove())
        .catch(() => undefined);
    }
  }
}
