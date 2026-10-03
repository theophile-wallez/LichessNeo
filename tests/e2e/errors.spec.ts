import { expect, test } from './fixtures.ts';
import { evaluateInContentScript } from './support/content-world.ts';
import { isFromExtension } from './support/errors.ts';
import { openLichess } from './support/lichess.ts';

// Every test fails on an error from the extension's scripts (fixtures.ts).
// A watch never seen catching anything proves nothing, so here it catches some.

test('the error watch catches what the content script throws and logs', async ({
  page,
  extensionErrors,
}) => {
  await openLichess(page, '/');
  expect(extensionErrors).toEqual([]);
  await evaluateInContentScript(
    page,
    `console.error('[LichessReimagined] a logged witness');
     setTimeout(() => { throw new Error('[LichessReimagined] a thrown witness'); });`,
  );
  await expect
    .poll(() => extensionErrors.map(({ kind }) => kind).toSorted())
    .toEqual(['console', 'exception']);
  // These were expected: they mustn't fail the fixture's own check.
  extensionErrors.splice(0);
});

test('an error is the extension’s by its prefix or its script’s URL, not Lichess’s', () => {
  expect(isFromExtension('[LichessReimagined] game analysis failed')).toBe(true);
  expect(isFromExtension('TypeError: x\n    at chrome-extension://abc/content.js:1:2')).toBe(true);
  expect(
    isFromExtension('Failed to load resource: the server responded with a status of 404'),
  ).toBe(false);
});
