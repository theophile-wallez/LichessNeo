import { afterEach, describe, expect, it } from 'vitest';
import { keepCopyFieldsUnsaved } from './copy-fields.ts';

// A finished game's underboard, as Lichess serves it, under the header's search box.
const PAGE = `
  <div id="clinput"><input spellcheck="false" autocomplete="false" aria-label="Search" /></div>
  <div class="fen-pgn">
    <div class="copy-me"><input spellcheck="false" readonly value="" class="copy-me__target" /></div>
    <div class="copy-me">
      <input spellcheck="false" readonly value="https://lichess.org/yks0vLbn" class="copy-me__target" />
    </div>
  </div>
  <textarea class="mchat__say"></textarea>`;

afterEach(() => {
  document.body.replaceChildren();
});

describe("Lichess's copy fields", () => {
  it('are kept out of the values Chrome refills when the page is visited again', () => {
    document.body.innerHTML = PAGE;
    keepCopyFieldsUnsaved();
    const fields = [...document.querySelectorAll('.copy-me__target')];
    expect(fields.map(field => field.getAttribute('autocomplete'))).toEqual(['off', 'off']);
  });

  it("leave Lichess's other fields alone", () => {
    document.body.innerHTML = PAGE;
    keepCopyFieldsUnsaved();
    expect(document.querySelector('#clinput input')?.getAttribute('autocomplete')).toBe('false');
    expect(document.querySelector('.mchat__say')?.hasAttribute('autocomplete')).toBe(false);
  });
});
