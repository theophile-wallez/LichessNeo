import { closestTo, queryOne, setData } from '#shared/dom.ts';

// The setup dialog eases to its new height as a pick inside it switches its panel,
// or makes Lichess redraw a part of it: CSS can't transition a height its content
// sets. While it eases, it clips (styles/pages/setup-panels.css). As the dialog
// opens and closes, Lichess redraws it too: those changes don't ease.

const EASING = { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
/** How long after a pick its redraws may come. */
const PICK_MS = 400;
let pickedAt = -Infinity;
let listening = false;

const heights = new WeakMap<HTMLDialogElement, number>();
const easings = new WeakMap<HTMLDialogElement, Animation>();
const resizes = new ResizeObserver(entries => {
  for (const entry of entries) {
    const dialog = entry.target.closest('dialog');
    if (dialog) ease(dialog);
  }
});
let observed: HTMLElement | null = null;

function ease(dialog: HTMLDialogElement): void {
  const running = easings.get(dialog);
  // From where it is, if it's still on its way to the last one.
  const from = running ? dialog.getBoundingClientRect().height : heights.get(dialog);
  running?.cancel();
  const to = dialog.getBoundingClientRect().height;
  heights.set(dialog, to);
  const picked = performance.now() - pickedAt < PICK_MS;
  if (from === undefined || !picked || !dialog.open || Math.abs(from - to) < 1) return;
  setData(dialog, 'lrExtEasing', '');
  const easing = dialog.animate([{ height: `${from}px` }, { height: `${to}px` }], EASING);
  easings.set(dialog, easing);
  easing.addEventListener('finish', () => {
    easings.delete(dialog);
    setData(dialog, 'lrExtEasing', null);
  });
}

function notePick(event: Event): void {
  if (closestTo(event.target, 'dialog .game-setup > .setup-content', HTMLElement))
    pickedAt = performance.now();
}

/** Watches the open setup's height, the first one it has aside. */
export function syncHeight(): void {
  if (!listening) {
    listening = true;
    for (const type of ['pointerdown', 'keydown']) {
      document.addEventListener(type, notePick, { capture: true, passive: true });
    }
  }
  const setup = queryOne(document, 'dialog .game-setup', HTMLElement);
  if (setup === observed) return;
  if (observed) resizes.unobserve(observed);
  observed = setup;
  if (setup) resizes.observe(setup);
}
