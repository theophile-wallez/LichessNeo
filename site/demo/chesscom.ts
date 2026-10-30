import { animate, type AnimationPlaybackControls } from 'motion';
import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import { closestTo, queryAll, queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { bellPaths } from './bell.ts';
import { flowTo } from './motion/flow.ts';
import { SlidingPill } from './motion/pill.ts';

// The Chess.com tile's converter (index.html's .convert): a Lichess Elo on a
// ruler, for a speed, and what it would be on Chess.com on a ruler of the same
// scale under it, by the extension's own table (#shared/chesscom-rating), the
// one its Experimental setting shows every Elo with. A line joins the two, so
// the gap between the sites shows, and a bell curve over Chess.com's shows how
// the players at that Elo spread there, their middle half shaded deeper.

// Both rulers' scale: every Elo either site gives the slider's range.
const SCALE = 3200;
const TICKS = [500, 1000, 1500, 2000, 2500, 3000];
const PLAIN = { format: { useGrouping: false } } as const;
const SPRING = { type: 'spring', visualDuration: 0.45, bounce: 0.15 } as const;

const at = (elo: number): number => Math.min(1, Math.max(0, elo / SCALE));

class Converter {
  readonly #root: HTMLElement;
  readonly #slider: HTMLInputElement;
  readonly #track: HTMLElement;
  readonly #link: SVGPathElement | null;
  readonly #bell: { whole: SVGPathElement | null; middle: SVGPathElement | null };
  // Chess.com's Elo and half its band as drawn, which spring to each new one.
  #chesscom = 0;
  #spread = 0;
  #springs: AnimationPlaybackControls[] = [];

  constructor(root: HTMLElement, slider: HTMLInputElement, track: HTMLElement) {
    this.#root = root;
    this.#slider = slider;
    this.#track = track;
    this.#link = queryOne(track, '.convert__link path', SVGPathElement);
    this.#bell = {
      whole: queryOne(track, '.convert__bell-whole', SVGPathElement),
      middle: queryOne(track, '.convert__bell-middle', SVGPathElement),
    };
    const ticks = html`${TICKS.map(tick => html`<i class="convert__tick" style="--at:${at(tick)}"></i>`)}`;
    for (const ruler of queryAll(track, '.convert__ticks', HTMLElement)) setHtml(ruler, ticks);
    const axis = queryOne(root, '.convert__axis', HTMLElement);
    if (axis)
      setHtml(
        axis,
        html`${TICKS.map(tick => html`<span style="--at:${at(tick)}">${tick}</span>`)}`,
      );
    // Where the slider's own ends fall on the ruler.
    track.style.setProperty('--from', String(at(Number(slider.min))));
    track.style.setProperty('--to', String(at(Number(slider.max))));
  }

  show(speed: string): void {
    const lichess = Number(this.#slider.value);
    const converted = chesscomRating(speed, lichess);
    this.#figure('lichess', lichess);
    this.#track.style.setProperty('--lichess', String(at(lichess)));
    if (!converted) return;
    this.#figure('chesscom', converted.rating);
    this.#figure('low', converted.rating - converted.spread);
    this.#figure('high', converted.rating + converted.spread);
    const first = this.#chesscom === 0;
    for (const spring of this.#springs) spring.stop();
    if (first) {
      this.#chesscom = converted.rating;
      this.#spread = converted.spread;
      this.#draw();
      return;
    }
    this.#springs = [
      animate(this.#chesscom, converted.rating, {
        ...SPRING,
        onUpdate: value => {
          this.#chesscom = value;
          this.#draw();
        },
      }),
      animate(this.#spread, converted.spread, {
        ...SPRING,
        onUpdate: value => {
          this.#spread = value;
          this.#draw();
        },
      }),
    ];
  }

  #figure(name: string, value: number): void {
    const figure = queryOne(this.#root, `[data-convert=${name}]`, HTMLElement);
    if (figure) flowTo(figure, Math.max(0, Math.round(value)), PLAIN);
  }

  /** Chess.com's dot, its bell curve and the line to it from the Lichess Elo. */
  #draw(): void {
    const chesscom = at(this.#chesscom);
    this.#track.style.setProperty('--chesscom', chesscom.toFixed(4));
    const bell = bellPaths({
      rating: this.#chesscom,
      spread: this.#spread,
      scale: SCALE,
      height: 24,
    });
    this.#bell.whole?.setAttribute('d', bell.whole);
    this.#bell.middle?.setAttribute('d', bell.middle);
    const from = Number(this.#slider.value) / SCALE;
    // From the middle of the top ruler (convert.css: 28px down a 140px track) to the
    // top of Chess.com's bar (4px down the bottom ruler, at 84px).
    const [top, bottom] = [20, ((84 + 4) / 140) * 100];
    const middle = (top + bottom) / 2;
    this.#link?.setAttribute(
      'd',
      `M${from * 100} ${top} C${from * 100} ${middle} ${chesscom * 100} ${middle} ${chesscom * 100} ${bottom}`,
    );
  }
}

export function startConverter(): void {
  const root = queryOne(document, '.convert', HTMLElement);
  const slider = root && queryOne(root, 'input[type=range]', HTMLInputElement);
  const track = root && queryOne(root, '.convert__track', HTMLElement);
  if (!root || !slider || !track) return;
  const converter = new Converter(root, slider, track);
  const speeds = queryOne(root, '.convert__speeds', HTMLElement);
  const pill = speeds && new SlidingPill(speeds, '[aria-pressed=true]');
  const speed = (): string =>
    queryOne(root, '[data-speed][aria-pressed=true]', HTMLElement)?.dataset.speed ?? 'blitz';
  slider.addEventListener('input', () => converter.show(speed()));
  root.addEventListener('click', event => {
    const picked = closestTo(event.target, '[data-speed]', HTMLElement);
    if (!picked) return;
    for (const button of queryAll(root, '[data-speed]', HTMLElement))
      button.setAttribute('aria-pressed', String(button === picked));
    pill?.follow();
    converter.show(speed());
  });
  converter.show(speed());
}
