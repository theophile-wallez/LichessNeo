import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { buildAside } from './aside.ts';
import { buildColorSwitch } from './color-switch.ts';
import { buildParts } from './parts.ts';
import { render } from './render.ts';

// The simul form (/simul/new, styles/simul/form.css): its sections as cards, the host's
// color as buttons, and beside it the simul's card as the list will show it, kept up to
// date as the form changes. Lichess renders the form on the server, so it's built once.

let built: HTMLFormElement | null = null;

function build(form: HTMLFormElement, main: HTMLElement): void {
  built = form;
  buildParts(form);
  buildColorSwitch(form);
  const aside = buildAside(form);
  main.append(aside);
  const update = (): void => render(form, aside);
  // flatpickr posts a change on its hidden field as a date is picked.
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

export function syncSimulForm(): void {
  const main = queryOne(document, 'main.simul-form', HTMLElement);
  const form = main && queryOne(main, ':scope > form.form3', HTMLFormElement);
  if (main && form && form !== built) build(form, main);
}

export const simulForm: Feature = {
  name: 'simul form',
  start: () => onEveryTick('simul form', syncSimulForm),
};
