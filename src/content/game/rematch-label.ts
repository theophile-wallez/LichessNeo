import { queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Our offer, waiting, says "Rematch" beside its spinner where it fits (styles/game/rematch.css):
// Lichess leaves only the spinner and a title, "Rematch offer sent", which runs to three lines in
// French and stays the button's tooltip. The word is Lichess's, which page/labels copies onto
// <html>.

export function syncRematchLabel(): void {
  const rematch = queryOne(document, 'main.round .rcontrols .follow-up .rematch', HTMLElement);
  if (!rematch) return;
  setData(rematch, 'lnExtLabel', document.documentElement.dataset.lnExtRematchLabel ?? null);
}

export const rematchLabel: Feature = {
  name: 'rematch label',
  start: () => onEveryTick('rematch label', syncRematchLabel),
};
