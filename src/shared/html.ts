// A tagged template for markup built as text: every interpolated value is
// escaped unless it is itself `html` output, so templates can nest safely.

import { escapeHtml } from './escape.ts';

export { escapeHtml };

// The private field makes the type nominal, and only its type is exported:
// `html` and `trustedHtml` are the only ways to make one.
class SafeHtml {
  readonly #markup: string;

  constructor(markup: string) {
    this.#markup = markup;
  }

  get value(): string {
    return this.#markup;
  }

  toString(): string {
    return this.#markup;
  }
}

export type { SafeHtml };

export type HtmlValue =
  | SafeHtml
  | string
  | number
  | false
  | null
  | undefined
  | readonly HtmlValue[];

function render(value: HtmlValue): string {
  if (value instanceof SafeHtml) return value.value;
  if (typeof value === 'string') return escapeHtml(value);
  if (typeof value === 'number') return String(value);
  if (value === false || value === null || value === undefined) return '';
  return value.map(render).join('');
}

export function html(strings: TemplateStringsArray, ...values: readonly HtmlValue[]): SafeHtml {
  let out = strings[0] ?? '';
  for (const [i, value] of values.entries()) out += render(value) + (strings[i + 1] ?? '');
  return new SafeHtml(out);
}

/** Markup that is known to be safe: a constant, never user or page data. */
export const trustedHtml = (markup: string): SafeHtml => new SafeHtml(markup);

export function setHtml(element: Element, markup: SafeHtml): void {
  element.innerHTML = markup.value;
}
