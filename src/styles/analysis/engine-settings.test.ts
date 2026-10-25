import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own (ui/lib/css/ceval/_settings.scss): the settings in the panel's flow,
// pushing the engine's lines down.
const LICHESS_RULE = '#ceval-settings { position: relative; display: flex; }';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the engine settings', () => {
  it.each(['main class="analyse"', 'main class="puzzle"', 'div class="board-editor"'])(
    'float over the page, out of the panel’s flow, in <%s>',
    parent => {
      const style = document.createElement('style');
      style.textContent =
        LICHESS_RULE + readFileSync(join(import.meta.dirname, 'engine-settings.css'), 'utf8');
      document.head.append(style);
      const tag = parent.split(' ')[0] ?? 'main';
      document.body.innerHTML =
        `<${parent}><div class="ceval"><button class="settings-gear"></button></div>` +
        `<div id="ceval-settings-anchor"><div id="ceval-settings"></div></div></${tag}>`;
      const settings = queryOne(document, '#ceval-settings', HTMLElement);
      if (!settings) throw new Error('no settings');
      expect(getComputedStyle(settings).position).toBe('fixed');
      expect(Number(getComputedStyle(settings).zIndex)).toBeGreaterThan(100);
    },
  );
});
