import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rule (ui/round/css/_buttons.scss): its follow-up buttons as blocks.
const LICHESS_RULE = '.rcontrols .follow-up .fbt { display: block; }';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

it('leaves out a Rematch Lichess disables', () => {
  const style = document.createElement('style');
  style.textContent = LICHESS_RULE + readFileSync(join(import.meta.dirname, 'rematch.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML =
    '<main class="round"><div class="rcontrols"><div class="follow-up">' +
    '<button class="fbt rematch white" disabled><span>Rematch</span></button></div></div></main>';
  const rematch = queryOne(document, '.rematch', HTMLButtonElement);
  if (!rematch) throw new Error('no rematch');
  expect(getComputedStyle(rematch).display).toBe('none');
  rematch.disabled = false;
  expect(getComputedStyle(rematch).display).toBe('block');
});
