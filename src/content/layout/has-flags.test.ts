import { afterEach, describe, expect, it, vi } from 'vitest';
import { restoreReadyState, setReadyState } from '#shared/testing/ready-state.ts';
import { hasFlags, presentFlags, syncHasFlags } from './has-flags.ts';
// The words the original script wrote for the same pages.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const root = document.documentElement;

afterEach(restoreReadyState);

describe('presentFlags', () => {
  it.each(legacy.has)('reads $page as the original did', ({ page, has }) => {
    document.body.innerHTML = page;
    expect(presentFlags(document)).toBe(has);
    syncHasFlags();
    expect(root.dataset['lnExtHas']).toBe(has);
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
    ['tour', '<main class="tour"><aside class="tour__side"></aside></main>'],
    ['simul', '<main class="simul"><aside class="simul__side"></aside></main>'],
    ['board-editor', '<main><div class="board-editor"><div class="main-board"></div></div></main>'],
    [
      'account',
      '<main class="account page-menu"><div class="page-menu__content box"></div></main>',
    ],
    ['analyse-captured', '<main class="analyse"><div class="ln-ext-captured"></div></main>'],
    [
      'analyse-game',
      '<main class="analyse"><div class="game__meta"><div class="game__meta__players"></div></div></main>',
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

  it('leaves out the captured pieces in a broadcast’s bars, which have their own room', () => {
    document.body.innerHTML =
      '<main class="analyse is-relay"><div class="relay-board-player"><div class="ln-ext-captured"></div></div></main>';
    expect(presentFlags(document).split(' ')).not.toContain('analyse-captured');
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
    expect(root.dataset['lnExtHas']).toBe('round');

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
    expect(root.dataset['lnExtHas']).toBe('round');
    for (const frame of frames.splice(0)) frame(0);
    expect(root.dataset['lnExtHas']).toBe('round pocket');
  });

  // Last: `start` leaves its observer on the document, which would schedule a frame of its
  // own in the test above.
  it('flags the page as it parses, without waiting for a frame', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    setReadyState('loading');
    document.body.innerHTML = '';
    hasFlags.start();
    expect(root.dataset['lnExtHas']).toBe('');

    // The parser hands the page over in chunks, each a mutation. A frame later would be a
    // frame of the page laid out without its flags, the board at the wrong size in it.
    document.body.innerHTML = '<main class="analyse"></main>';
    await Promise.resolve();
    expect(root.dataset['lnExtHas']).toBe('analyse');
    document
      .querySelector('main')
      ?.append(Object.assign(document.createElement('div'), { className: 'game__meta__players' }));
    await Promise.resolve();
    expect(root.dataset['lnExtHas']).toBe('analyse analyse-game');
    expect(frames).toHaveLength(0);
  });
});
