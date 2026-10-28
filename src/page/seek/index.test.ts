import { beforeAll, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { nextGameSeek } from './index.ts';

// The seek listens on the document for the whole page: this file has its
// window to itself. Its socket is a stand-in that never opens.

const opened: string[] = [];

class FakeSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  readonly readyState = FakeSocket.CONNECTING;

  constructor(url: string) {
    super();
    opened.push(url);
  }

  send(): void {}

  close(): void {}
}

beforeAll(() => {
  document.body.dataset.socketDomains = 'socket.lichess.test';
  // The review's tabs, with a new game like the one reviewed beside them.
  document.body.innerHTML = `<div id="ln-ext-review-modes"><div class="ln-ext-review-modes__actions"><a class="ln-ext-review__new ln-ext-new-game" href="/?hook_like=abcdefgh">New 3+0</a></div></div>`;
  nextGameSeek.start();
});

it('seeks the review’s new game right there, rather than following its link home', () => {
  // Stubs are undone before each test (vitest.config.ts).
  vi.stubGlobal('WebSocket', FakeSocket);
  const link = queryOne(document, '.ln-ext-new-game', HTMLAnchorElement);
  const click = new MouseEvent('click', { bubbles: true, cancelable: true });
  link?.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(opened).toHaveLength(1);
  expect(opened[0]).toMatch(/^wss:\/\/socket\.lichess\.test\/lobby\/socket\/v5\?sri=/);
  expect(link?.dataset.lnExtSeek).toBe('connecting');
});
