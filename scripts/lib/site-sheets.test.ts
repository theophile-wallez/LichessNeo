import { describe, expect, it } from 'vitest';
import { JOINED_SHEET, joinSheetLinks } from './site-sheets.ts';

const PAGE = `<head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="css/base.css" />
    <link rel="stylesheet" href="css/nav.css" />
    <link rel="stylesheet" href="css/hero.css" />
    <link rel="icon" href="img/icon.png" />
  </head>`;

describe('joinSheetLinks', () => {
  it('lists the sheets in the page’s order', () => {
    expect(joinSheetLinks(PAGE).sheets).toEqual(['css/base.css', 'css/nav.css', 'css/hero.css']);
  });

  it('links the joined sheet once, where the first one was, and nothing else', () => {
    expect(joinSheetLinks(PAGE).page).toBe(`<head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="${JOINED_SHEET}" />
    <link rel="icon" href="img/icon.png" />
  </head>`);
  });

  it('leaves a page with no sheet as it is', () => {
    const page = '<head><title>Lichess Neo</title></head>';
    expect(joinSheetLinks(page)).toEqual({ sheets: [], page });
  });
});
