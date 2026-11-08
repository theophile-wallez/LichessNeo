import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the markdown editor’s tab bar', () => {
  it('keeps the upload button as tall as the pills, so hiding it under Preview moves nothing', () => {
    const style = document.createElement('style');
    // Lichess's own height for the button, which the bar took when it showed.
    style.textContent = `.button-empty { height: 40px; } ${readFileSync(join(import.meta.dirname, 'reply.css'), 'utf8')}`;
    document.head.append(style);
    document.body.innerHTML =
      '<main class="forum-topic"><div class="markdown-editor"><div class="header">' +
      '<button class="header-tab write-tab active">Write</button>' +
      '<button class="header-tab preview-tab">Preview</button>' +
      '<button class="button-empty"><span class="upload-image"></span></button>' +
      '</div></div></main>';
    const tab = queryOne(document, '.header-tab', HTMLElement);
    const upload = queryOne(document, '.button-empty', HTMLElement);
    if (!tab || !upload) throw new Error('no tab bar');
    expect(getComputedStyle(upload).height).toBe(getComputedStyle(tab).height);
  });
});
