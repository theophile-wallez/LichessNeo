import { describe, expect, it, vi } from 'vitest';
import { hasFlags, presentFlags, syncHasFlags } from './has-flags.ts';
// The words the original script wrote for the same pages.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const root = document.documentElement;

describe('presentFlags', () => {
  it.each(legacy.has)('reads $page as the original did', ({ page, has }) => {
    document.body.innerHTML = page;
    expect(presentFlags(document)).toBe(has);
    syncHasFlags();
    expect(root.dataset['lrExtHas']).toBe(has);
  });
});

describe('presentFlags, for flags the original lacked', () => {
  it.each([
    [
      'round-voice',
      '<main class="round"><div class="round__app"><div id="voice-bar"></div></div></main>',
    ],
    [
      'round-crosstable',
      '<main class="round"><div class="round__underboard"><div class="crosstable"></div></div></main>',
    ],
    ['board-editor', '<main><div class="board-editor"><div class="main-board"></div></div></main>'],
    [
      'account',
      '<main class="account page-menu"><div class="page-menu__content box"></div></main>',
    ],
    [
      'analyse-training',
      '<main class="analyse"><div class="analyse__round-training"><div class="analyse__acpl"></div></div></main>',
    ],
  ])('reads %s', (flag, page) => {
    document.body.innerHTML = page;
    expect(presentFlags(document).split(' ')).toContain(flag);
  });

  it('leaves the DGT board’s pages out of the account’s', () => {
    document.body.innerHTML = '<main class="account page-menu dgt"></main>';
    expect(presentFlags(document).split(' ')).not.toContain('account');
  });

  it('leaves out an empty advice summary', () => {
    document.body.innerHTML =
      '<main class="analyse"><div class="analyse__round-training"></div></main>';
    expect(presentFlags(document)).toBe('analyse');
  });
});

describe('hasFlags', () => {
  it('follows the page before the next frame, but not the board or the clock', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    document.body.innerHTML =
      '<main class="round"><div class="cg-wrap"><cg-container></cg-container></div><div class="rclock"><div class="time"></div></div></main>';
    hasFlags.start();
    expect(root.dataset['lrExtHas']).toBe('round');

    document.querySelector('cg-container')?.append(document.createElement('piece'));
    document.querySelector('.time')?.classList.add('hurry');
    await Promise.resolve();
    expect(frames).toHaveLength(0);

    document
      .querySelector('main')
      ?.append(Object.assign(document.createElement('div'), { className: 'pocket' }));
    document.querySelector('main')?.classList.add('tv-single');
    await Promise.resolve();
    expect(frames).toHaveLength(1);
    expect(root.dataset['lrExtHas']).toBe('round');
    for (const frame of frames.splice(0)) frame(0);
    expect(root.dataset['lrExtHas']).toBe('round pocket');
  });
});
