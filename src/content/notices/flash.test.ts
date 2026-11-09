import { afterEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { createFlashSync, flashToast } from './flash.ts';
import { Toaster } from './toaster.ts';

// Lichess's flashes, as its pages serve them.
const flash = (kind: string, content: string): string =>
  `<div class="flash flash-${kind}"><div class="flash__content">${content}</div></div>`;

const element = (markup: string): Element => {
  document.body.innerHTML = markup;
  const found = queryOne(document, '.flash', HTMLElement);
  if (!found) throw new Error('no flash');
  return found;
};

const titles = (): string[] =>
  queryAll(document, '.ln-ext-toast__title', HTMLElement).map(title => title.textContent);

afterEach(() => {
  document.body.replaceChildren();
});

describe('flashToast', () => {
  it('says what a success did, when its form told it', () => {
    const success = element(flash('success', '\n  Success\n'));
    expect(flashToast(success)?.title).toBe('Success');
    expect(flashToast(success, 'You joined the team')).toMatchObject({
      kind: 'success',
      title: 'You joined the team',
    });
  });

  it('keeps a failure’s own words', () => {
    const failure = element(flash('failure', 'Too many requests'));
    expect(flashToast(failure, 'You joined the team')).toMatchObject({
      kind: 'error',
      title: 'Too many requests',
    });
  });

  it('leaves in the page a flash with a link, and a warning', () => {
    expect(flashToast(element(flash('success', 'Add a <a href="/x">description</a>')))).toBeNull();
    expect(flashToast(element(flash('warning', 'Read this')))).toBeNull();
  });
});

describe('createFlashSync', () => {
  it('gives the expected words to the page’s first success only, once each', () => {
    document.body.innerHTML = flash('success', 'Success');
    const sync = createFlashSync(new Toaster('Close'), 'You left the team');
    sync();
    document.body.insertAdjacentHTML('afterbegin', flash('success', 'Success'));
    sync();
    expect(titles().toSorted()).toEqual(['Success', 'You left the team']);
    expect(queryAll(document, '.flash[data-ln-ext-toasted]', HTMLElement)).toHaveLength(2);
  });
});
