import { queryOne, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { createSizeWatch } from './size-watch.ts';

// The right-hand panel stacks the moves, the controls and the chat in fixed
// grid rows (styles/game/layout.css, styles/analysis/layout.css), so the
// controls' row needs a definite height: `--ln-ext-controls-h`.

interface Panel {
  readonly main: HTMLElement;
  readonly controls: Element | null;
}

function findPanel(): Panel | null {
  const main = queryOne(document, 'main.round, main.analyse', HTMLElement);
  return main ? { main, controls: main.querySelector('.rcontrols, .analyse__controls') } : null;
}

function setHeight({ main, controls }: Panel): void {
  const height = controls ? Math.ceil(controls.getBoundingClientRect().height) : 0;
  setStyleProperty(main, '--ln-ext-controls-h', `${height}px`);
}

export function syncControlsHeight(): void {
  const panel = findPanel();
  if (panel) setHeight(panel);
}

export const controlsHeight: Feature = {
  name: 'controls height',
  start: () => {
    const watch = createSizeWatch();
    onEveryTick('controls height', () => {
      const panel = findPanel();
      if (!panel) return;
      const watched = panel.controls ? [panel.main, panel.controls] : [panel.main];
      if (watch.changed(watched)) setHeight(panel);
    });
  },
};
