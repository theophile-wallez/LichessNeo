import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import { closestTo, queryAll, queryOne } from '#shared/dom.ts';

// The Chess.com tile's converter (index.html's .convert): a Lichess rating
// on a slider, for a speed, and what it would be on Chess.com, by the
// extension's own table (#shared/chesscom-rating), the one its Experimental
// setting shows every rating with.

const format = new Intl.NumberFormat('en');

function show(root: HTMLElement): void {
  const slider = queryOne(root, 'input[type=range]', HTMLInputElement);
  const speed = queryOne(root, '[data-speed][aria-pressed=true]', HTMLElement)?.dataset.speed;
  if (!slider || !speed) return;
  const lichess = Number(slider.value);
  const converted = chesscomRating(speed, lichess);
  const write = (selector: string, text: string): void => {
    const element = queryOne(root, selector, HTMLElement);
    if (element) element.textContent = text;
  };
  write('[data-convert=lichess]', format.format(lichess));
  write('[data-convert=chesscom]', converted ? format.format(converted.rating) : '—');
  write('[data-convert=spread]', converted ? `± ${format.format(converted.spread)}` : '');
  // The slider's filled part, for its track's gradient.
  const share = (lichess - Number(slider.min)) / (Number(slider.max) - Number(slider.min));
  slider.style.setProperty('--share', `${(share * 100).toFixed(1)}%`);
}

export function startConverter(): void {
  const root = queryOne(document, '.convert', HTMLElement);
  if (!root) return;
  root.addEventListener('input', () => show(root));
  root.addEventListener('click', event => {
    const speed = closestTo(event.target, '[data-speed]', HTMLElement);
    if (!speed) return;
    for (const button of queryAll(root, '[data-speed]', HTMLElement))
      button.setAttribute('aria-pressed', String(button === speed));
    show(root);
  });
  show(root);
}
