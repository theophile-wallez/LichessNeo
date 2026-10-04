import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { avatarOf } from '#shared/avatar.ts';
import { queryOne } from '#shared/dom.ts';
import { rectAt } from '#shared/testing/layout.ts';
import { fitCard } from './card-fit.ts';
import { ratingText } from './card-ratings.ts';
import { cleanRatings, createPowertipSync, fitPowertip, powertip } from './powertip.ts';
// The ratings as the original cleaned them, and where it moved the card.
import legacy from './fixtures/legacy-powertip.json' with { type: 'json' };

beforeAll(() => powertip.start());

afterEach(() => {
  document.body.innerHTML = '';
});

describe('hover card ratings', () => {
  it('drops the padding and dims the unrated, as the original did', () => {
    const card = document.createElement('div');
    card.innerHTML = legacy.ratings;
    cleanRatings(card);
    expect(card.innerHTML).toBe(legacy.cleaned);
  });

  it('cleans each card Lichess puts in, before it shows', async () => {
    const card = document.createElement('div');
    card.id = 'powerTip';
    document.body.append(card);
    vi.stubGlobal('getComputedStyle', () => ({ visibility: 'hidden' }));
    createPowertipSync()();
    card.innerHTML = legacy.ratings;
    await Promise.resolve();
    expect(card.innerHTML).toBe(legacy.cleaned);
  });

  it('gives each new card its user’s avatar before it shows', async () => {
    const card = document.createElement('div');
    card.id = 'powerTip';
    document.body.append(card);
    vi.stubGlobal('getComputedStyle', () => ({ visibility: 'hidden' }));
    createPowertipSync()();
    card.innerHTML =
      '<div class="upt__info"><div class="upt__info__top"><a class="user-link" href="/@/Hikaru">Hikaru</a></div></div>';
    await Promise.resolve();
    expect(queryOne(card, '.upt__info', HTMLElement)?.dataset.cdcAvatarCoach).toBe(
      String(avatarOf('Hikaru').coach),
    );
  });

  it('reads a padded rating', () => {
    expect(ratingText('   ?')).toBe('?');
  });
});

describe('hover card fit', () => {
  it.each(legacy.fits)('moves it as the original did: $name, from $start.top', scenario => {
    vi.stubGlobal('innerWidth', legacy.viewport.width);
    vi.stubGlobal('innerHeight', legacy.viewport.height);
    vi.stubGlobal('getComputedStyle', () => ({ visibility: scenario.visibility }));
    const anchor = document.createElement('a');
    anchor.href = '/@/someone';
    document.body.append(anchor);
    anchor.getBoundingClientRect = () => rectAt(scenario.anchor ?? { top: 0, left: 0 });
    anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    if (!scenario.anchor) anchor.remove();
    const card = document.createElement('div');
    document.body.append(card);
    card.style.top = scenario.start.top;
    card.style.left = scenario.start.left;
    card.getBoundingClientRect = () => rectAt(scenario.box);
    fitPowertip(card);
    expect(card.style.top).toBe(scenario.top);
    expect(card.style.left).toBe(scenario.left);
  });

  it('writes nothing when a card taller than the window is already at the top', () => {
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
    const card = document.createElement('div');
    document.body.append(card);
    card.style.top = '8px';
    card.style.left = '100px';
    card.getBoundingClientRect = () => rectAt({ top: 8, left: 100, width: 300, height: 900 });
    const observer = new MutationObserver(() => {});
    observer.observe(card, { attributes: true });
    fitPowertip(card);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it('prefers below the name, then above', () => {
    const viewport = { width: 1000, height: 800 };
    const card = rectAt({ top: 700, left: 100, width: 300, height: 200 });
    const name = rectAt({ top: 100, left: 150, width: 100, height: 20 });
    expect(fitCard(card, name, viewport)).toEqual({ top: 130, left: 100 });
    expect(
      fitCard(rectAt({ top: 10, left: 10, width: 10, height: 10 }), name, viewport),
    ).toBeNull();
  });
});
