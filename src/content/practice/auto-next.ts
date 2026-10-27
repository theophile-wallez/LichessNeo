import { queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// What a drill's "Load next exercise immediately" does, under its label
// (styles/practice-run/drill.css): Lichess's label holds its switch and its
// text, so the line is the stylesheet's, read from an attribute.

function sync(hint: string): void {
  const toggle = queryOne(
    document,
    'main.analyse .analyse__underboard > .cmn-toggle-wrap',
    HTMLLabelElement,
  );
  if (toggle) setData(toggle, 'lnExtHint', hint);
}

export const practiceAutoNext: Feature = {
  name: 'practice auto next',
  start: () => {
    const hint = message('practiceAutoNextHint');
    onEveryTick('practice auto next', () => sync(hint));
  },
};
