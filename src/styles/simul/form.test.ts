import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { SIMUL_FORM } from '#shared/testing/simul-form.ts';

// Lichess's own rule (simul.form.css): half the width, for the word beside the field.
const LICHESS_RULE = '.simul-form #form3-name { width: 48% !important; }';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the simul form’s name', () => {
  it('takes the field’s whole width, the word drawn inside it', () => {
    const style = document.createElement('style');
    style.textContent = LICHESS_RULE + readFileSync(join(import.meta.dirname, 'form.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML = SIMUL_FORM;
    const field = queryOne(document, '#form3-name', HTMLInputElement);
    if (!field?.parentElement) throw new Error('no field');
    // content/simul-form marks the field's box with the word.
    field.parentElement.dataset['lnExtSuffix'] = 'Simul';
    expect(getComputedStyle(field).width).toBe('100%');
  });
});
