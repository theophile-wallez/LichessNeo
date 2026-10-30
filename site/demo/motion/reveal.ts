import { animate, stagger } from 'motion';
import { queryAll } from '#shared/dom.ts';

// A look picked spreads over the page from its button, a circle growing from
// there over the page as it was (a view transition), and the layout's pieces
// hop as their board changes under them.

const CIRCLE_MS = 750;

/** Runs `change`, the page after it revealed in a circle from `from`'s middle; done once
    the circle has grown. */
export function revealFrom(from: Element, change: () => void): Promise<void> {
  if (typeof document.startViewTransition !== 'function') {
    change();
    return Promise.resolve();
  }
  const box = from.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(change);
  transition.ready
    .then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: CIRCLE_MS,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      ),
    )
    .catch(() => undefined);
  return transition.finished.catch(() => undefined);
}

// A piece's place in the wave: its file, plus its rank counted from White's side.
const wave = (piece: HTMLElement): number =>
  Number(piece.style.getPropertyValue('--x')) + 7 - Number(piece.style.getPropertyValue('--y'));

/** The layout's pieces hop, in a wave from a1 to h8. */
export function hopPieces(board: Element): void {
  const pieces = queryAll(board, '.mock-piece', HTMLElement);
  const ordered = pieces.toSorted((one, other) => wave(one) - wave(other));
  animate(
    ordered,
    { y: ['0%', '-22%', '0%'], scaleY: [1, 1.05, 0.94, 1] },
    { duration: 0.45, ease: 'easeInOut', delay: stagger(0.018, { startDelay: 0.15 }) },
  );
}
