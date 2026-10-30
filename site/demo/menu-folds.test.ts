import { beforeAll, describe, expect, it } from 'vitest';
import { html, setHtml } from '#shared/html.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { sectionsMarkup } from './menu.ts';
import { showLayout, startMenus } from './menu-folds.ts';

function mockIn(shape: string): HTMLElement {
  const mock = document.createElement('div');
  mock.className = 'mock';
  mock.dataset.shape = shape;
  document.body.append(mock);
  setHtml(
    mock,
    html`<nav class="menu"><button type="button" class="menu-toggle"></button>${sectionsMarkup({ section: 'Tools', page: 'Analysis board' })}</nav>`,
  );
  return mock;
}

const section = (mock: HTMLElement, name: string): HTMLElement | null =>
  queryAll(mock, '.menu-section', HTMLElement).find(
    each => queryOne(each, '.menu-pages', HTMLElement)?.dataset.label === name,
  ) ?? null;

const link = (mock: HTMLElement, name: string): HTMLButtonElement | undefined =>
  queryAll(mock, '.menu-link', HTMLButtonElement).find(each => each.textContent === name);

const click = (element: Element | null | undefined): void => {
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

beforeAll(() => {
  document.body.replaceChildren();
  startMenus();
});

describe('the little Lichess’s menu', () => {
  it('folds a section of the unfolded sidebar open, the page’s own until then', () => {
    const mock = mockIn('unfolded');
    click(link(mock, 'Play'));
    expect(section(mock, 'Play')?.dataset.open).toBe('open');
    expect(section(mock, 'Tools')?.dataset.open).toBe('open');
    expect(section(mock, 'Learn')?.dataset.open).toBe('shut');
    click(link(mock, 'Tools'));
    expect(section(mock, 'Tools')?.dataset.open).toBe('shut');
    expect(mock.dataset.folding).toBe('');
  });

  it('folds no section where its pages fly out', () => {
    const mock = mockIn('sidebar');
    click(link(mock, 'Play'));
    expect(section(mock, 'Play')?.dataset.open).toBeUndefined();
  });

  it('collapses to its icons with the toggle, which a rail can’t be', () => {
    const mock = mockIn('sidebar');
    const toggle = queryOne(mock, '.menu-toggle', HTMLButtonElement);
    click(toggle);
    expect(mock.dataset.folded).toBe('');
    expect(mock.dataset.moving).toBe('fold');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(queryOne(mock, '.menu', HTMLElement)?.classList.contains('menu--named')).toBe(true);

    showLayout(mock, 'header');
    expect(mock.dataset.folded).toBeUndefined();
    expect(mock.dataset.moving).toBe('layout');
    showLayout(mock, 'unfolded');
    expect(mock.dataset.folded).toBe('');

    click(toggle);
    expect(mock.dataset.folded).toBeUndefined();
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
  });
});
