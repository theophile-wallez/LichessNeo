import { animate, inView, type AnimationPlaybackControls } from 'motion';
import { closestTo, queryAll, queryOne } from '#shared/dom.ts';
import { SlidingPill } from './motion/pill.ts';

// Every page, before and after (index.html's .compare): the page picked, as
// Lichess draws it and with the extension, split by a line the visitor drags.
// The line sways once as the window comes into view, to show it moves.

// Where each page's pictures were taken, shown in the window's address bar.
const PATHS: Readonly<Record<string, string>> = {
  home: '/',
  game: '/game/wVVrXxBX',
  puzzle: '/training/UQyjd',
  profile: '/@/DrNykterstein',
};

// How near an edge the line hides that side's label, in percent.
const LABEL_ROOM = 14;

const shotUrl = (page: string, side: string): string => `compare/${page}-${side}.webp`;

/** Both pictures of `page`, loaded and decoded, so the swap shows no blank frame. */
async function load(page: string): Promise<void> {
  await Promise.all(
    ['lichess', 'neo'].map(side => {
      const picture = new Image();
      picture.src = shotUrl(page, side);
      return picture.decode();
    }),
  );
}

class Compare {
  readonly #view: HTMLElement;
  readonly #range: HTMLInputElement;
  // The page last picked: a slower page's pictures, loaded after it, don't replace its own.
  #page = 'home';
  #sway: AnimationPlaybackControls | null = null;

  constructor(view: HTMLElement, range: HTMLInputElement) {
    this.#view = view;
    this.#range = range;
  }

  start(): void {
    this.#range.addEventListener('input', () => {
      this.#sway?.stop();
      this.#split(Number(this.#range.value));
    });
    inView(this.#view, () => this.#swayOnce(), { amount: 0.6 });
  }

  /** Shows `page`'s pictures, once both are ready. */
  async show(page: string): Promise<void> {
    this.#page = page;
    await load(page);
    if (this.#page !== page) return;
    for (const shot of queryAll(this.#view, '[data-shot]', HTMLImageElement)) {
      this.#fadeOut(shot);
      shot.src = shotUrl(page, shot.dataset.shot ?? 'neo');
    }
  }

  /** A copy of `shot` as it is, over the new picture, fading out. */
  #fadeOut(shot: HTMLImageElement): void {
    const copy = shot.cloneNode();
    if (!(copy instanceof HTMLImageElement)) return;
    delete copy.dataset.shot;
    copy.loading = 'eager';
    this.#range.before(copy);
    animate(copy, { opacity: [1, 0] }, { duration: 0.4, ease: 'easeOut' })
      .then(() => copy.remove())
      .catch(() => undefined);
  }

  #split(percent: number): void {
    this.#view.style.setProperty('--split', `${percent}%`);
    this.#range.value = String(percent);
    let near = '';
    if (percent < LABEL_ROOM) near = 'start';
    else if (percent > 100 - LABEL_ROOM) near = 'end';
    if (this.#view.dataset.near !== near) this.#view.dataset.near = near;
  }

  #swayOnce(): void {
    if (this.#sway) return;
    this.#sway = animate(50, [50, 30, 68, 50], {
      duration: 2.2,
      ease: 'easeInOut',
      delay: 0.3,
      onUpdate: percent => this.#split(percent),
    });
  }
}

export function startCompare(): void {
  const view = queryOne(document, '.compare__view', HTMLElement);
  const range = view && queryOne(view, '.compare__range', HTMLInputElement);
  const tabs = queryOne(document, '.compare-tabs', HTMLElement);
  const path = queryOne(document, '[data-compare-path]', HTMLElement);
  if (!view || !range || !tabs) return;
  const compare = new Compare(view, range);
  compare.start();
  const pill = new SlidingPill(tabs, '[aria-selected=true]');
  tabs.addEventListener('click', event => {
    const tab = closestTo(event.target, '[data-page]', HTMLElement);
    const page = tab?.dataset.page;
    if (!tab || !page || tab.getAttribute('aria-selected') === 'true') return;
    for (const other of queryAll(tabs, '[data-page]', HTMLElement))
      other.setAttribute('aria-selected', String(other === tab));
    pill.follow();
    if (path) path.textContent = PATHS[page] ?? '/';
    compare.show(page).catch(() => undefined);
  });
}
