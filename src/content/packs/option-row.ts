import { createElement, queryAll, setData } from '#shared/dom.ts';
import type { StoredOption } from './stored-option.ts';

// A theme's setting in its panel, a row of options under the list, shown
// while that theme is picked, or a family's, in the family's own view
// (family.ts). Its pill slides (content/ui/tab-bars.ts).

export interface RowOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly tip: string;
}

export interface OptionRowSpec<T extends string> {
  /** The theme the row belongs to; none for a family's, always shown in its view. */
  readonly theme?: string;
  readonly label: string;
  readonly options: readonly RowOption<T>[];
  readonly setting: StoredOption<T>;
}

function markOptions(group: HTMLElement, value: string): void {
  for (const button of queryAll(group, 'button', HTMLElement))
    button.classList.toggle('active', button.dataset.lrExtOption === value);
}

export function optionRow<T extends string>(spec: OptionRowSpec<T>): HTMLElement {
  const row = createElement('div', { className: 'lr-ext-src-option-row' });
  if (spec.theme !== undefined) setData(row, 'lrExtFor', spec.theme);
  const group = createElement('div', {
    className: 'lr-ext-src-options',
    attrs: { role: 'group', 'aria-label': spec.label },
  });
  for (const { value, label, tip } of spec.options) {
    const button = createElement('button', {
      text: label,
      attrs: { type: 'button', 'data-lr-ext-option': value, 'data-lr-ext-tip': tip },
    });
    button.addEventListener('click', () => {
      spec.setting.choose(value);
      markOptions(group, value);
    });
    group.append(button);
  }
  row.append(
    createElement('span', { className: 'lr-ext-src-option-label', text: spec.label }),
    group,
  );
  markOptions(group, spec.setting.read());
  return row;
}

/** Shows the rows of the theme picked, hides the other themes'. */
export function showOptionRows(panel: HTMLElement, current: string): void {
  for (const row of queryAll(panel, '.lr-ext-src-option-row[data-lr-ext-for]', HTMLElement))
    row.hidden = row.dataset.lrExtFor !== current;
}
