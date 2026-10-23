import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { html, setHtml, trustedHtml, type SafeHtml } from '#shared/html.ts';
import { readAreas } from './areas-read.ts';
import { areasMarkup } from './areas-view.ts';
import { DASHBOARD } from './fixtures/dashboard.ts';

// Each message as its name, then what fills it in.
const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

// A theme's block as Lichess serves it on the improvement areas and strengths.
function lichessTheme(href: string, description: string, replay: string | null): SafeHtml {
  return html`<div class="puzzle-dashboard__theme">
    <div class="puzzle-dashboard__theme__meta">
      <h3 class="puzzle-dashboard__theme__name"><a href="${href}">Name</a></h3>
      <p class="puzzle-dashboard__theme__description"> ${description} </p>
    </div>
    <div class="puzzle-dashboard__metrics">
      <div class="puzzle-dashboard__metric puzzle-dashboard__metric--played"><strong>4</strong> played</div>
      ${
        replay !== null &&
        html`<a class="puzzle-dashboard__metric puzzle-dashboard__metric--fix" href="${replay}">
          <span class="puzzle-dashboard__metric--fix__text"><strong>3</strong> to replay</span>
        </a>`
      }
    </div>
  </div>`;
}

function page(...themes: SafeHtml[]): HTMLElement {
  setHtml(
    document.body,
    html`<main><div class="page-menu__content puzzle-dashboard">
      <div class="box__top"><h1>Improvement areas</h1></div>
      ${themes}
    </div></main>`,
  );
  const box = queryOne(document, '.puzzle-dashboard', HTMLElement);
  if (!box) throw new Error('no dashboard');
  return box;
}

const text = (root: ParentNode, selector: string): string =>
  queryOne(root, selector, HTMLElement)?.textContent.replace(/\s+/g, ' ').trim() ?? '';

describe('the themes’ list', () => {
  it('keeps the page’s order, with each theme’s description and replay link', () => {
    const box = page(
      lichessTheme('/training/sacrifice', 'Give up material.', '/training/replay/30/sacrifice'),
      lichessTheme('/fr/training/fork?x=1', 'Two at once.', null),
    );
    const areas = readAreas(box, DASHBOARD);
    expect(areas.map(area => area.result.key)).toEqual(['sacrifice', 'fork']);
    expect(areas[0]).toMatchObject({
      description: 'Give up material.',
      replayHref: '/training/replay/30/sacrifice',
    });
    expect(areas[0]?.result).toMatchObject({ level: 2164, gap: -300, replays: 3 });
    expect(areas[1]?.replayHref).toBeNull();
  });

  it('leaves out a theme the API doesn’t know', () => {
    const box = page(lichessTheme('/training/zugzwang', 'Forced.', null));
    expect(readAreas(box, DASHBOARD)).toEqual([]);
  });
});

function drawn(kind: 'weak' | 'strong', ...themes: SafeHtml[]): HTMLElement {
  const areas = readAreas(page(...themes), DASHBOARD);
  setHtml(document.body, areasMarkup(areas, kind, 3));
  return document.body;
}

const SACRIFICE = lichessTheme('/training/sacrifice', 'Give up.', '/training/replay/30/sacrifice');
const FORK = lichessTheme('/training/fork', 'Two at once.', '/training/replay/30/fork');
const ENDGAME = lichessTheme('/training/endgame', 'The end.', null);

describe('the areas’ page', () => {
  it('puts the first theme in its own card, with the mascot, its numbers and its links', () => {
    const body = drawn('weak', SACRIFICE, FORK);
    const hero = queryOne(body, '.ln-ext-pdash__hero', HTMLElement);
    if (!hero) throw new Error('no card');
    expect(text(hero, 'small')).toBe('pdashStartHere');
    expect(text(hero, 'h2')).toBe('Sacrifice');
    expect(text(hero, 'p')).toBe('Give up.');
    expect(queryOne(hero, '.ln-ext-pdash__mascot', HTMLElement)?.dataset.lnExtAvatarCoach).toBe(
      '3',
    );
    expect(
      queryOne(hero, '.ln-ext-pdash__ring', HTMLElement)?.style.getPropertyValue(
        '--ln-ext-pdash-p',
      ),
    ).toBe('0.250');
    expect(text(hero, '.ln-ext-pdash__fact b')).toBe('1,864 −300');
    expect(queryOne(hero, '.ln-ext-pdash__train', HTMLAnchorElement)?.getAttribute('href')).toBe(
      '/training/sacrifice',
    );
    expect(text(hero, '.ln-ext-pdash__again')).toBe('pdashReplayCount:3');
  });

  it('leaves the mascot out of the first theme’s card with no coach', () => {
    setHtml(document.body, areasMarkup(readAreas(page(SACRIFICE), DASHBOARD), 'weak', null));
    const hero = queryOne(document.body, '.ln-ext-pdash__hero', HTMLElement);
    expect(hero && text(hero, 'h2')).toBe('Sacrifice');
    expect(queryOne(document.body, '.ln-ext-pdash__mascot', HTMLElement)).toBeNull();
  });

  it('lists the others under it, each with its gap, its level and its links', () => {
    const body = drawn('weak', SACRIFICE, FORK, ENDGAME);
    const rows = queryAll(body, '.ln-ext-pdash__area', HTMLElement);
    expect(text(body, '.ln-ext-pdash__list h2')).toBe('pdashThenThese');
    expect(rows.map(row => text(row, '.ln-ext-pdash__theme b'))).toEqual(['Fork', 'Endgame']);
    expect(text(rows[0] ?? body, '.ln-ext-pdash__theme small')).toBe('±0 pdashAgainst:2,089');
    expect(text(rows[0] ?? body, '.ln-ext-pdash__again')).toBe('3');
    expect(text(rows[0] ?? body, '.ln-ext-pdash__go')).toBe('pdashTrain');
    // Without Lichess's link, no replay.
    expect(queryOne(rows[1] ?? body, '.ln-ext-pdash__again', HTMLElement)).toBeNull();
  });

  it('words the strengths as strengths', () => {
    const body = drawn('strong', SACRIFICE, FORK);
    expect(text(body, '.ln-ext-pdash__hero small')).toBe('pdashBestWeapon');
    expect(text(body, '.ln-ext-pdash__train')).toBe('pdashKeepSharp');
    expect(text(body, '.ln-ext-pdash__list h2')).toBe('pdashAlsoStrong');
    expect(text(body, '.ln-ext-pdash__go')).toBe('pdashKeep');
  });

  it('has no list for a single theme, and nothing at all for none', () => {
    expect(queryOne(drawn('weak', SACRIFICE), '.ln-ext-pdash__list', HTMLElement)).toBeNull();
    expect(drawn('weak').innerHTML.trim()).toBe('');
  });

  it('offers no replay for a theme with nothing to replay', () => {
    const solved = trustedHtml(`<div class="puzzle-dashboard__theme">
      <h3><a href="/training/exposedKing">Exposed king</a></h3>
      <a class="puzzle-dashboard__metric--fix" href="/training/replay/30/exposedKing"></a>
    </div>`);
    expect(queryOne(drawn('strong', solved), '.ln-ext-pdash__again', HTMLElement)).toBeNull();
  });
});
