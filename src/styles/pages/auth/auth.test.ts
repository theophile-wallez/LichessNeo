import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const readSheet = (relativePath: string): string =>
  readFileSync(join(import.meta.dirname, relativePath), 'utf8').replaceAll(/\s+/gu, ' ');

// Lichess's auth rules we must beat: desktop hides the brand tile, .auth is 40em wide,
// .box__top is a flex row whose h1 stays left-aligned.
const LICHESS =
  ':root { --ln-ext-bg-panel: rgb(28, 28, 32); --ln-ext-bg-panel-dark: rgb(18, 18, 22); }' +
  ' .box { background: rgb(22, 21, 18); overflow: hidden; }' +
  ' .box__top { display: flex; justify-content: space-between; }' +
  ' .auth { width: 40em; }' +
  ' .auth__brand { display: none; }';

function render(markup: string, width = 1366): void {
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = [
    LICHESS,
    readSheet('../../forms/card.css'),
    readSheet('../page-boxes.css'),
    readSheet('./card.css'),
    readSheet('./form.css'),
    readSheet('./sisters.css'),
  ].join('\n');
  document.head.append(style);
  document.body.innerHTML = markup;
}

function styleOf(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

afterEach(() => {
  Reflect.set(window, 'innerWidth', 1366);
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

const LOGIN =
  '<main class="auth auth-login box box-pad">' +
  '<div class="auth__brand"><span class="auth__brand__logo"></span><span class="auth__brand__name">lichess.org</span></div>' +
  '<div class="auth-tabs" data-ln-ext-tabs="pill"><a class="active" href="/login">Sign in</a><a href="/signup">Register</a></div>' +
  '<form class="form3"><div class="form-group"><input class="form-control" type="text"></div></form>' +
  '</main>';

describe('auth pages', () => {
  it('draws a single 440px card over Lichess’s box and hides no brand tile on desktop', () => {
    render(LOGIN, 1366);
    expect(styleOf('main.auth').maxWidth).toBe('440px');
    expect(styleOf('main.auth').backgroundColor).toBe('rgb(28, 28, 32)');
    expect(styleOf('.auth__brand').display).toBe('flex');
  });

  it('excludes auth and oauth pages from the generic nested form3 card rule', () => {
    const formCardCss = readSheet('../../forms/card.css');
    const rule = formCardCss.match(/main:not\([^)]+\)/u)?.[0];
    expect(rule).toContain('.auth');
    expect(rule).toContain('.oauth');
  });

  it('centers sister page headings inside .box__top', () => {
    render(
      '<main class="auth auth-signup box box-pad"><div class="box__top"><h1>Password reset</h1></div><form class="form3"></form></main>',
    );
    expect(styleOf('main.auth > .box__top').display).toBe('block');
    expect(styleOf('main.auth > .box__top h1').width).toBe('100%');
  });

  it('gives email-confirm extra width for its troubleshooting list', () => {
    render(
      '<main class="email-confirm box box-pad"><div class="box__top"><h1>Check</h1></div></main>',
    );
    expect(styleOf('main.email-confirm').maxWidth).toBe('560px');
  });
});
