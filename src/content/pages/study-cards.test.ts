import { afterEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { readStudyLine, studyHue, syncStudyCards, userOfName } from './study-cards.ts';

// A card as Lichess serves it on /study/by/thibault.
const CARD = `<div class="study-index"><div class="studies"><div class="study paginated">
  <a class="overlay" href="/study/1UmQwWtW" title="position bookmarks"></a>
  <div class="top"><div class="study__icon"><icon data-icon=""></icon></div><div>
    <h2 class="study-name">position bookmarks</h2>
    <span><icon data-icon=""></icon> 1279 • FM thibault • <time class="set" datetime="2026-02-03T08:30:17.212Z">8 months ago</time></span>
  </div></div>
  <div class="body">
    <ol class="chapters"><li class="text" data-icon="">Chapter 1</li></ol>
    <ol class="members"><li class="text" data-icon="">FM thibault</li><li class="text" data-icon="">lichess</li></ol>
  </div>
</div></div></div>`;

const card = (): HTMLElement => {
  const element = queryOne(document, '.study', HTMLElement);
  if (!element) throw new Error('no card');
  return element;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe("a study card's line", () => {
  it('reads the likes and the owner', () => {
    expect(readStudyLine(' 279 • aRjuN_rOy • 5 days ago')).toEqual({
      likes: 279,
      owner: 'aRjuN_rOy',
    });
  });

  it('gives up on a line it cannot read, so Lichess’s stays', () => {
    expect(readStudyLine('aRjuN_rOy • 5 days ago')).toBeNull();
    expect(readStudyLine(' 279 • ')).toBeNull();
  });
});

describe("a study's hue", () => {
  it('is the same for the same study, and varies from one to the next', () => {
    expect(studyHue('1UmQwWtW')).toBe(studyHue('1UmQwWtW'));
    const ids = ['1UmQwWtW', '8rTFQ9UE', 'aBcDeFgH', 'Zx81kqLm', 'p0o9i8u7', 'QQQQwwww'];
    const hues = new Set(ids.map(id => studyHue(id)));
    expect(hues.size).toBeGreaterThan(1);
    for (const hue of hues) {
      expect(['accent', 'cyan', 'green', 'orange', 'pink', 'purple']).toContain(hue);
    }
  });
});

describe('a name’s user', () => {
  it('skips a title', () => {
    expect(userOfName('FM NaSil')).toBe('NaSil');
    expect(userOfName(' thibault ')).toBe('thibault');
  });
});

describe('study cards', () => {
  it('adds the owner, the likes, the members and the date', () => {
    document.body.innerHTML = CARD;
    syncStudyCards();
    expect(card().dataset.lnExtStudy).toBe('card');
    expect(card().style.getPropertyValue('--ln-ext-study-hue')).toBe(
      `var(--ln-ext-${studyHue('1UmQwWtW')})`,
    );
    const owner = queryOne(card(), 'a.ln-ext-study__owner', HTMLAnchorElement);
    expect(owner?.getAttribute('href')).toBe('/@/thibault');
    expect(owner?.textContent).toBe('FM thibault');
    expect(queryOne(card(), '.ln-ext-study__likes', HTMLElement)?.textContent).toMatch(/1.279/);
    const members = queryAll(card(), '.ln-ext-study__members > a', HTMLAnchorElement);
    expect(members.map(member => member.getAttribute('href'))).toEqual([
      '/@/thibault',
      '/@/lichess',
    ]);
    const time = queryOne(card(), '.ln-ext-study__foot > time.timeago', HTMLTimeElement);
    expect(time?.dateTime).toBe('2026-02-03T08:30:17.212Z');
  });

  it('redraws a card once', () => {
    document.body.innerHTML = CARD;
    syncStudyCards();
    syncStudyCards();
    expect(queryAll(card(), '.ln-ext-study__by', HTMLElement)).toHaveLength(1);
    expect(queryAll(card(), '.ln-ext-study__likes', HTMLElement)).toHaveLength(1);
  });

  it('leaves a card it cannot read as Lichess drew it', () => {
    document.body.innerHTML = CARD.replace('1279 • ', '');
    syncStudyCards();
    expect(card().dataset.lnExtStudy).toBe('plain');
    expect(queryOne(card(), '.ln-ext-study__by', HTMLElement)).toBeNull();
  });

  it('leaves the list view’s rows alone', () => {
    document.body.innerHTML = CARD.replace('study paginated', 'study paginated compact');
    syncStudyCards();
    expect(card().dataset.lnExtStudy).toBeUndefined();
  });
});
