import { queryOne } from '#shared/dom.ts';
import { syncColorSwitch } from './color-switch.ts';
import { readForm } from './read.ts';
import { summarize } from './summary.ts';
import type { SummaryRow } from './aside.ts';

// Writes what the form holds into what we added: only what changed, as it runs on
// every edit.

const CLASS = 'ln-ext-simul-form';

function writeText(root: ParentNode, selector: string, text: string): void {
  const element = queryOne(root, selector, HTMLElement);
  if (element && element.textContent !== text) element.textContent = text;
}

function writeRow(aside: HTMLElement, row: SummaryRow, text: string): void {
  const line = queryOne(aside, `[data-ln-ext-row='${row}']`, HTMLElement);
  if (!line) return;
  writeText(line, 'dd', text);
  if (line.hidden !== !text) line.hidden = !text;
}

export function render(form: HTMLFormElement, aside: HTMLElement): void {
  const state = readForm(form);
  const summary = summarize(state);
  syncColorSwitch(form, state.color);
  writeText(form, `.${CLASS}__chip`, summary.timeControl);
  writeText(form, `.${CLASS}__host-time`, summary.hostTime);
  writeText(form, `.${CLASS}__host-note`, summary.hostNote);
  writeText(form, `.${CLASS}__host-others`, summary.others);
  writeText(aside, `.${CLASS}__card-name`, summary.cardName);
  writeText(aside, `.${CLASS}__card-meta`, summary.cardMeta);
  writeRow(aside, 'color', state.colorText);
  writeRow(aside, 'clock', summary.hostClock);
  writeRow(aside, 'entry', summary.entry);
  writeRow(aside, 'start', state.start);
}
