import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { fakeLayout, rectAt } from '#shared/testing/layout.ts';
import { leavesPage, tabOffset } from './tab-bars.ts';
import { createTabBars } from './tabs.ts';
// Where the original put a chat bar's highlight, step by step.
import legacy from './fixtures/legacy-tabs.json' with { type: 'json' };

interface BoxInput {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/** Gives an element a fixed layout, which happy-dom doesn't compute. */
function layOut(
  element: Element,
  box: () => BoxInput,
  extra: Record<string, () => number> = {},
): void {
  element.getBoundingClientRect = () => rectAt(box());
  const sizes: Record<string, () => number> = { offsetWidth: () => box().width, ...extra };
  for (const [name, read] of Object.entries(sizes))
    Object.defineProperty(element, name, { get: read, configurable: true });
}

function readBar(bar: HTMLElement, step: string): Record<string, string | null> {
  const variable = (name: string): string | null => bar.style.getPropertyValue(name) || null;
  return {
    step,
    tabs: bar.dataset.lrExtTabs ?? null,
    still: bar.dataset.lrExtTabsStill ?? null,
    x: variable('--lr-ext-tab-x'),
    y: variable('--lr-ext-tab-y'),
    w: variable('--lr-ext-tab-w'),
    h: variable('--lr-ext-tab-h'),
  };
}

const elements = (selector: string): HTMLElement[] => queryAll(document, selector, HTMLElement);

/** Lets the observers' callbacks run, then the frame they queue a placement for. */
async function nextFrame(): Promise<void> {
  await Promise.resolve();
  await new Promise(resolve => requestAnimationFrame(resolve));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('sliding tabs', () => {
  it('places the highlight as the original did, step by step', async () => {
    // The sizes come from layOut; this only lets a test call the ResizeObservers.
    const layout = fakeLayout(() => 0);
    document.body.innerHTML =
      '<div class="mchat"><div class="mchat__tabs"><div class="mchat__tab">Chat</div><div class="mchat__tab mchat__tab-active">Notes</div><span class="other">x</span></div></div>';
    const [bar] = elements('.mchat__tabs');
    const [chat, notes] = elements('.mchat__tab');
    if (!bar || !chat || !notes) throw new Error('no bar');
    let frame = { clientLeft: 1, clientTop: 1, scrollLeft: 0, scrollTop: 0 };
    const boxes = new Map([
      [chat, { top: 55, left: 105, width: 80, height: 30 }],
      [notes, { top: 55, left: 190.5, width: 95.25, height: 30 }],
    ]);
    layOut(bar, () => ({ top: 50, left: 100, width: 300, height: 40 }), {
      clientLeft: () => frame.clientLeft,
      clientTop: () => frame.clientTop,
      scrollLeft: () => frame.scrollLeft,
      scrollTop: () => frame.scrollTop,
    });
    for (const tab of [chat, notes])
      layOut(tab, () => boxes.get(tab) ?? { top: 0, left: 0, width: 0, height: 0 });
    const pick = (tab: HTMLElement | null): void => {
      for (const other of [chat, notes]) other.classList.toggle('mchat__tab-active', other === tab);
    };
    // Each change, then what the browser tells the bar about it.
    const changes: Record<string, () => void> = {
      'first placement': () => {},
      'another tab picked': () => pick(chat),
      'the same tab resized': () => {
        boxes.set(chat, { top: 55, left: 105, width: 90, height: 30 });
        layout.resize();
      },
      'the bar scrolled': () => {
        frame = { clientLeft: 2, clientTop: 0, scrollLeft: 40, scrollTop: 3 };
        bar.dispatchEvent(new Event('scroll'));
      },
      'nothing moved': () => {},
      'the picked tab is hidden': () => {
        boxes.set(notes, { top: 55, left: 200, width: 0, height: 30 });
        pick(notes);
      },
      'no active tab': () => pick(null),
    };
    const bars = createTabBars();
    const steps = [];
    for (const { step } of legacy.steps) {
      changes[step]?.();
      bars.sync();
      await nextFrame();
      steps.push(readBar(bar, step));
    }
    expect(steps).toEqual(legacy.steps);
  });

  it('keeps a followed link picked until the next page, unless it comes back from the cache', async () => {
    document.body.innerHTML =
      '<div class="auth"><div class="auth-tabs"><a class="active" href="#in">Sign in</a><a href="#up">Sign up</a></div></div>';
    const [bar] = elements('.auth-tabs');
    const [signIn, signUp] = elements('.auth-tabs > a');
    if (!bar || !signIn || !signUp) throw new Error('no bar');
    layOut(bar, () => ({ top: 0, left: 0, width: 200, height: 40 }));
    layOut(signIn, () => ({ top: 0, left: 0, width: 100, height: 40 }));
    layOut(signUp, () => ({ top: 0, left: 100, width: 100, height: 40 }));
    const bars = createTabBars();
    bars.sync();
    expect(bar.style.getPropertyValue('--lr-ext-tab-x')).toBe('0px');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(click, 'target', { value: signUp });
    bars.onClick(click);
    await nextFrame();
    expect(bar.style.getPropertyValue('--lr-ext-tab-x')).toBe('100px');
    expect(bar.dataset.lrExtTabsStill).toBeUndefined();
    const back = new PageTransitionEvent('pageshow');
    Object.defineProperty(back, 'persisted', { value: true });
    bars.onPageShow(back);
    await nextFrame();
    expect(bar.style.getPropertyValue('--lr-ext-tab-x')).toBe('0px');
  });

  it('forgets a bar Lichess removed, and starts afresh if it comes back', () => {
    document.body.innerHTML =
      '<div class="mchat__tabs"><div class="mchat__tab mchat__tab-active"></div><div class="mchat__tab"></div></div>';
    const [bar] = elements('.mchat__tabs');
    const [first, second] = elements('.mchat__tab');
    if (!bar || !first || !second) throw new Error('no bar');
    layOut(bar, () => ({ top: 0, left: 0, width: 200, height: 40 }));
    layOut(first, () => ({ top: 0, left: 0, width: 100, height: 40 }));
    layOut(second, () => ({ top: 0, left: 100, width: 100, height: 40 }));
    const bars = createTabBars();
    bars.sync();
    bar.remove();
    bars.sync();
    first.classList.remove('mchat__tab-active');
    second.classList.add('mchat__tab-active');
    document.body.append(bar);
    bars.sync();
    // A first placement: nothing to slide from.
    expect(bar.dataset.lrExtTabsStill).toBe('');
    expect(bar.style.getPropertyValue('--lr-ext-tab-x')).toBe('100px');
  });

  it('slides to the tab an opening’s panels mark selected', async () => {
    document.body.innerHTML =
      '<main class="opening"><div class="opening__panels"><div class="tab-list" role="tablist">' +
      '<span class="tab-list__tab" role="tab" aria-selected="true">Games</span>' +
      '<span class="tab-list__tab" role="tab" aria-selected="false">Moves</span></div></div></main>';
    const [bar] = elements('.tab-list');
    const [games, moves] = elements('.tab-list__tab');
    if (!bar || !games || !moves) throw new Error('no bar');
    layOut(bar, () => ({ top: 0, left: 0, width: 200, height: 40 }));
    layOut(games, () => ({ top: 0, left: 0, width: 100, height: 40 }));
    layOut(moves, () => ({ top: 0, left: 100, width: 100, height: 40 }));
    createTabBars().sync();
    expect(bar.style.getPropertyValue('--lr-ext-tab-x')).toBe('0px');
    games.setAttribute('aria-selected', 'false');
    moves.setAttribute('aria-selected', 'true');
    await nextFrame();
    expect(bar.style.getPropertyValue('--lr-ext-tab-x')).toBe('100px');
  });

  it('slides to the option a theme’s setting picks in the user menu', async () => {
    document.body.innerHTML =
      '<div id="dasher_app"><div class="lr-ext-src-options">' +
      '<button class="active">Short</button><button>Wide</button></div></div>';
    const [bar] = elements('.lr-ext-src-options');
    const [short, wide] = elements('.lr-ext-src-options > button');
    if (!bar || !short || !wide) throw new Error('no bar');
    layOut(bar, () => ({ top: 0, left: 0, width: 160, height: 30 }));
    layOut(short, () => ({ top: 0, left: 0, width: 80, height: 30 }));
    layOut(wide, () => ({ top: 0, left: 80, width: 80, height: 30 }));
    createTabBars().sync();
    expect(bar.style.getPropertyValue('--lr-ext-tab-x')).toBe('0px');
    short.classList.remove('active');
    wide.classList.add('active');
    await nextFrame();
    expect(bar.style.getPropertyValue('--lr-ext-tab-x')).toBe('80px');
  });
});

describe('tab geometry', () => {
  it('measures a tab within the bar’s padding box, scrolled content included', () => {
    const frame = { clientLeft: 2, clientTop: 1, scrollLeft: 30, scrollTop: 0 };
    const bar = rectAt({ top: 10, left: 10, width: 300, height: 40 });
    const tab = rectAt({ top: 12, left: 50, width: 60, height: 36 });
    expect(tabOffset(bar, tab, frame)).toEqual([68, 1, 60, 36]);
  });

  it('only counts a plain click on a link as leaving the page', () => {
    const link = document.createElement('a');
    link.href = '/next';
    const plain = new MouseEvent('click', { button: 0 });
    expect(leavesPage(plain, link)).toBe(true);
    expect(leavesPage(new MouseEvent('click', { button: 0, ctrlKey: true }), link)).toBe(false);
    expect(leavesPage(new MouseEvent('click', { button: 1 }), link)).toBe(false);
    expect(leavesPage(plain, document.createElement('button'))).toBe(false);
    link.target = '_blank';
    expect(leavesPage(plain, link)).toBe(false);
  });
});
