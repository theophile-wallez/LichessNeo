import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { boardTools, syncBoardTools } from './board-tools.ts';

// An analysis page as Lichess serves it, its menu button acting as Lichess's
// controls do: on a pointer's press and release, not on a click.
const ANALYSIS =
  '<main class="analyse"><div class="analyse__board main-board"><div class="cg-wrap"></div></div>' +
  '<div class="analyse__tools"><div class="analyse__moves"></div></div>' +
  '<div class="analyse__controls"><button class="fbt" title="Menu" data-act="menu"></button></div></main>';
const BROADCAST =
  '<main class="analyse is-relay has-relay-tour"><div class="relay-tour"></div></main>';
const MENU = '<div class="action-menu sub-box"><div class="inner"></div></div>';

const main = (): HTMLElement | null => queryOne(document, 'main.analyse', HTMLElement);
const button = (name: string): HTMLButtonElement | null =>
  queryOne(document, `.ln-ext-board-tools__btn--${name}`, HTMLButtonElement);
const lichessMenu = (): HTMLElement | null =>
  queryOne(document, '.analyse__controls > .fbt[data-act="menu"]', HTMLElement);
const menuOpen = (): boolean => document.querySelector('.action-menu') !== null;

function fakeLichess(): void {
  let pressed = false;
  const controls = document.querySelector('.analyse__controls');
  controls?.addEventListener('pointerdown', () => (pressed = true));
  controls?.addEventListener('pointerup', () => {
    if (!pressed) return;
    pressed = false;
    const tools = document.querySelector('.analyse__tools');
    const menu = document.querySelector('.action-menu');
    if (menu) menu.remove();
    else tools?.insertAdjacentHTML('beforeend', MENU);
    lichessMenu()?.classList.toggle('active', !menu);
  });
}

const press = (target: Element | null | undefined): void => {
  target?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
};

beforeAll(() => boardTools.start());

beforeEach(() => {
  document.body.innerHTML = ANALYSIS;
  fakeLichess();
  syncBoardTools();
});

afterEach(() => {
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtFlipLabel;
});

describe('board tools on an analysis page', () => {
  it('add a cog, named as Lichess’s menu, and a flip button, but no Zen', () => {
    document.documentElement.dataset.lnExtFlipLabel = 'Flip board';
    syncBoardTools();
    expect(button('menu')?.getAttribute('aria-label')).toBe('Menu');
    expect(button('flip')?.getAttribute('aria-label')).toBe('Flip board');
    expect(button('zen')).toBeNull();
  });

  it('stay off a broadcast’s page, which has no board', () => {
    document.body.innerHTML = BROADCAST;
    syncBoardTools();
    expect(document.querySelector('.ln-ext-board-tools')).toBeNull();
  });

  it('open Lichess’s menu from the cog, lit while it shows', () => {
    button('menu')?.click();
    expect(menuOpen()).toBe(true);
    expect(main()?.dataset.lnExtMenuFrom).toBe('board');
    syncBoardTools();
    expect(button('menu')?.classList.contains('ln-ext-board-tools__btn--on')).toBe(true);
    button('menu')?.click();
    expect(menuOpen()).toBe(false);
  });

  it('mark the controls’ cog as the opener when it is pressed', () => {
    press(lichessMenu());
    expect(main()?.dataset.lnExtMenuFrom).toBe('controls');
  });

  it('close the menu on a press elsewhere, or Escape', () => {
    button('menu')?.click();
    press(document.querySelector('.analyse__moves'));
    expect(menuOpen()).toBe(false);
    button('menu')?.click();
    press(document.querySelector('.action-menu'));
    expect(menuOpen()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menuOpen()).toBe(false);
  });

  it('leave the menu open under a dialog it opened', () => {
    button('menu')?.click();
    document.body.insertAdjacentHTML('beforeend', '<dialog open><a href="#ai">Play</a></dialog>');
    press(document.querySelector('dialog a'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menuOpen()).toBe(true);
  });

  it('hide the cog where Lichess has no menu button', () => {
    lichessMenu()?.remove();
    syncBoardTools();
    expect(button('menu')?.hidden).toBe(true);
  });
});
