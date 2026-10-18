import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { syncForumLabels } from './forum.ts';
// The forum index as the original left it.
import legacy from './fixtures/legacy-forum.json' with { type: 'json' };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('forum labels', () => {
  it('labels each count with its column, as the original did', () => {
    document.body.innerHTML = legacy.html;
    syncForumLabels();
    expect(document.querySelector('main')?.innerHTML).toBe(legacy.after);
  });

  it('labels a table once', () => {
    document.body.innerHTML = legacy.html;
    syncForumLabels();
    const cell = queryOne(document, 'td.right', HTMLElement);
    if (!cell) throw new Error('no count cell');
    delete cell.dataset.lnExtLabel;
    syncForumLabels();
    expect(cell.dataset.lnExtLabel).toBeUndefined();
  });
});
