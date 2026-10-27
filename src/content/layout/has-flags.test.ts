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
    [
      'round-end-card',
      '<main class="round"><div class="rcontrols"><div class="ln-ext-end__card"></div></div></main>',
    ],
    ['round-clockless', '<main class="round"><div class="rclock rclock-turn"></div></main>'],
    ['round-swap-clock', '<main class="round"><div class="round__app swap-clock"></div></main>'],
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
    ['inbox', '<main class="box msg-app pane-side"><div class="msg-app__side"></div></main>'],
  ])('reads %s', (flag, page) => {
    document.body.innerHTML = page;
    expect(presentFlags(document).split(' ')).toContain(flag);
  });

  it('leaves out the clocks’ absence in a timed game', () => {
    document.body.innerHTML =
      '<main class="round"><div class="rclock rclock-top"></div><div class="rclock rclock-bottom"></div></main>';
    expect(presentFlags(document).split(' ')).not.toContain('round-clockless');
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

  it('reads a broadcast picker’s mask only while it points at an open menu', () => {
    document.body.innerHTML = '<label class="fullscreen-mask mselect__fullscreen-mask"></label>';
    expect(presentFlags(document)).toBe('');
    document.querySelector('label')?.setAttribute('for', 'mselect-round');
    expect(presentFlags(document)).toBe('menu-mask');
  });

  it('leaves out an empty advice summary', () => {
    document.body.innerHTML =
      '<main class="analyse"><div class="analyse__round-training"></div></main>';
    expect(presentFlags(document)).toBe('analyse');
  });
});

describe('syncHasFlags', () => {
  it('has chessground measure the board again when the layout changes, and only then', () => {
    document.body.innerHTML = '<main class="analyse"></main>';
    syncHasFlags();
    const scrolls = vi.fn<() => void>();
    document.addEventListener('scroll', scrolls);
    syncHasFlags();
    expect(scrolls).not.toHaveBeenCalled();

    // The captured pieces' bars come in over a phone's board, moving it down.
    document
      .querySelector('main')
      ?.append(Object.assign(document.createElement('div'), { className: 'ln-ext-captured' }));
    syncHasFlags();
    document.removeEventListener('scroll', scrolls);
    expect(scrolls).toHaveBeenCalledOnce();
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

    // A picker's mask stays in the page, open or closed: only its `for` says which.
    document.body.append(
      Object.assign(document.createElement('label'), { className: 'mselect__fullscreen-mask' }),
    );
    await Promise.resolve();
    for (const frame of frames.splice(0)) frame(0);
    document.querySelector('label')?.setAttribute('for', 'mselect-round');
    await Promise.resolve();
    expect(frames).toHaveLength(1);
    for (const frame of frames.splice(0)) frame(0);
    expect(root.dataset['lnExtHas']).toBe('round pocket menu-mask');
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
